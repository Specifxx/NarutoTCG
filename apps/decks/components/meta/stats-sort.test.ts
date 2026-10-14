import { describe, expect, it } from "vitest";
import type { ArchetypeStats } from "@/lib/meta/types";
import { DEFAULT_STATS_SORT, defaultDirection, nextSort, sortStats } from "./stats-sort";

function row(archetypeId: string, overrides: Partial<ArchetypeStats>): ArchetypeStats {
  return {
    archetypeId,
    entries: 10,
    metaShare: 0.1,
    topCut: 1,
    topCutShare: 0.1,
    conversionRate: 0.1,
    conversionLift: 1,
    eventWins: 0,
    record: { wins: 5, losses: 5, draws: 0 },
    mirrorMatches: 0,
    winRate: 0.5,
    adjustedWinRate: 0.5,
    winRateInterval: [0.2, 0.8],
    points: 0,
    avgPercentile: 0.5,
    score: 50,
    tier: "B",
    ...overrides,
  };
}

const ROWS = [
  row("sand-gaara", { tier: "S", score: 72, entries: 103, winRate: 0.548, record: { wins: 50, losses: 40, draws: 2 } }),
  row("akatsuki-pain", { tier: "S", score: 72.4, entries: 140, winRate: 0.553, record: { wins: 60, losses: 50, draws: 0 } }),
  row("rogue", { tier: "unranked", score: 20, entries: 37, winRate: null, record: { wins: 0, losses: 0, draws: 0 } }),
  row("leaf-jonin", { tier: "B", score: 43, entries: 92, winRate: 0.484 }),
];

const ids = (rows: ArchetypeStats[]) => rows.map((r) => r.archetypeId);

describe("sortStats", () => {
  it("sorts by tier, then score, by default", () => {
    expect(ids(sortStats(ROWS, DEFAULT_STATS_SORT))).toEqual(["akatsuki-pain", "sand-gaara", "leaf-jonin", "rogue"]);
  });

  it("sorts numeric columns both ways", () => {
    expect(ids(sortStats(ROWS, { key: "entries", direction: "desc" }))).toEqual([
      "akatsuki-pain",
      "sand-gaara",
      "leaf-jonin",
      "rogue",
    ]);
    expect(ids(sortStats(ROWS, { key: "entries", direction: "asc" }))).toEqual([
      "rogue",
      "leaf-jonin",
      "sand-gaara",
      "akatsuki-pain",
    ]);
    expect(ids(sortStats(ROWS, { key: "record", direction: "desc" }))).toEqual([
      "akatsuki-pain",
      "sand-gaara",
      "leaf-jonin",
      "rogue",
    ]);
  });

  it("sorts by archetype name, not id", () => {
    // Leaf Jonin Midrange < Rogue / Other < Sand Coffin Gaara < Six Paths of Pain
    expect(ids(sortStats(ROWS, { key: "archetype", direction: "asc" }))).toEqual([
      "leaf-jonin",
      "rogue",
      "sand-gaara",
      "akatsuki-pain",
    ]);
  });

  it("keeps missing win rates last in either direction", () => {
    expect(ids(sortStats(ROWS, { key: "winRate", direction: "desc" })).at(-1)).toBe("rogue");
    expect(ids(sortStats(ROWS, { key: "winRate", direction: "asc" }))).toEqual([
      "leaf-jonin",
      "sand-gaara",
      "akatsuki-pain",
      "rogue",
    ]);
  });

  it("breaks ties by score then id, and never mutates the input", () => {
    const tied = [row("b", { score: 10 }), row("a", { score: 10 }), row("c", { score: 30 })];
    expect(ids(sortStats(tied, { key: "entries", direction: "desc" }))).toEqual(["c", "a", "b"]);
    expect(ids(tied)).toEqual(["b", "a", "c"]);
  });
});

describe("nextSort", () => {
  it("flips the active column and starts others in their default direction", () => {
    expect(nextSort(DEFAULT_STATS_SORT, "tier")).toEqual({ key: "tier", direction: "desc" });
    expect(nextSort(DEFAULT_STATS_SORT, "score")).toEqual({ key: "score", direction: "desc" });
    expect(nextSort({ key: "score", direction: "desc" }, "score")).toEqual({ key: "score", direction: "asc" });
    expect(defaultDirection("archetype")).toBe("asc");
  });
});
