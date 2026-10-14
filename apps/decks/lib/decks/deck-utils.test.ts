import type { Decklist } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { ARCHETYPES, getArchetype } from "@/lib/data/archetypes";
import { getCard } from "@/lib/data/cards";
import { checkDecklistLegality } from "@/lib/decks/legality";
import { templateDecklist } from "@/lib/probability/test-decks";
import { RULES } from "@/lib/rules";
import {
  averageCost,
  cardCounts,
  COST_BUCKETS,
  costCurve,
  DECK_SECTIONS,
  decklistToText,
  decodeDecklist,
  encodeDecklist,
  expandDecklist,
  groupDecklist,
  keyCards,
  typeCounts,
} from "./deck-utils";

const AVENGER = getArchetype("uchiha-avenger")!;
const AVENGER_DECK = templateDecklist(AVENGER);
const ALL_DECKS = ARCHETYPES.map((archetype) => templateDecklist(archetype));

const SMALL: Decklist = {
  leaderId: "NT01-L01",
  cards: [
    { cardId: "NT01-006", quantity: 4 },
    { cardId: "NT01-001", quantity: 2 },
    { cardId: "NT01-005", quantity: 3 },
    { cardId: "NT01-008", quantity: 1 },
  ],
};

const total = (counts: Iterable<number>) => [...counts].reduce((sum, n) => sum + n, 0);

describe("template decks", () => {
  it("builds a legal 50-card list for every archetype", () => {
    for (const decklist of ALL_DECKS) expect(checkDecklistLegality(decklist)).toEqual([]);
  });
});

describe("cardCounts / expandDecklist", () => {
  it("merges duplicate entries", () => {
    const counts = cardCounts({ leaderId: "NT01-L01", cards: [{ cardId: "a", quantity: 2 }, { cardId: "b", quantity: 1 }, { cardId: "a", quantity: 1 }] });
    expect([...counts]).toEqual([["a", 3], ["b", 1]]);
  });

  it("expands the main deck to one id per card, without the Leader or mutation", () => {
    const before = JSON.stringify(AVENGER_DECK);
    const cards = expandDecklist(AVENGER_DECK);
    expect(cards).toHaveLength(RULES.mainDeckSize);
    expect(cards).not.toContain(AVENGER_DECK.leaderId);
    for (const { cardId, quantity } of AVENGER_DECK.cards) expect(cards.filter((id) => id === cardId)).toHaveLength(quantity);
    expect(JSON.stringify(AVENGER_DECK)).toBe(before);
  });
});

describe("groupDecklist", () => {
  it("splits a list into ordered, non-empty sections sorted by cost then name", () => {
    const { leader, sections, unknownCardIds } = groupDecklist(AVENGER_DECK);
    expect(leader?.id).toBe("NT02-L01");
    expect(unknownCardIds).toEqual([]);
    const order = DECK_SECTIONS.map((s) => s.key);
    expect(sections.map((s) => order.indexOf(s.key))).toEqual([...sections.map((s) => order.indexOf(s.key))].sort((a, b) => a - b));
    expect(total(sections.map((s) => s.count))).toBe(RULES.mainDeckSize);
    for (const section of sections) {
      expect(section.entries.length).toBeGreaterThan(0);
      expect(section.count).toBe(total(section.entries.map((e) => e.quantity)));
      expect(section.entries.every(({ card }) => card.type === section.key)).toBe(true);
      for (let i = 1; i < section.entries.length; i++) {
        const [a, b] = [section.entries[i - 1].card, section.entries[i].card];
        expect(a.cost! < b.cost! || (a.cost === b.cost && a.name.localeCompare(b.name) <= 0)).toBe(true);
      }
    }
  });

  it("accounts for all 50 cards in every archetype template", () => {
    for (const decklist of ALL_DECKS) {
      const grouped = groupDecklist(decklist);
      expect(total(grouped.sections.map((s) => s.count))).toBe(RULES.mainDeckSize);
      expect(grouped.unknownCardIds).toEqual([]);
    }
  });

  it("omits empty sections and skips unknown ids", () => {
    const grouped = groupDecklist({ leaderId: "NT09-L99", cards: [{ cardId: "NT01-006", quantity: 2 }, { cardId: "NT09-999", quantity: 3 }] });
    expect(grouped.leader).toBeNull();
    expect(grouped.unknownCardIds).toEqual(["NT09-L99", "NT09-999"]);
    expect(grouped.sections.map((s) => [s.key, s.title, s.count])).toEqual([["jutsu", "Jutsus", 2]]);
  });

  it("reports an unknown id once even when it is both the Leader and a main-deck card", () => {
    const decklist: Decklist = { leaderId: "NT09-L99", cards: [{ cardId: "NT09-L99", quantity: 2 }] };
    expect(groupDecklist(decklist).unknownCardIds).toEqual(["NT09-L99"]);
    expect(decklistToText(decklist)).toBe("Leader: NT09-L99\n\nUnknown (2)\n2 NT09-L99");
  });
});

