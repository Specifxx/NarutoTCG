import type { MatchRecord } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { topCutRounds } from "@/lib/tournament/standings";
import { buildBracket } from "./bracket";
import { swissSeeds } from "./event";
import { eliminationRoundLabel, eventRounds, matchResultLabel, pairingsForRound, topCutRoundLabels } from "./rounds";
import { fixtureTournament } from "./test-fixtures";

const cutMatch = (round: number, table: number, p1: string, p2: string, outcome: "p1" | "p2" = "p1"): MatchRecord => ({
  round,
  stage: "top-cut",
  table,
  player1Id: p1,
  player2Id: p2,
  outcome,
});

describe("round labels", () => {
  it("names elimination rounds from the end", () => {
    expect([0, 1, 2, 3, 4].map(eliminationRoundLabel)).toEqual(["Final", "Semifinals", "Quarterfinals", "Top 16", "Top 32"]);
  });

  it("labels a complete Top 8 bracket", () => {
    const matches = [
      ...[1, 2, 3, 4].map((t) => cutMatch(8, t, `a${t}`, `b${t}`)),
      ...[1, 2].map((t) => cutMatch(9, t, `a${t}`, `a${t + 2}`)),
      cutMatch(10, 1, "a1", "a2"),
    ];
    expect([...topCutRoundLabels(matches)]).toEqual([
      [8, "Quarterfinals"],
      [9, "Semifinals"],
      [10, "Final"],
    ]);
  });

  it("still names a bracket whose final was not recorded", () => {
    const matches = [...[1, 2, 3, 4].map((t) => cutMatch(8, t, `a${t}`, `b${t}`)), ...[1, 2].map((t) => cutMatch(9, t, `a${t}`, `a${t + 2}`))];
    expect([...topCutRoundLabels(matches).values()]).toEqual(["Quarterfinals", "Semifinals"]);
  });

  it("lists Swiss rounds then labelled cut rounds", () => {
    expect(eventRounds(fixtureTournament().matches).map((r) => [r.round, r.stage, r.shortLabel, r.label])).toEqual([
      [1, "swiss", "R1", "Round 1"],
      [2, "swiss", "R2", "Round 2"],
      [3, "swiss", "R3", "Round 3"],
      [4, "top-cut", "Semifinals", "Semifinals"],
      [5, "top-cut", "Final", "Final"],
    ]);
    expect(eventRounds([])).toEqual([]);
  });

  it("labels every seed bracket with as many rounds as its cut size implies", () => {
    for (const t of SEED_TOURNAMENTS) {
      const cut = eventRounds(t.matches).filter((r) => r.stage === "top-cut");
      expect(cut).toHaveLength(topCutRounds(t.topCutSize));
      expect(cut.at(-1)?.label).toBe("Final");
    }
  });
});

