import { describe, expect, it } from "vitest";
import { ROGUE_ID } from "@/lib/data/archetypes";
import { emptyCounts, mergeAggregates } from "./aggregate";
import { TIER_CONFIG } from "./config";
import { wilsonInterval } from "./math";
import { computeArchetypeStats, computeTrends, groupByTier, recordWinRate, tierForScore } from "./stats";
import type { ArchetypeCounts, MetaAggregate, TierConfig, TournamentAggregate } from "./types";

const counts = (partial: Partial<ArchetypeCounts>): ArchetypeCounts => ({ ...emptyCounts(), ...partial });

const metaOf = (playerCount: number, topCutSlots: number, archetypes: Record<string, ArchetypeCounts>): MetaAggregate => ({
  tournamentCount: 1,
  playerCount,
  topCutSlots,
  archetypes,
  matchups: {},
});

const eventAgg = (id: string, date: string, entries: Record<string, number>): TournamentAggregate => ({
  tournamentId: id,
  name: `Store Championship — ${id}`,
  date,
  tier: "store-championship",
  format: "Standard (NT01–NT03)",
  playerCount: Object.values(entries).reduce((s, n) => s + n, 0),
  topCutSize: 0,
  topCutSlots: 0,
  winnerArchetypeId: null,
  archetypes: Object.fromEntries(Object.entries(entries).map(([id, n]) => [id, counts({ entries: n })])),
  matchups: {},
});

/** Every number reachable from `value` is finite. */
function allFinite(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (value && typeof value === "object") return Object.values(value).every(allFinite);
  return true;
}

const byId = (stats: ReturnType<typeof computeArchetypeStats>) => Object.fromEntries(stats.map((s) => [s.archetypeId, s]));

