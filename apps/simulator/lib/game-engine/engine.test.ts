import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeCards } from "../cards/normalize";
import type { CardDb, SimCard } from "../cards/types";
import { getStarterDecks } from "../deck/autobuild";
import { toDeckSetup } from "../deck/deck";
import { validateDeck } from "../deck/validate";
import { getAbilities } from "./abilities";
import { applyAction, createGame, IllegalActionError } from "./engine";
import { FORMAT } from "./format";
import { characterPower, missionTotals } from "./power";
import { simulateGame } from "./simulate";
import type { EngineContext, GameAction, GameState, PlayerId } from "./types";

const raw = JSON.parse(readFileSync(new URL("../../public/data/cards.json", import.meta.url), "utf8"));
const seed = normalizeCards(raw);
const seedDb: CardDb = Object.fromEntries(seed.cards.map((c) => [c.id, c]));

function card(partial: Partial<SimCard> & Pick<SimCard, "id" | "name" | "type">): SimCard {
  return { set: "T", number: "", rarity: "common", element: "neutral", keywords: [], cost: 0, power: 0, points: 0, text: "", ...partial };
}

const testCards: SimCard[] = [
  card({ id: "LEAD", name: "Leader", type: "leader" }),
  card({ id: "M1", name: "Mission One", type: "mission", points: 1 }),
  card({ id: "M2", name: "Mission Two", type: "mission", points: 2 }),
  card({ id: "M3", name: "Mission Three", type: "mission", points: 3 }),
  card({ id: "ALPHA", name: "Alpha", type: "character", cost: 2, power: 2 }),
  card({ id: "ALPHA2", name: "Alpha", title: "Evolved", type: "character", cost: 4, power: 4, text: "UPGRADE: POWERUP 2." }),
  card({ id: "AMB", name: "Ambusher", type: "character", cost: 3, power: 3, text: "AMBUSH: POWERUP 2." }),
];
const ctx: EngineContext = { cards: Object.fromEntries(testCards.map((c) => [c.id, c])) };

function newGame(decks: [string[], string[]], firstPlayer: PlayerId = 0): GameState {
  const deck = (name: string, mainIds: string[]) => ({ name, leaderId: "LEAD", missionIds: ["M1", "M2", "M3"], mainIds });
  return createGame(
    {
      seed: 42,
      firstPlayer,
      players: [
        { name: "P1", controller: "human", deck: deck("A", decks[0]) },
        { name: "P2", controller: "human", deck: deck("B", decks[1]) },
      ],
    },
    ctx,
  );
}

function run(s: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce((st, a) => applyAction(st, a, ctx), s);
}

/** Keeps both hands and advances to the round-1 Action Phase. */
function toAction(s: GameState): GameState {
  return run(
    s,
    { type: "MULLIGAN", player: s.activePlayer, mulligan: false },
    { type: "MULLIGAN", player: s.activePlayer === 0 ? 1 : 0, mulligan: false },
    { type: "ADVANCE" },
  );
}

const handOf = (s: GameState, p: PlayerId, cardId: string) => s.players[p].hand.find((id) => s.instances[id].cardId === cardId)!;

describe("card text compiler", () => {
  it("loads the card pool cleanly and fully automates the placeholder Leaders", () => {
    expect(seed.warnings).toEqual([]);
    const leaders = seed.cards.filter((c) => c.type === "leader");
    expect(leaders.length).toBeGreaterThan(0);
    expect(leaders.flatMap((c) => getAbilities(c).unparsed)).toEqual([]);
  });

  it("has a thumbnail on disk for every card that names one", () => {
    const missing = seed.cards.filter((c) => c.imageUrl && !existsSync(new URL(`../../public${c.imageUrl}`, import.meta.url)));
    expect(missing.map((c) => c.id)).toEqual([]);
  });
});

describe("starter decks", () => {
  it("are all tournament legal", () => {
    for (const deck of getStarterDecks(seed.cards)) {
      const v = validateDeck(deck, seedDb);
      expect(v.checks.filter((c) => !c.ok).map((c) => `${deck.name}: ${c.detail}`)).toEqual([]);
    }
  });
});

