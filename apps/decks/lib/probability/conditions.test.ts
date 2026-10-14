import type { CardType, Decklist, NarutoCard } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { getArchetype } from "@/lib/data/archetypes";
import { getCard } from "@/lib/data/cards";
import { cardCounts, expandDecklist, typeCounts } from "@/lib/decks/deck-utils";
import { RULES } from "@/lib/rules";
import {
  cardMatchesCondition,
  conditionsAreDisjoint,
  DEFAULT_TABLE_TURNS,
  exactConditionProbability,
  type HandCondition,
  keepableHandOdds,
  probabilityTable,
  resolveConditionGroups,
} from "./conditions";
import { choose, multiGroupProbability, probAtLeastOne } from "./hypergeometric";
import { evaluateConditions } from "./simulate";
import { templateDecklist } from "./test-decks";

const AVENGER = getArchetype("uchiha-avenger")!;
const DECK = templateDecklist(AVENGER);
/** Karin (character, cost 1), Hawk Summon (character, cost 2), Chidori (jutsu, cost 2): 4 copies each. */
const KARIN = "NT02-003";
const HAWK = "NT02-005";
const CHIDORI = "NT02-006";

const groups = (conditions: HandCondition[]) => resolveConditionGroups(DECK, conditions);

describe("resolveConditionGroups", () => {
  it("sizes card, card-set and type conditions against the list", () => {
    const [card, cards, characters, cheap, missing] = groups([
      { kind: "card", cardId: KARIN, min: 1 },
      { kind: "cards", label: "Openers", cardIds: [KARIN, HAWK, HAWK, "NT09-999"], min: 1 },
      { kind: "type", type: "character", min: 1 },
      { kind: "type", type: "character", min: 1, maxCost: 1 },
      { kind: "card", cardId: "NT01-001", min: 1 },
    ]);
    expect(card).toMatchObject({ cardIds: [KARIN], size: 4, min: 1 });
    expect(cards).toMatchObject({ cardIds: [KARIN, HAWK], size: 8 });
    expect(characters.size).toBe(typeCounts(DECK).character);
    const counts = cardCounts(DECK);
    const expectedCheap = [...counts].filter(([id]) => getCard(id)!.type === "character" && getCard(id)!.cost! <= 1);
    expect(cheap.cardIds.sort()).toEqual(expectedCheap.map(([id]) => id).sort());
    expect(cheap.size).toBe(expectedCheap.reduce((sum, [, n]) => sum + n, 0));
    expect(missing).toMatchObject({ cardIds: [], size: 0 });
  });

  it("matches unknown cards by id only", () => {
    expect(cardMatchesCondition("NT09-999", { kind: "card", cardId: "NT09-999", min: 1 })).toBe(true);
    expect(cardMatchesCondition("NT09-999", { kind: "type", type: "character", min: 1 })).toBe(false);
  });
});

describe("conditionsAreDisjoint", () => {
  it("detects cards shared between conditions", () => {
    expect(conditionsAreDisjoint(groups([{ kind: "card", cardId: KARIN, min: 1 }, { kind: "card", cardId: HAWK, min: 1 }]))).toBe(true);
    expect(conditionsAreDisjoint(groups([{ kind: "type", type: "jutsu", min: 1 }, { kind: "type", type: "character", min: 1 }]))).toBe(true);
    expect(conditionsAreDisjoint(groups([{ kind: "type", type: "character", min: 1 }, { kind: "card", cardId: KARIN, min: 1 }]))).toBe(false);
    expect(conditionsAreDisjoint(groups([{ kind: "card", cardId: KARIN, min: 1 }, { kind: "card", cardId: KARIN, min: 2 }]))).toBe(false);
    expect(
      conditionsAreDisjoint(groups([{ kind: "cards", label: "A", cardIds: [KARIN, HAWK], min: 1 }, { kind: "cards", label: "B", cardIds: [HAWK], min: 1 }])),
    ).toBe(false);
  });

  it("only counts overlap among cards that are in the deck", () => {
    expect(conditionsAreDisjoint(groups([{ kind: "type", type: "character", min: 1 }, { kind: "card", cardId: "NT01-001", min: 1 }]))).toBe(true);
    expect(conditionsAreDisjoint(groups([{ kind: "type", type: "character", min: 1, maxCost: 1 }, { kind: "card", cardId: HAWK, min: 1 }]))).toBe(true);
  });
});