describe("computeArchetypeStats", () => {
  it("derives shares, conversion, win rates and the composite score", () => {
    const meta = metaOf(100, 16, {
      x: counts({ entries: 50, topCut: 8, eventWins: 1, matches: { wins: 6, losses: 3, draws: 1 }, points: 300, percentileSum: 25 }),
      y: counts({ entries: 50, topCut: 8 }),
    });
    const x = byId(computeArchetypeStats(meta)).x!;
    expect(x.metaShare).toBe(0.5);
    expect(x.topCutShare).toBe(0.5);
    expect(x.conversionRate).toBe(0.16);
    expect(x.conversionLift).toBeCloseTo(1, 10);
    expect(x.winRate).toBeCloseTo(0.65, 10);
    expect(x.adjustedWinRate).toBeCloseTo((6.5 + 10) / 30, 10);
    expect(x.winRateInterval).toEqual(wilsonInterval(6.5, 10));
    expect(x.avgPercentile).toBe(0.5);
    expect(x).toMatchObject({ entries: 50, topCut: 8, eventWins: 1, points: 300, record: { wins: 6, losses: 3, draws: 1 } });
    // 0.5 * 0.75 (adjusted 55%) + 0.35 * 0.5 (lift 1) + 0.15 * 1 (share capped at 20%)
    expect(x.score).toBeCloseTo(70, 10);
    expect(x.tier).toBe("S");
  });

  it("gives a conversion lift of 1 to archetypes converting at the field baseline", () => {
    const meta = metaOf(400, 32, {
      a: counts({ entries: 100, topCut: 8 }),
      b: counts({ entries: 25, topCut: 2 }),
      c: counts({ entries: 275, topCut: 22 }),
    });
    for (const row of computeArchetypeStats(meta)) expect(row.conversionLift).toBeCloseTo(1, 10);
  });

  it("smooths small samples toward the baseline", () => {
    const meta = metaOf(100, 10, {
      hot: counts({ entries: 10, topCut: 10 }),
      cold: counts({ entries: 10, topCut: 0 }),
      rest: counts({ entries: 80 }),
    });
    const rows = byId(computeArchetypeStats(meta));
    expect(rows.hot!.conversionRate).toBe(1);
    expect(rows.hot!.conversionLift).toBeCloseTo((10 + 1) / 20 / 0.1, 10);
    expect(rows.cold!.conversionLift).toBeCloseTo(1 / 20 / 0.1, 10);
  });

  it("treats events without a cut as neutral for conversion", () => {
    const row = computeArchetypeStats(metaOf(50, 0, { a: counts({ entries: 50 }) }))[0]!;
    expect(row).toMatchObject({ topCutShare: 0, conversionRate: 0, conversionLift: 1 });
  });

  it("assigns tiers by inclusive thresholds", () => {
    expect(tierForScore(65)).toBe("S");
    expect(tierForScore(64.99)).toBe("A");
    expect(tierForScore(52)).toBe("A");
    expect(tierForScore(51.99)).toBe("B");
    expect(tierForScore(40)).toBe("B");
    expect(tierForScore(39.99)).toBe("C");

    const winRateOnly: TierConfig = {
      ...TIER_CONFIG,
      priorMatches: 0,
      minEntries: 1,
      minShare: 0,
      weights: { winRate: 1, conversion: 0, presence: 0 },
      scales: { ...TIER_CONFIG.scales, winRate: [0, 1] },
    };
    const meta = metaOf(40, 0, {
      c: counts({ entries: 10, matches: { wins: 30, losses: 70, draws: 0 } }),
      s: counts({ entries: 10, matches: { wins: 70, losses: 30, draws: 0 } }),
      b: counts({ entries: 10, matches: { wins: 45, losses: 55, draws: 0 } }),
      a: counts({ entries: 10, matches: { wins: 55, losses: 45, draws: 0 } }),
    });
    const stats = computeArchetypeStats(meta, winRateOnly);
    expect(stats.map((s) => [s.archetypeId, s.tier])).toEqual([["s", "S"], ["a", "A"], ["b", "B"], ["c", "C"]]);
  });

  it("leaves rogue and thinly played archetypes unranked and sorts them after ranked ones by entries", () => {
    const meta = metaOf(2000, 64, {
      [ROGUE_ID]: counts({ entries: 300, topCut: 20, matches: { wins: 200, losses: 100, draws: 0 } }),
      small: counts({ entries: 9, topCut: 9, matches: { wins: 40, losses: 2, draws: 0 } }),
      thin: counts({ entries: 15, topCut: 2 }),
      weak: counts({ entries: 200, topCut: 1, matches: { wins: 60, losses: 140, draws: 0 } }),
      strong: counts({ entries: 400, topCut: 25, matches: { wins: 500, losses: 380, draws: 20 } }),
      rest: counts({ entries: 1076, topCut: 7 }),
    });
    const stats = computeArchetypeStats(meta);
    const rows = byId(stats);
    expect(rows[ROGUE_ID]!.tier).toBe("unranked");
    expect(rows.small!.tier).toBe("unranked");
    expect(rows.thin!.tier).toBe("unranked");
    expect(rows.thin!.metaShare).toBeLessThan(TIER_CONFIG.minShare);
    expect(stats.map((s) => s.archetypeId)).toEqual(["strong", "rest", "weak", ROGUE_ID, "thin", "small"]);
    const ranked = stats.filter((s) => s.tier !== "unranked");
    for (const row of ranked) expect(row.tier).toBe(tierForScore(row.score));
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
  });

  it("never produces NaN, even for empty or degenerate input", () => {
    expect(computeArchetypeStats(mergeAggregates([]))).toEqual([]);
    const degenerate = metaOf(0, 0, { ghost: counts({}) });
    const noPriors: TierConfig = { ...TIER_CONFIG, priorMatches: 0, conversionPrior: 0 };
    for (const config of [TIER_CONFIG, noPriors]) {
      const [row] = computeArchetypeStats(degenerate, config);
      expect(allFinite(row)).toBe(true);
      expect(row).toMatchObject({ winRate: null, winRateInterval: null, tier: "unranked" });
    }
    expect(computeArchetypeStats(degenerate)[0]!.adjustedWinRate).toBe(0.5);
    expect(computeArchetypeStats(degenerate, noPriors)[0]!.adjustedWinRate).toBe(0.5);
  });
});

describe("recordWinRate", () => {
  it("counts draws as half and returns null without games", () => {
    expect(recordWinRate({ wins: 1, losses: 1, draws: 2 })).toBe(0.5);
    expect(recordWinRate({ wins: 0, losses: 0, draws: 0 })).toBeNull();
  });
});