describe("rules", () => {
  it("sets up missions D/B for the first player and C/A for the second", () => {
    const s = newGame([Array(40).fill("ALPHA"), Array(40).fill("ALPHA")], 1);
    expect(s.missions.map((m) => m.owner)).toEqual([1, 0, 1, 0]);
    expect(s.edge).toBe(1);
    expect(s.players[0].hand).toHaveLength(FORMAT.openingHand);
  });

  it("Start Phase reveals D, grants 5 Chakra and draws 2", () => {
    const s = toAction(newGame([Array(40).fill("ALPHA"), Array(40).fill("ALPHA")]));
    expect(s.phase).toBe("action");
    expect(s.missions[0].revealed).toBe(true);
    expect(s.missions[1].revealed).toBe(false);
    expect(s.players[0].chakra).toBe(FORMAT.baseChakra);
    expect(s.players[0].hand).toHaveLength(FORMAT.openingHand + FORMAT.drawPerRound);
  });

  it("Hidden costs 1 with 0 Power; revealing pays full cost and triggers AMBUSH", () => {
    let s = toAction(newGame([Array(40).fill("AMB"), Array(40).fill("ALPHA")]));
    const amb = handOf(s, 0, "AMB");
    s = run(s, { type: "PLAY_CHARACTER", player: 0, handId: amb, missionIndex: 0, hidden: true });
    expect(s.players[0].chakra).toBe(4);
    expect(characterPower(s, ctx, amb)).toBe(0);
    s = run(s, { type: "PLAY_CHARACTER", player: 1, handId: handOf(s, 1, "ALPHA"), missionIndex: 0, hidden: false });
    s = run(s, { type: "REVEAL", player: 0, instanceId: amb });
    expect(s.players[0].chakra).toBe(1);
    expect(s.instances[amb].faceDown).toBe(false);
    expect(characterPower(s, ctx, amb)).toBe(5);
  });

  it("rejects illegal actions with a reason", () => {
    const s = toAction(newGame([Array(40).fill("ALPHA"), Array(40).fill("ALPHA")]));
    expect(() => run(s, { type: "PASS", player: 1 })).toThrow(IllegalActionError);
    const [a, b] = s.players[0].hand;
    const s2 = run(s, { type: "PLAY_CHARACTER", player: 0, handId: a, missionIndex: 0, hidden: false }, { type: "PASS", player: 1 });
    expect(() => run(s2, { type: "PLAY_CHARACTER", player: 0, handId: b, missionIndex: 0, hidden: false })).toThrow(/Evolve/);
    expect(() => run(s2, { type: "PLAY_CHARACTER", player: 0, handId: b, missionIndex: 1, hidden: false })).toThrow(/not revealed/);
  });

  it("Evolve pays the cost difference, keeps Power tokens and triggers UPGRADE", () => {
    const base = newGame([[...Array(20).fill("ALPHA"), ...Array(20).fill("ALPHA2")], Array(40).fill("ALPHA")]);
    let s = toAction(base);
    const a1 = handOf(s, 0, "ALPHA");
    const a2 = handOf(s, 0, "ALPHA2");
    expect(a1 && a2).toBeTruthy();
    s = run(
      s,
      { type: "PLAY_CHARACTER", player: 0, handId: a1, missionIndex: 0, hidden: false },
      { type: "PASS", player: 1 },
      { type: "ADD_POWER_TOKEN", player: 0, targetId: a1 },
      { type: "EVOLVE", player: 0, handId: a2, targetId: a1 },
    );
    expect(s.players[0].chakra).toBe(5 - 2 - FORMAT.powerTokenCost - 2);
    expect(s.instances[a2].stack).toEqual([a1]);
    expect(s.instances[a2].powerTokens).toBe(1 + 2);
    expect(characterPower(s, ctx, a2)).toBe(4 + 3);
    expect(s.missions[0].characters[0]).toEqual([a2]);
  });

  it("first player to pass takes the Edge, which wins ties; End Phase clears tokens and Chakra", () => {
    let s = toAction(newGame([Array(40).fill("ALPHA"), Array(40).fill("ALPHA")]));
    s = run(
      s,
      { type: "PLAY_CHARACTER", player: 0, handId: handOf(s, 0, "ALPHA"), missionIndex: 0, hidden: false },
      { type: "PLAY_CHARACTER", player: 1, handId: handOf(s, 1, "ALPHA"), missionIndex: 0, hidden: false },
      { type: "PASS", player: 0 },
    );
    expect(s.edge).toBe(0);
    s = run(s, { type: "ADD_POWER_TOKEN", player: 1, targetId: s.missions[0].characters[1][0] });
    expect(s.activePlayer).toBe(1);
    s = run(s, { type: "PASS", player: 1 });
    expect(s.phase).toBe("mission");
    expect(missionTotals(s, ctx, 0)).toEqual([2, 3]);
    const dPoints = ctx.cards[s.instances[s.missions[0].instanceId].cardId].points;
    expect(s.players[1].score).toBe(dPoints + 1);

    s = run(s, { type: "ADVANCE" });
    expect(s.phase).toBe("end");
    expect(Object.values(s.instances).every((i) => i.powerTokens === 0)).toBe(true);
    expect(s.players[0].chakra).toBe(0);

    s = run(s, { type: "ADVANCE" });
    expect(s.round).toBe(2);
    expect(s.players[0].chakra).toBe(FORMAT.baseChakra + 1);
    s = run(s, { type: "ADVANCE" }, { type: "PASS", player: 0 }, { type: "PASS", player: 1 });
    expect(missionTotals(s, ctx, 0)).toEqual([2, 2]);
    expect(s.lastEvaluation?.[0]).toMatchObject({ winner: 0, edgeTiebreak: true });
  });
});

