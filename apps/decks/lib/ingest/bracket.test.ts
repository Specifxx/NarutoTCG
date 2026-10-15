import type { MatchRecord, Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { computeFinalPlacements } from "@/lib/tournament/standings";
import { templateTournament } from "./__fixtures__/files";
import { bracketConflicts, bracketPlacements } from "./bracket";

const placementsOf = (t: Tournament) => new Map(t.players.map((p) => [p.id, p.placement]));
const cutMatch = (round: number, player1Id: string, player2Id: string, outcome: "p1" | "p2"): MatchRecord => ({
  round,
  stage: "top-cut",
  player1Id,
  player2Id,
  outcome,
});

describe("bracketConflicts", () => {
  it("finds none in the template or the seed events", () => {
    expect(bracketConflicts(templateTournament())).toEqual([]);
    for (const t of SEED_TOURNAMENTS) expect(bracketConflicts(t), t.id).toEqual([]);
  });

  it("finds none without a top cut", () => {
    const t = templateTournament();
    expect(bracketConflicts({ ...t, matches: t.matches.filter((m) => m.stage === "swiss"), topCutSize: 0 })).toEqual([]);
  });

  it("reads a final only when it sits where the cut ends", () => {
    // A top 8 with one quarterfinal recorded: its winner is not the champion.
    const players = ["a", "b", "c"].map((id, i) => ({ id, name: id.toUpperCase(), placement: i + 1 }));
    const lone = { players, matches: [cutMatch(6, "c", "a", "p1")], swissRounds: 5, topCutSize: 8 };
    expect(bracketConflicts(lone)).toEqual(["C (placed 3) went further in the top cut than A (placed 1), who lost in round 6."]);
    expect(bracketConflicts({ ...lone, players: [{ ...players[0]!, placement: 2 }, { ...players[1]!, placement: 3 }, { ...players[2]!, placement: 1 }] })).toEqual([]);
  });
});

describe("bracketPlacements", () => {
  it("places the top cut by how far each player got, keeping the reported order within a band and outside the cut", () => {
    const t = templateTournament();
    const reported = new Map(t.players.map((p) => [p.id, p.placement === 1 ? 3 : p.placement === 3 ? 1 : p.placement]));
    expect(bracketPlacements(t.players, t.matches, reported)).toEqual(placementsOf(t));
    // Swapping two semifinal losers, or two players outside the cut, is kept as reported.
    const withinBands = new Map(t.players.map((p) => [p.id, p.placement === 3 ? 4 : p.placement === 4 ? 3 : p.placement === 5 ? 8 : p.placement === 8 ? 5 : p.placement]));
    expect(bracketPlacements(t.players, t.matches, withinBands)).toEqual(withinBands);
  });

  it("agrees with computeFinalPlacements on the seed events", () => {
    for (const t of SEED_TOURNAMENTS.slice(0, 4)) {
      const computed = computeFinalPlacements(t);
      expect(bracketPlacements(t.players, t.matches, computed), t.id).toEqual(computed);
    }
  });

  it("puts a recorded final first in a partial bracket", () => {
    // Top 4 whose second semifinal is missing: e won one semifinal, then lost the final to a.
    const players = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    const matches = [cutMatch(4, "e", "d", "p1"), cutMatch(5, "a", "e", "p1"), cutMatch(4, "a", "c", "p1")];
    const reported = new Map([["b", 1], ["c", 2], ["d", 3], ["e", 4], ["a", 5]]);
    expect([...bracketPlacements(players, matches, reported)]).toEqual([["a", 1], ["e", 2], ["c", 3], ["d", 4], ["b", 5]]);
  });
});