describe("groupByTier", () => {
  it("returns all five tiers and keeps the input order", () => {
    const meta = metaOf(1000, 64, {
      a: counts({ entries: 300, topCut: 30, matches: { wins: 300, losses: 200, draws: 0 } }),
      b: counts({ entries: 300, topCut: 20, matches: { wins: 260, losses: 240, draws: 0 } }),
      c: counts({ entries: 395, topCut: 14, matches: { wins: 200, losses: 320, draws: 0 } }),
      [ROGUE_ID]: counts({ entries: 5 }),
    });
    const stats = computeArchetypeStats(meta);
    const groups = groupByTier(stats);
    expect(Object.keys(groups).sort()).toEqual(["A", "B", "C", "S", "unranked"]);
    expect(Object.values(groups).flat()).toHaveLength(stats.length);
    for (const [tier, rows] of Object.entries(groups)) {
      expect(rows.every((r) => r.tier === tier)).toBe(true);
      expect(rows).toEqual(stats.filter((s) => s.tier === tier));
    }
    expect(groupByTier([])).toEqual({ S: [], A: [], B: [], C: [], unranked: [] });
  });
});

describe("computeTrends", () => {
  const older = [1, 2, 3, 4].map((d) => eventAgg(`e${d}`, `2026-01-0${d}`, { x: 25, y: 75 }));
  const newer = [5, 6, 7, 8].map((d) => eventAgg(`e${d}`, `2026-01-0${d}`, { x: 50, y: 40, z: 10 }));
  const aggs = [newer[2]!, older[1]!, newer[0]!, older[3]!, newer[3]!, older[0]!, newer[1]!, older[2]!];

  it("compares the latest window with the one before it, regardless of input order", () => {
    const trends = computeTrends(aggs);
    expect(trends.x!.recentShare).toBe(0.5);
    expect(trends.x!.previousShare).toBe(0.25);
    expect(trends.x!.delta).toBeCloseTo(0.25, 10);
    expect(trends.y!.delta).toBeCloseTo(-0.35, 10);
    expect(trends.z).toEqual({ recentShare: 0.1, previousShare: 0, delta: 0.1 });
  });

  it("supports other window sizes and pools by player count", () => {
    expect(computeTrends(aggs, { recentEvents: 2 }).x!.delta).toBe(0);
    const pooled = computeTrends(
      [
        eventAgg("old-a", "2026-01-30", { x: 5, y: 5 }),
        eventAgg("old-b", "2026-02-01", { x: 5, y: 5 }),
        eventAgg("big", "2026-02-03", { x: 90, y: 10 }),
        eventAgg("small", "2026-02-02", { y: 20 }),
      ],
      { recentEvents: 2 },
    );
    // Pooled 90 / 120, not the mean of the per-event shares (0.9 + 0) / 2.
    expect(pooled.x!.recentShare).toBe(0.75);
    expect(pooled.x!.previousShare).toBe(0.5);
    const two = computeTrends([eventAgg("old", "2026-02-01", { y: 20 }), eventAgg("big", "2026-02-03", { x: 90, y: 10 })], { recentEvents: 1 });
    expect(two.x).toEqual({ recentShare: 0.9, previousShare: 0, delta: 0.9 });
    expect(two.y!.previousShare).toBe(1);
  });

  it("is empty without enough events to compare", () => {
    expect(computeTrends(newer)).toEqual({});
    expect(computeTrends([])).toEqual({});
  });

  it("never compares the latest window with a partial one", () => {
    // 5 to 7 events leave the previous window with 1 to 3 events: no trend rather than a lopsided one.
    for (const count of [5, 6, 7]) {
      const some = [...older.slice(4 - (count - 4)), ...newer];
      expect(some, `${count} events`).toHaveLength(count);
      expect(computeTrends(some), `${count} events`).toEqual({});
    }
    expect(computeTrends([...older.slice(1), ...newer], { recentEvents: 4 })).toEqual({});
    expect(Object.keys(computeTrends(aggs, { recentEvents: 4 }))).not.toHaveLength(0);
    expect(computeTrends(aggs.slice(0, 3), { recentEvents: 2 })).toEqual({});
    expect(computeTrends(aggs.slice(0, 4), { recentEvents: 2 })).not.toEqual({});
  });

  it("does not read archetypes missing from a window off the object prototype", () => {
    const trends = computeTrends([eventAgg("old", "2026-01-01", { constructor: 4, x: 4 }), eventAgg("new", "2026-01-02", { x: 8 })], {
      recentEvents: 1,
    });
    expect(trends.constructor).toEqual({ recentShare: 0, previousShare: 0.5, delta: -0.5 });
    expect(allFinite(trends)).toBe(true);
  });
});
