import type { MatchRecord } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import {
  computeFinalPlacements,
  computeRecords,
  computeSwissStandings,
  formatRecord,
  ordinal,
  placementLabel,
  topCutRounds,
} from "./standings";

const m = (round: number, p1: string, p2: string | null, outcome: MatchRecord["outcome"], extra: Partial<MatchRecord> = {}): MatchRecord => ({
  round,
  stage: "swiss",
  player1Id: p1,
  player2Id: p2,
  outcome,
  ...extra,
});

describe("computeRecords", () => {
  it("counts wins, losses, draws, byes and intentional draws", () => {
    const records = computeRecords([
      m(1, "a", "b", "p1"),
      m(1, "c", null, "bye"),
      m(2, "a", "c", "draw", { intentionalDraw: true }),
      m(2, "b", null, "bye"),
    ]);
    expect(records.get("a")).toEqual({ wins: 1, losses: 0, draws: 1, byes: 0, intentionalDraws: 1 });
    expect(records.get("b")).toEqual({ wins: 1, losses: 1, draws: 0, byes: 1, intentionalDraws: 0 });
    expect(records.get("c")).toEqual({ wins: 1, losses: 0, draws: 1, byes: 1, intentionalDraws: 1 });
  });

  it("filters by stage and round", () => {
    const matches = [m(1, "a", "b", "p1"), m(2, "a", "b", "p2"), m(3, "a", "b", "p1", { stage: "top-cut" })];
    expect(computeRecords(matches, { throughRound: 1 }).get("a")!.wins).toBe(1);
    expect(computeRecords(matches, { stage: "swiss" }).get("a")).toMatchObject({ wins: 1, losses: 1 });
    expect(computeRecords(matches, { stage: "top-cut" }).get("b")).toMatchObject({ wins: 0, losses: 1 });
  });
});

describe("computeSwissStandings", () => {
  // Four players, two rounds. a: 2-0, b: 1-1 (beat d), c: 1-1 (beat d), d: 0-2.
  const players = ["a", "b", "c", "d"].map((id) => ({ id }));
  const matches = [m(1, "a", "b", "p1"), m(1, "c", "d", "p1"), m(2, "a", "c", "p1"), m(2, "b", "d", "p1")];

  it("orders by match points then OMW%", () => {
    const rows = computeSwissStandings(players, matches);
    expect(rows.map((r) => r.playerId)).toEqual(["a", "b", "c", "d"]);
    const byId = Object.fromEntries(rows.map((r) => [r.playerId, r]));
    // b and c are both 1-1 (3 points). b's opponents: a (1.0), d (floored 0.33). c's: d (0.33), a (1.0). Tie on OMW.
    expect(byId.b!.omw).toBeCloseTo((1 + 0.33) / 2, 6);
    expect(byId.c!.omw).toBeCloseTo((1 + 0.33) / 2, 6);
    expect(byId.a!.matchPoints).toBe(6);
    expect(byId.d!.mwp).toBeCloseTo(0.33, 6); // floored from 0
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("never treats a bye as an opponent but counts it toward the player's own MWP", () => {
    const rows = computeSwissStandings(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [m(1, "a", "b", "p1"), m(1, "c", null, "bye")],
    );
    const c = rows.find((r) => r.playerId === "c")!;
    expect(c.mwp).toBe(1);
    expect(c.omw).toBeCloseTo(0.33, 6); // no real opponents → floor
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.omw).toBeCloseTo(0.33, 6); // b is 0-1 → floored
  });

  it("only counts Swiss matches and respects throughRound", () => {
    const withCut = [...matches, m(3, "d", "a", "p1", { stage: "top-cut" })];
    const rows = computeSwissStandings(players, withCut);
    expect(rows.find((r) => r.playerId === "d")!.record.wins).toBe(0);
    const afterOne = computeSwissStandings(players, matches, { throughRound: 1 });
    expect(afterOne.find((r) => r.playerId === "b")!.record.losses).toBe(1);
    expect(afterOne.find((r) => r.playerId === "b")!.record.wins).toBe(0);
  });
});

describe("computeFinalPlacements", () => {
  const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];
  const players = ids.map((id) => ({ id, name: id, archetypeId: "rogue", placement: 0 }));
  // Swiss after tiebreakers: p1, p3 (2-0), p2, p4 (1-1), p6, p5 (0-2; p6 played stronger opponents).
  const swiss: MatchRecord[] = [
    m(1, "p1", "p6", "p1"),
    m(1, "p2", "p5", "p1"),
    m(1, "p3", "p4", "p1"),
    m(2, "p1", "p2", "p1"),
    m(2, "p3", "p6", "p1"),
    m(2, "p4", "p5", "p1"),
  ];
  // Top 4: p1 v p4, p2 v p3; final p4 v p3 → p3 wins.
  const cut: MatchRecord[] = [
    m(3, "p1", "p4", "p2", { stage: "top-cut" }),
    m(3, "p2", "p3", "p2", { stage: "top-cut" }),
    m(4, "p4", "p3", "p2", { stage: "top-cut" }),
  ];

  it("ranks the cut by elimination round, then Swiss rank, then the rest by Swiss", () => {
    const placements = computeFinalPlacements({ players, matches: [...swiss, ...cut], topCutSize: 4 });
    expect(placements.get("p3")).toBe(1);
    expect(placements.get("p4")).toBe(2);
    // Semifinal losers p1 and p2 ordered by Swiss rank.
    expect(placements.get("p1")).toBe(3);
    expect(placements.get("p2")).toBe(4);
    expect(placements.get("p6")).toBe(5);
    expect(placements.get("p5")).toBe(6);
  });

  it("falls back to Swiss rank without a cut", () => {
    const placements = computeFinalPlacements({ players, matches: swiss, topCutSize: 0 });
    expect([...placements.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
      "p1", "p3", "p2", "p4", "p6", "p5",
    ]);
  });
});

describe("labels", () => {
  it("formats records, ordinals and placement labels", () => {
    expect(formatRecord({ wins: 6, losses: 2, draws: 0 })).toBe("6-2");
    expect(formatRecord({ wins: 6, losses: 2, draws: 1 })).toBe("6-2-1");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "103rd",
    ]);
    expect(placementLabel(1, 8)).toBe("Winner");
    expect(placementLabel(2, 8)).toBe("Finalist");
    expect(placementLabel(3, 8)).toBe("Top 4");
    expect(placementLabel(7, 8)).toBe("Top 8");
    expect(placementLabel(12, 16)).toBe("Top 16");
    expect(placementLabel(9, 8)).toBe("9th");
    expect(topCutRounds(8)).toBe(3);
    expect(topCutRounds(16)).toBe(4);
    expect(topCutRounds(0)).toBe(0);
  });
});