describe("costCurve / typeCounts / averageCost", () => {
  it("buckets every card of a legal list", () => {
    for (const decklist of ALL_DECKS) {
      const curve = costCurve(decklist);
      expect(curve.map((point) => point.cost)).toEqual([...COST_BUCKETS]);
      expect(total(curve.map((p) => p.character + p.jutsu + p.mission + p.other))).toBe(RULES.mainDeckSize);
      const sections = groupDecklist(decklist).sections;
      for (const { key, count } of sections) expect(total(curve.map((point) => point[key]))).toBe(count);
    }
  });

  it("pools costs of 7 and above", () => {
    const curve = costCurve({
      leaderId: "NT02-L03",
      cards: [
        { cardId: "NT02-023", quantity: 2 },
        { cardId: "NT04-001", quantity: 1 },
        { cardId: "NT01-040", quantity: 4 },
      ],
    });
    expect(curve.find((p) => p.cost === "7+")).toEqual({ cost: "7+", character: 3, jutsu: 0, mission: 0, other: 0 });
    expect(curve.find((p) => p.cost === "0")).toEqual({ cost: "0", character: 0, jutsu: 4, mission: 0, other: 0 });
  });

  it("counts types and averages cost per copy", () => {
    const counts = typeCounts(AVENGER_DECK);
    expect(total(Object.values(counts))).toBe(RULES.mainDeckSize);
    expect(counts.leader).toBe(0);
    expect(counts.character).toBe(groupDecklist(AVENGER_DECK).sections.find((s) => s.key === "character")!.count);
    expect(averageCost(SMALL)).toBeCloseTo((4 * 3 + 2 * 4 + 3 * 2 + 1 * 2) / 10, 12);
    expect(averageCost({ leaderId: "NT01-L01", cards: [] })).toBe(0);
  });
});

describe("decklistToText", () => {
  it("exports the Leader and each section with counts and ids", () => {
    expect(decklistToText(SMALL)).toBe(
      [
        "Leader: Kakashi Hatake — Copy Ninja (NT01-L01)",
        "",
        "Characters (5)",
        "3 Ibiki Morino (NT01-005)",
        "2 Asuma Sarutobi (NT01-001)",
        "",
        "Jutsus (4)",
        "4 Lightning Blade (NT01-006)",
        "",
        "Missions (1)",
        "1 Squad Seven Reunion (NT01-008)",
      ].join("\n"),
    );
  });

  it("can drop ids and lists unknown cards instead of losing them", () => {
    const text = decklistToText({ ...SMALL, cards: [...SMALL.cards, { cardId: "NT09-999", quantity: 2 }] }, { includeIds: false });
    expect(text).not.toContain("(NT");
    expect(text.split("\n")[0]).toBe("Leader: Kakashi Hatake — Copy Ninja");
    expect(text.endsWith("Unknown (2)\n2 NT09-999")).toBe(true);
  });

  it("lists every card of a full list", () => {
    const lines = decklistToText(AVENGER_DECK).split("\n");
    expect(lines[0]).toBe(`Leader: ${getCard("NT02-L01")!.name} (NT02-L01)`);
    for (const { cardId, quantity } of AVENGER_DECK.cards) expect(lines).toContain(`${quantity} ${getCard(cardId)!.name} (${cardId})`);
    const headings = lines.filter((line) => /^[A-Z][a-z]+ \(\d+\)$/.test(line));
    expect(total(headings.map((line) => Number(/\((\d+)\)/.exec(line)![1])))).toBe(RULES.mainDeckSize);
  });
});