describe("pairings", () => {
  it("formats results from player 1's side", () => {
    const base = { round: 1, stage: "swiss" as const, player1Id: "a", player2Id: "b" };
    expect(matchResultLabel({ ...base, outcome: "p1", games: { p1: 2, p2: 1 } })).toBe("2-1");
    expect(matchResultLabel({ ...base, outcome: "p2", games: { p1: 1, p2: 2 } })).toBe("1-2");
    expect(matchResultLabel({ ...base, outcome: "p1" })).toBe("1-0");
    expect(matchResultLabel({ ...base, outcome: "p2" })).toBe("0-1");
    expect(matchResultLabel({ ...base, outcome: "draw", intentionalDraw: true })).toBe("ID");
    expect(matchResultLabel({ ...base, outcome: "draw", games: { p1: 1, p2: 1 } })).toBe("Draw");
    expect(matchResultLabel({ ...base, player2Id: null, outcome: "bye" })).toBe("Bye");
  });

  it("lists a round by table with winners", () => {
    const rows = pairingsForRound(fixtureTournament().matches, 3);
    expect(rows.map((r) => [r.table, r.player1Id, r.result, r.player2Id, r.winner])).toEqual([
      [1, "ann-a", "ID", "dee-d", null],
      [2, "ben-b", "2-0", "cal-c", "p1"],
      [3, "eve-e", "0-2", "gus-g", "p2"],
      [4, "fay-f", "Bye", null, "p1"],
    ]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it("puts unnumbered tables last", () => {
    const rows = pairingsForRound(
      [
        { round: 1, stage: "swiss", player1Id: "z", player2Id: null, outcome: "bye" },
        { round: 1, stage: "swiss", table: 2, player1Id: "b", player2Id: "c", outcome: "p1" },
        { round: 1, stage: "swiss", table: 1, player1Id: "d", player2Id: "e", outcome: "p2" },
      ],
      1,
    );
    expect(rows.map((r) => r.table)).toEqual([1, 2, null]);
  });
});

describe("buildBracket", () => {
  it("seeds from Swiss and keeps feeders next to the match they feed", () => {
    const t = fixtureTournament();
    const seeds = swissSeeds(t);
    expect([...seeds].slice(0, 4)).toEqual([
      ["ann-a", 1],
      ["dee-d", 2],
      ["ben-b", 3],
      ["gus-g", 4],
    ]);
    const bracket = buildBracket(t.matches, seeds);
    expect(bracket.map((r) => r.label)).toEqual(["Semifinals", "Final"]);
    // The final is Ann (top) vs Ben, so Ann's semifinal (table 2) is drawn above Ben's (table 1).
    expect(bracket[0]!.matches.map((m) => m.slots.map((s) => s.playerId))).toEqual([
      ["ann-a", "gus-g"],
      ["dee-d", "ben-b"],
    ]);
    const final = bracket[1]!.matches[0]!;
    expect(final.slots).toEqual([
      { playerId: "ann-a", seed: 1, games: 2, won: true },
      { playerId: "ben-b", seed: 3, games: 1, won: false },
    ]);
  });

  it("handles byes and matches that feed nothing recorded", () => {
    const bracket = buildBracket(
      [
        { round: 6, stage: "top-cut", player1Id: "a", player2Id: null, outcome: "bye" },
        cutMatch(6, 1, "b", "c", "p2"),
        cutMatch(6, 2, "x", "y"),
        cutMatch(7, 1, "c", "a", "p2"),
      ],
      new Map([["a", 1]]),
    );
    expect(bracket[0]!.matches.map((m) => m.key)).toEqual(["6:1:b", "6:-:a", "6:2:x"]);
    const bye = bracket[0]!.matches[1]!;
    expect(bye.slots).toEqual([
      { playerId: "a", seed: 1, games: null, won: true },
      { playerId: null, seed: null, games: null, won: false },
    ]);
  });

  it("is empty without top cut matches", () => {
    expect(buildBracket(fixtureTournament().matches.filter((m) => m.stage === "swiss"), new Map())).toEqual([]);
  });

  it("builds a full binary bracket for every seed event", () => {
    for (const t of SEED_TOURNAMENTS) {
      const bracket = buildBracket(t.matches, swissSeeds(t));
      expect(bracket.map((r) => r.matches.length)).toEqual(
        Array.from({ length: topCutRounds(t.topCutSize) }, (_, i) => t.topCutSize / 2 ** (i + 1)),
      );
      // Each pair of adjacent matches feeds the match at half its index.
      for (let r = 0; r + 1 < bracket.length; r++) {
        bracket[r + 1]!.matches.forEach((later, i) => {
          const winners = [bracket[r]!.matches[2 * i]!, bracket[r]!.matches[2 * i + 1]!].map((m) => m.slots.find((s) => s.won)?.playerId);
          expect(winners).toEqual(later.slots.map((s) => s.playerId));
        });
      }
      const champion = bracket.at(-1)!.matches[0]!.slots.find((s) => s.won)?.playerId;
      expect(champion).toBe(t.players.find((p) => p.placement === 1)?.id);
    }
  });
});
