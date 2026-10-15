import { ROGUE_ID } from "@/lib/data/archetypes";
import { compareAggregatesByDate, mergeAggregates } from "@/lib/meta/aggregate";
import { TIER_CONFIG } from "@/lib/meta/config";
import { linearScale, safeDivide, wilsonInterval } from "@/lib/meta/math";
import type { ArchetypeStats, MetaAggregate, TierConfig, TierId, TournamentAggregate, WLD } from "@/lib/meta/types";

/** Change in pooled meta share between the latest events and the window before them. */
export interface ArchetypeTrend {
  recentShare: number;
  previousShare: number;
  /** recentShare - previousShare */
  delta: number;
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function recordGames(record: WLD): number {
  return record.wins + record.losses + record.draws;
}

/** (wins + draws / 2) / games; null without games. */
export function recordWinRate(record: WLD): number | null {
  const games = recordGames(record);
  return games > 0 ? (record.wins + record.draws / 2) / games : null;
}

/** Wilson interval on a record's win rate (draws count half); null without games. */
export function recordInterval(record: WLD): [number, number] | null {
  const games = recordGames(record);
  return games > 0 ? wilsonInterval(record.wins + record.draws / 2, games) : null;
}

/** Tier for a ranked archetype's composite score; thresholds are inclusive lower bounds. */
export function tierForScore(score: number, config: TierConfig = TIER_CONFIG): Exclude<TierId, "unranked"> {
  if (score >= config.thresholds.S) return "S";
  if (score >= config.thresholds.A) return "A";
  if (score >= config.thresholds.B) return "B";
  return "C";
}

/**
 * Per-archetype statistics and tiers. The composite score blends the win rate shrunk toward
 * 50%, the top cut conversion lift (smoothed toward the field baseline) and meta share.
 * Rogue and thinly played archetypes are "unranked". Ranked rows come first by score, then
 * unranked rows by entries.
 */
export function computeArchetypeStats(meta: MetaAggregate, config: TierConfig = TIER_CONFIG): ArchetypeStats[] {
  const { weights, scales } = config;
  const baseline = safeDivide(meta.topCutSlots, meta.playerCount);

  const stats = Object.entries(meta.archetypes).map(([archetypeId, counts]): ArchetypeStats => {
    const record: WLD = { ...counts.matches };
    const games = recordGames(record);
    const metaShare = safeDivide(counts.entries, meta.playerCount);
    const smoothedConversion = safeDivide(counts.topCut + config.conversionPrior * baseline, counts.entries + config.conversionPrior);
    const conversionLift = baseline > 0 ? smoothedConversion / baseline : 1;
    const adjustedWinRate =
      games + config.priorMatches > 0
        ? (record.wins + record.draws / 2 + config.priorMatches * 0.5) / (games + config.priorMatches)
        : 0.5;
    const score =
      100 *
      (weights.winRate * linearScale(adjustedWinRate, scales.winRate) +
        weights.conversion * linearScale(conversionLift, scales.conversionLift) +
        weights.presence * linearScale(metaShare, scales.metaShare));
    const ranked = archetypeId !== ROGUE_ID && counts.entries >= config.minEntries && metaShare >= config.minShare;

    return {
      archetypeId,
      entries: counts.entries,
      metaShare,
      topCut: counts.topCut,
      topCutShare: safeDivide(counts.topCut, meta.topCutSlots),
      conversionRate: safeDivide(counts.topCut, counts.entries),
      conversionLift,
      eventWins: counts.eventWins,
      record,
      mirrorMatches: counts.mirrorMatches,
      winRate: recordWinRate(record),
      adjustedWinRate,
      winRateInterval: recordInterval(record),
      points: counts.points,
      avgPercentile: safeDivide(counts.percentileSum, counts.entries),
      score,
      tier: ranked ? tierForScore(score, config) : "unranked",
    };
  });

  const ranked = stats
    .filter((s) => s.tier !== "unranked")
    .sort((a, b) => b.score - a.score || b.entries - a.entries || compareIds(a.archetypeId, b.archetypeId));
  const unranked = stats
    .filter((s) => s.tier === "unranked")
    .sort((a, b) => b.entries - a.entries || compareIds(a.archetypeId, b.archetypeId));
  return [...ranked, ...unranked];
}

/** Buckets stats by tier, keeping their order; every tier key is present. */
export function groupByTier(stats: readonly ArchetypeStats[]): Record<TierId, ArchetypeStats[]> {
  const groups: Record<TierId, ArchetypeStats[]> = { S: [], A: [], B: [], C: [], unranked: [] };
  for (const row of stats) groups[row.tier].push(row);
  return groups;
}

/**
 * Pooled meta share over the `recentEvents` most recent events versus the same number of
 * events before them. Empty unless both windows are full (at least `2 × recentEvents` events),
 * so a trend never compares the latest window with a smaller one, and empty when either window
 * has no players (nothing to compare).
 */
export function computeTrends(
  aggregates: readonly TournamentAggregate[],
  { recentEvents = 4 }: { recentEvents?: number } = {},
): Record<string, ArchetypeTrend> {
  const window = Math.max(1, Math.floor(recentEvents));
  if (aggregates.length < 2 * window) return {};
  const newestFirst = [...aggregates].sort((a, b) => compareAggregatesByDate(b, a));
  const recent = mergeAggregates(newestFirst.slice(0, window));
  const previous = mergeAggregates(newestFirst.slice(window, 2 * window));
  if (recent.playerCount === 0 || previous.playerCount === 0) return {};

  const ids = new Set([...Object.keys(recent.archetypes), ...Object.keys(previous.archetypes)]);
  const share = (meta: MetaAggregate, id: string) =>
    Object.hasOwn(meta.archetypes, id) ? safeDivide(meta.archetypes[id].entries, meta.playerCount) : 0;
  return Object.fromEntries(
    [...ids].map((id) => {
      const recentShare = share(recent, id);
      const previousShare = share(previous, id);
      return [id, { recentShare, previousShare, delta: recentShare - previousShare }];
    }),
  );
}