describe("encodeDecklist / decodeDecklist", () => {
  it("produces a canonical, URL-safe code", () => {
    const code = encodeDecklist(SMALL);
    expect(code).toBe("NT01-L01.NT01-001x2.NT01-005x3.NT01-006x4.NT01-008x1");
    expect(encodeURIComponent(code)).toBe(code);
    expect(encodeDecklist({ ...SMALL, cards: [...SMALL.cards].reverse() })).toBe(code);
    expect(encodeDecklist({ leaderId: "NT01-L01", cards: [{ cardId: "NT01-006", quantity: 1 }, { cardId: "NT01-006", quantity: 3 }] })).toBe(
      "NT01-L01.NT01-006x4",
    );
  });

  it("round-trips every archetype template", () => {
    for (const decklist of ALL_DECKS) {
      const decoded = decodeDecklist(encodeDecklist(decklist));
      expect(decoded).not.toBeNull();
      expect(decoded!.leaderId).toBe(decklist.leaderId);
      expect(Object.fromEntries(cardCounts(decoded!))).toEqual(Object.fromEntries(cardCounts(decklist)));
      expect(encodeDecklist(decoded!)).toBe(encodeDecklist(decklist));
    }
    expect(decodeDecklist("NT01-L01")).toEqual({ leaderId: "NT01-L01", cards: [] });
  });

  it("rejects malformed codes", () => {
    for (const code of [
      "",
      ".",
      "NT01-L01.",
      ".NT01-001x4",
      "NT01-L01..NT01-001x4",
      "NT01-L01.NT01-001",
      "NT01-L01.NT01-001x",
      "NT01-L01.NT01-001x0",
      "NT01-L01.NT01-001x04",
      "NT01-L01.NT01-001x-1",
      "NT01-L01.NT01-001x2.5",
      "NT01-L01.NT01-001x51",
      "NT01-L01.x4",
      "NT01-L01.NT01-002x1.NT01-001x1",
      "NT01-L01.NT01-001x1.NT01-001x1",
      " NT01-L01.NT01-001x4",
      "NT01-L01.NT01-001x4 ",
      "NT01 L01.NT01-001x4",
      "NT01-L01,NT01-001x4",
      "NT01-L01.NT01_001x4",
      "NT01-L01.NT01-001x4%20",
      "NT01-L01.ＮT01-001x4",
    ]) {
      expect(decodeDecklist(code), code).toBeNull();
    }
  });

  it("refuses to encode what it cannot decode", () => {
    expect(() => encodeDecklist({ leaderId: "NT01 L01", cards: [] })).toThrow(RangeError);
    expect(() => encodeDecklist({ leaderId: "NT01-L01", cards: [{ cardId: "NT01.001", quantity: 1 }] })).toThrow(RangeError);
    expect(() => encodeDecklist({ leaderId: "NT01-L01", cards: [{ cardId: "NT01-001", quantity: 0 }] })).toThrow(RangeError);
    expect(() => encodeDecklist({ leaderId: "NT01-L01", cards: [{ cardId: "NT01-001", quantity: 51 }] })).toThrow(RangeError);
  });
});

describe("keyCards", () => {
  it("ranks signature cards first, then copies, then cost", () => {
    expect(keyCards(SMALL, ["NT01-008"])).toEqual(["NT01-008", "NT01-006", "NT01-005"]);
    expect(keyCards(SMALL, [])).toEqual(["NT01-006", "NT01-005", "NT01-001"]);
    expect(keyCards(SMALL, [], 1)).toEqual(["NT01-006"]);
    const tied: Decklist = { leaderId: "NT01-L01", cards: [{ cardId: "NT01-006", quantity: 4 }, { cardId: "NT01-001", quantity: 4 }] };
    expect(keyCards(tied, [])).toEqual(["NT01-001", "NT01-006"]);
  });

  it("highlights signature cards of an archetype list and ignores unknown ids", () => {
    const keys = keyCards(AVENGER_DECK, AVENGER.signatureCardIds);
    expect(keys).toHaveLength(3);
    expect(keys.every((id) => AVENGER.signatureCardIds.includes(id))).toBe(true);
    expect(keyCards({ leaderId: "NT01-L01", cards: [{ cardId: "NT09-999", quantity: 4 }] }, ["NT09-999"])).toEqual([]);
  });
});
