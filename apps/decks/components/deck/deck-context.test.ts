import { describe, expect, it } from "vitest";
import type { MatchupGuide } from "@/lib/data/guides";
import { emptyCounts } from "@/lib/meta/aggregate";
import { buildMatchupMatrix } from "@/lib/meta/matchups";
import type { ArchetypeCounts, MetaAggregate } from "@/lib/meta/types";
import { buildMatchupEntries, matchupRowFor } from "./deck-context";

const counts = (entries: number): ArchetypeCounts => ({ ...emptyCounts(), entries });

const META: MetaAggregate = {
  tournamentCount: 3,
  playerCount: 100,
  topCutSlots: 16,
  archetypes: { a: counts(40), b: counts(30), c: counts(20), x: counts(6), rogue: counts(4) },
  matchups: {
    "a|b": { wins: 12, losses: 8, draws: 0 },
    "b|a": { wins: 8, losses: 12, draws: 0 },
    "x|a": { wins: 2, losses: 1, draws: 0 },
    "a|x": { wins: 1, losses: 2, draws: 0 },
    "x|b": { wins: 5, losses: 5, draws: 2 },
    "b|x": { wins: 5, losses: 5, draws: 2 },
  },
};

const MATRIX = buildMatchupMatrix(META, ["a", "b", "c"], { minGames: 8 });

const guideFor = (archetypeId: string, opponentId: string): MatchupGuide => ({
  archetypeId,
  opponentId,
  summary: `${archetypeId} vs ${opponentId}`,
  keys: [],
  mulligan: "",
  source: "generated",
});

describe("matchupRowFor", () => {
  it("reuses the snapshot row for a charted archetype", () => {
    expect(matchupRowFor("b", META, MATRIX)).toBe(MATRIX.cells[1]);
  });

  it("computes a row against the most-played archetypes otherwise", () => {
    const row = matchupRowFor("x", META, MATRIX);
    expect(row.map((cell) => cell.opponentId)).toEqual(["x", "a", "b", "c"]);
    expect(row[0].mirror).toBe(true);
    expect(row.every((cell) => cell.archetypeId === "x")).toBe(true);
  });

  it("appends extra opponents the row lacks, once", () => {
    const row = matchupRowFor("a", META, MATRIX, ["x", "b", "x", "a"]);
    expect(row.map((cell) => cell.opponentId)).toEqual(["a", "b", "c", "x"]);
  });
});

describe("buildMatchupEntries", () => {
  it("skips the mirror, orders by opponent popularity and carries numbers and guides", () => {
    const entries = buildMatchupEntries({ archetypeId: "x", meta: META, matrix: MATRIX, guideFor });
    expect(entries.map((e) => e.opponentId)).toEqual(["a", "b", "c"]);
    const [vsA, vsB, vsC] = entries;
    expect(vsA.record).toEqual({ wins: 2, losses: 1, draws: 0 });
    expect(vsA.games).toBe(3);
    expect(vsA.winRate).toBeCloseTo(2 / 3);
    expect(vsA.lowSample).toBe(true);
    expect(vsA.opponentShare).toBeCloseTo(0.4);
    expect(vsA.guide?.summary).toBe("x vs a");
    expect(vsB.winRate).toBeCloseTo(0.5);
    expect(vsB.lowSample).toBe(false);
    expect(vsC.games).toBe(0);
    expect(vsC.winRate).toBeNull();
  });

  it("includes opponents from the author's notes in popularity order", () => {
    const entries = buildMatchupEntries({ archetypeId: "b", meta: META, matrix: MATRIX, guideFor, extraOpponentIds: ["x"] });
    expect(entries.map((e) => e.opponentId)).toEqual(["a", "c", "x"]);
  });

  it("is plain JSON", () => {
    const entries = buildMatchupEntries({ archetypeId: "a", meta: META, matrix: MATRIX, guideFor });
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries);
  });
});