function assertConsistent(s: GameState) {
  for (const p of [0, 1] as PlayerId[]) {
    const pl = s.players[p];
    const listed = [
      ...pl.deck,
      ...pl.hand,
      ...pl.discard,
      ...pl.reserve,
      ...(pl.leader ? [pl.leader] : []),
      ...s.missions.filter((m) => m.owner === p).map((m) => m.instanceId),
      ...s.missions.flatMap((m) => m.characters[p]),
    ];
    const nested = s.missions
      .flatMap((m) => m.characters[p])
      .flatMap((id) => [...s.instances[id].stack, ...s.instances[id].attachments]);
    const all = [...listed, ...nested];
    const owned = Object.values(s.instances).filter((i) => i.owner === p);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(owned.length);
    expect(owned.length).toBe(FORMAT.mainDeckSize + FORMAT.leaderCount + FORMAT.missionCount);
    expect(pl.chakra).toBeGreaterThanOrEqual(0);
  }
}

describe("AI vs AI", () => {
  it("plays complete, rules-consistent games across every starter matchup", () => {
    const decks = getStarterDecks(seed.cards);
    const ctxSeed: EngineContext = { cards: seedDb };
    let games = 0;
    for (let i = 0; i < decks.length; i++) {
      for (let j = 0; j < decks.length; j++) {
        if (i === j) continue;
        const s = simulateGame(
          {
            seed: 1000 + i * 31 + j,
            players: [
              { name: "A", controller: "ai", deck: toDeckSetup(decks[i], seedDb) },
              { name: "B", controller: "ai", deck: toDeckSetup(decks[j], seedDb) },
            ],
          },
          ctxSeed,
        );
        expect(s.phase).toBe("gameover");
        expect(s.round).toBe(FORMAT.rounds);
        expect(s.result).not.toBeNull();
        assertConsistent(s);
        const scored = s.log.filter((l) => l.kind === "score" && l.player !== null).length;
        expect(scored).toBeGreaterThan(0);
        games++;
      }
    }
    expect(games).toBe(decks.length * (decks.length - 1));
  });
});
