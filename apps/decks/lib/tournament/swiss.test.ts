import type { MatchRecord } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { byeRecipients, pairingHistory, pairKey, pairSwissRound } from "./swiss";

const m = (round: number, p1: string, p2: string | null, outcome: MatchRecord["outcome"]): MatchRecord => ({
  round,
  stage: "swiss",
  player1Id: p1,
  player2Id: p2,
  outcome,
});

const ids = (...names: string[]) => names.map((id) => ({ id }));
const asPairs = (pairings: ReturnType<typeof pairSwissRound>) => pairings.map((p) => [p.player1Id, p.player2Id]);

/** Plays a full Swiss event with random results (some draws) and random drops from round 3. */
function simulate(playerCount: number, rounds: number, seed: string) {
  const rng = createRng(seed);
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${String(i + 1).padStart(2, "0")}`, dropped: false }));
  const matches: MatchRecord[] = [];
  const perRound: Array<{ active: string[]; pairings: ReturnType<typeof pairSwissRound> }> = [];
  for (let round = 1; round <= rounds; round++) {
    const active = players.filter((p) => !p.dropped).map((p) => p.id);
    const pairings = pairSwissRound({ round, players, matches, rng });
    perRound.push({ active, pairings });
    for (const { player1Id, player2Id } of pairings) {
      const roll = rng();
      matches.push(m(round, player1Id, player2Id, player2Id === null ? "bye" : roll < 0.05 ? "draw" : roll < 0.55 ? "p1" : "p2"));
    }
    if (round >= 2) for (const p of players) if (!p.dropped && rng() < 0.08) p.dropped = true;
  }
  return { matches, perRound };
}

describe("pairSwissRound — simulated events", () => {
  const cases = [
    [30, 6],
    [31, 7],
    [33, 6],
    [64, 6],
  ] as const;

  for (const [playerCount, rounds] of cases) {
    it(`${playerCount} players, ${rounds} rounds with drops: valid rounds, no rematches, no repeat byes`, () => {
      for (let s = 0; s < 15; s++) {
        const { matches, perRound } = simulate(playerCount, rounds, `swiss-${playerCount}-${s}`);

        const keys = matches.filter((x) => x.player2Id !== null).map((x) => pairKey(x.player1Id, x.player2Id!));
        expect(new Set(keys).size).toBe(keys.length);

        const byes = new Set<string>();
        for (const { active, pairings } of perRound) {
          const seated = pairings.flatMap((p) => (p.player2Id === null ? [p.player1Id] : [p.player1Id, p.player2Id]));
          expect(seated.slice().sort()).toEqual(active.slice().sort());

          const roundByes = pairings.filter((p) => p.player2Id === null);
          expect(roundByes.length).toBe(active.length % 2);
          for (const bye of roundByes) {
            expect(byes.has(bye.player1Id)).toBe(false);
            byes.add(bye.player1Id);
          }
        }
      }
    });
  }

  it("is deterministic for a given seed", () => {
    expect(simulate(31, 5, "same").matches).toEqual(simulate(31, 5, "same").matches);
    expect(simulate(31, 5, "same").matches).not.toEqual(simulate(31, 5, "other").matches);
  });
});

describe("pairSwissRound — rules", () => {
  it("round 1 is a seeded shuffle that seats everyone once", () => {
    const players = ids("a", "b", "c", "d", "e", "f", "g", "h");
    const first = pairSwissRound({ round: 1, players, matches: [], rng: createRng(1) });
    expect(first).toHaveLength(4);
    expect(first).toEqual(pairSwissRound({ round: 1, players, matches: [], rng: createRng(1) }));
    expect(first.flatMap((p) => [p.player1Id, p.player2Id]).sort()).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });

  it("pairs top-down within match-point groups, higher rank as player1", () => {
    const players = ids("a", "b", "c", "d", "e", "f", "g", "h");
    const matches = [m(1, "a", "b", "p1"), m(1, "c", "d", "p1"), m(1, "e", "f", "p1"), m(1, "g", "h", "p1")];
    const pairs = asPairs(pairSwissRound({ round: 2, players, matches, rng: createRng(0) }));
    expect(pairs).toEqual([
      ["a", "c"],
      ["e", "g"],
      ["b", "d"],
      ["f", "h"],
    ]);
  });

  it("floats the lowest player of an odd group down", () => {
    const players = ids("a", "b", "c", "d", "e", "f");
    const matches = [m(1, "a", "b", "p1"), m(1, "c", "d", "p1"), m(1, "e", "f", "p1")];
    const pairs = asPairs(pairSwissRound({ round: 2, players, matches, rng: createRng(0) }));
    expect(pairs).toEqual([
      ["a", "c"],
      ["e", "b"],
      ["d", "f"],
    ]);
  });

  it("swaps around a rematch instead of repeating a pairing", () => {
    const players = ids("a", "b", "c", "d", "e", "f");
    // e and f drew; both sit in the 1-point group but must not meet again.
    const matches = [m(1, "a", "b", "p1"), m(1, "c", "d", "p1"), m(1, "e", "f", "draw")];
    const pairs = asPairs(pairSwissRound({ round: 2, players, matches, rng: createRng(0) }));
    expect(pairs).toEqual([
      ["a", "c"],
      ["e", "b"],
      ["f", "d"],
    ]);
  });

  it("allows the fewest rematches only when a clean pairing is impossible", () => {
    const players = ids("a", "b", "c", "d");
    const matches = [
      m(1, "a", "b", "p1"),
      m(1, "c", "d", "p1"),
      m(2, "a", "c", "p1"),
      m(2, "b", "d", "p1"),
      m(3, "a", "d", "p1"),
      m(3, "b", "c", "p1"),
    ];
    const pairings = pairSwissRound({ round: 4, players, matches, rng: createRng(0) });
    expect(pairings).toHaveLength(2);
    expect(pairings.flatMap((p) => [p.player1Id, p.player2Id]).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("with an odd field and no clean pairing, picks the bye that needs the fewest rematches", () => {
    const players = ids("a", "b", "c", "d", "e");
    // Hand-built history: a–d have all played each other; e has played a and b. Ranked a, b, c, d, e.
    const matches = [
      m(1, "a", "b", "p1"),
      m(1, "c", "d", "draw"),
      m(2, "a", "c", "p1"),
      m(2, "b", "d", "p1"),
      m(3, "a", "d", "p1"),
      m(3, "b", "c", "p1"),
      m(4, "a", "e", "p1"),
      m(5, "b", "e", "p1"),
    ];
    const pairings = pairSwissRound({ round: 6, players, matches, rng: createRng(0) });
    // A bye for e leaves a–d, which costs two rematches; a bye for d costs one.
    expect(asPairs(pairings)).toEqual([
      ["a", "b"],
      ["c", "e"],
      ["d", null],
    ]);
  });

  it("gives the bye to the lowest-ranked player without one and skips dropped players", () => {
    const players = ids("a", "b", "c", "d", "e");
    const round1 = [m(1, "a", "b", "p1"), m(1, "c", "d", "p1"), m(1, "e", null, "bye")];
    const pairings = pairSwissRound({ round: 2, players, matches: round1, rng: createRng(0) });
    expect(pairings.at(-1)).toEqual({ player1Id: "d", player2Id: null });

    const withDrop = pairSwissRound({ round: 2, players: [...ids("a", "b", "c", "e"), { id: "d", dropped: true }], matches: round1, rng: createRng(0) });
    expect(withDrop.every((p) => p.player2Id !== null)).toBe(true);
    expect(withDrop.flatMap((p) => [p.player1Id, p.player2Id])).not.toContain("d");
  });

  it("passes over a lower-ranked player who already had a bye", () => {
    const players = ids("a", "b", "c");
    const matches = [m(1, "a", "b", "p1"), m(1, "c", null, "bye"), m(2, "c", "a", "p1"), m(2, "b", null, "bye")];
    // Standings: c 6, a 3 (OMW .75), b 3 (OMW .5). b and c had byes, so a gets it.
    const pairings = pairSwissRound({ round: 3, players, matches, rng: createRng(0) });
    expect(asPairs(pairings)).toEqual([
      ["c", "b"],
      ["a", null],
    ]);
  });
});

describe("history helpers", () => {
  const matches = [m(1, "a", "b", "p1"), m(1, "c", null, "bye"), m(2, "c", "a", "p2"), { ...m(3, "a", "c", "p1"), stage: "top-cut" as const }];

  it("pairingHistory collects order-independent Swiss pair keys before a round", () => {
    expect(pairingHistory(matches)).toEqual(new Set([pairKey("a", "b"), pairKey("a", "c")]));
    expect(pairingHistory(matches, 2)).toEqual(new Set([pairKey("b", "a")]));
  });

  it("byeRecipients lists Swiss bye recipients before a round", () => {
    expect(byeRecipients(matches)).toEqual(new Set(["c"]));
    expect(byeRecipients(matches, 1)).toEqual(new Set());
  });
});