describe("exactConditionProbability", () => {
  it("matches the single-card hypergeometric value", () => {
    expect(exactConditionProbability(DECK, [{ kind: "card", cardId: KARIN, min: 1 }], 5)).toBeCloseTo(0.3530395, 6);
  });

  it("matches inclusion–exclusion for two disjoint 4-ofs", () => {
    const pBoth = 1 - (2 * choose(46, 5)) / choose(50, 5) + choose(42, 5) / choose(50, 5);
    const conditions: HandCondition[] = [{ kind: "card", cardId: KARIN, min: 1 }, { kind: "card", cardId: CHIDORI, min: 1 }];
    expect(exactConditionProbability(DECK, conditions, 5)).toBeCloseTo(pBoth, 12);
  });

  it("feeds resolved group sizes to the multi-group engine", () => {
    const conditions: HandCondition[] = [{ kind: "type", type: "jutsu", min: 2 }, { kind: "card", cardId: KARIN, min: 1 }];
    const sizes = groups(conditions).map(({ size, min }) => ({ size, min }));
    expect(exactConditionProbability(DECK, conditions, 8)).toBeCloseTo(multiGroupProbability({ deckSize: 50, draws: 8, groups: sizes }), 12);
  });

  it("agrees with every enumerated hand on a custom pool with cost filters, card sets and unknown cards", () => {
    const card = (id: string, type: CardType, cost: number): NarutoCard => ({ id, name: id, set: "T", number: id, type, rarity: "common", cost });
    const index = new Map([card("A", "character", 1), card("B", "jutsu", 3), card("C", "character", 4)].map((c) => [c.id, c]));
    const deck: Decklist = {
      leaderId: "L",
      cards: [{ cardId: "A", quantity: 3 }, { cardId: "B", quantity: 2 }, { cardId: "C", quantity: 4 }, { cardId: "D", quantity: 2 }],
    };
    const conditions: HandCondition[] = [
      { kind: "type", type: "character", min: 2, maxCost: 1 },
      { kind: "cards", label: "Tech", cardIds: ["B", "D"], min: 1 },
    ];
    const library = expandDecklist(deck);
    const hits = Array<number>(library.length + 1).fill(0);
    const totals = Array<number>(library.length + 1).fill(0);
    for (let mask = 0; mask < 1 << library.length; mask++) {
      const hand = library.filter((_, i) => mask & (1 << i));
      totals[hand.length]++;
      if (evaluateConditions(hand, conditions, index)) hits[hand.length]++;
    }
    for (let draws = 0; draws <= library.length; draws++) {
      expect(exactConditionProbability(deck, conditions, draws, index)).toBeCloseTo(hits[draws] / totals[draws], 12);
    }
  });

  it("returns null for overlapping conditions and caps draws at the deck size", () => {
    expect(exactConditionProbability(DECK, [{ kind: "type", type: "character", min: 1 }, { kind: "card", cardId: KARIN, min: 1 }], 5)).toBeNull();
    expect(exactConditionProbability(DECK, [{ kind: "card", cardId: KARIN, min: 4 }], 60)).toBe(1);
    expect(exactConditionProbability(DECK, [{ kind: "card", cardId: KARIN, min: 0 }], 5)).toBe(1);
    expect(exactConditionProbability(DECK, [{ kind: "card", cardId: "NT01-001", min: 1 }], 5)).toBe(0);
    expect(exactConditionProbability(DECK, [], 5)).toBe(1);
  });
});

describe("probabilityTable", () => {
  const onPlay = probabilityTable(DECK, { onThePlay: true });
  const onDraw = probabilityTable(DECK, { onThePlay: false });

  it("has one row per distinct main-deck card, most likely first then by name", () => {
    expect(onPlay).toHaveLength(cardCounts(DECK).size);
    expect(onPlay.some((row) => row.cardId === DECK.leaderId)).toBe(false);
    for (let i = 1; i < onPlay.length; i++) {
      const [a, b] = [onPlay[i - 1], onPlay[i]];
      expect(a.pOpening > b.pOpening || (a.pOpening === b.pOpening && getCard(a.cardId)!.name.localeCompare(getCard(b.cardId)!.name) < 0)).toBe(true);
    }
    expect(onPlay[0].copies).toBe(RULES.maxCopies);
    expect(onPlay[onPlay.length - 1].copies).toBe(Math.min(...[...cardCounts(DECK).values()]));
  });

  it("computes opening and per-turn odds for the play and the draw", () => {
    const karinPlay = onPlay.find((row) => row.cardId === KARIN)!;
    const karinDraw = onDraw.find((row) => row.cardId === KARIN)!;
    expect(karinPlay.pOpening).toBeCloseTo(0.3530395, 6);
    expect(karinPlay.pByTurn).toHaveLength(DEFAULT_TABLE_TURNS.length);
    expect(karinPlay.pByTurn[0]).toBe(karinPlay.pOpening);
    expect(karinPlay.pByTurn[1]).toBe(karinPlay.pOpening);
    expect(karinDraw.pByTurn[1]).toBeCloseTo(probAtLeastOne(50, 4, 6), 12);
    expect(karinDraw.pByTurn[3]).toBeCloseTo(0.5139818, 6);
    expect(karinPlay.pByTurn[3]).toBeCloseTo(0.4641337, 6);
    for (const row of [...onPlay, ...onDraw]) {
      for (let i = 1; i < row.pByTurn.length; i++) expect(row.pByTurn[i]).toBeGreaterThanOrEqual(row.pByTurn[i - 1]);
    }
  });

  it("accepts custom turns", () => {
    const [row] = probabilityTable(DECK, { onThePlay: false, turns: [10] });
    expect(row.pByTurn).toEqual([probAtLeastOne(50, row.copies, 15)]);
  });
});

describe("keepableHandOdds", () => {
  it("pools the archetype's mulligan targets and applies the free mulligan", () => {
    const copies = AVENGER.mulliganTargets.reduce((sum, id) => sum + (cardCounts(DECK).get(id) ?? 0), 0);
    expect(copies).toBe(12);
    const odds = keepableHandOdds(DECK, AVENGER.mulliganTargets);
    expect(odds.pOpening).toBeCloseTo(1 - choose(38, 5) / choose(50, 5), 12);
    expect(odds.pWithMulligan).toBeCloseTo(1 - (1 - odds.pOpening) ** (1 + RULES.freeMulligans), 12);
  });

  it("ignores duplicate and missing targets", () => {
    expect(keepableHandOdds(DECK, [KARIN, KARIN, "NT09-999"]).pOpening).toBeCloseTo(probAtLeastOne(50, 4, 5), 12);
    expect(keepableHandOdds(DECK, [])).toEqual({ pOpening: 0, pWithMulligan: 0 });
  });
});
