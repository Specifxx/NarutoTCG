import type { Tournament } from "@naruto-tcg/types";
import { aggregateTournament, compareAggregatesByDate, filterAggregates, mergeAggregates } from "@/lib/meta/aggregate";
import { TIER_CONFIG } from "@/lib/meta/config";
import { buildMatchupMatrix, topArchetypeIds } from "@/lib/meta/matchups";
import { fieldVsTopCut, metaShareByEvent, overallShare, type FieldVsTopCutRow, type OverallShareRow } from "@/lib/meta/share";
import { computeArchetypeStats, computeTrends, groupByTier, type ArchetypeTrend } from "@/lib/meta/stats";
import type {
  ArchetypeStats,
  MatchupMatrix,
  MetaAggregate,
  MetaFilter,
  MetaShareRow,
  TierConfig,
  TierId,
  TournamentAggregate,
} from "@/lib/meta/types";

/** Everything the meta pages render, computed from one filtered set of events. Plain JSON. */
export interface MetaSnapshot {
  /** The events that passed the filter, newest first. */
  aggregates: TournamentAggregate[];
  meta: MetaAggregate;
  stats: ArchetypeStats[];
  tiers: Record<TierId, ArchetypeStats[]>;
  matrix: MatchupMatrix;
  shareByEvent: MetaShareRow[];
  fieldVsTopCut: FieldVsTopCutRow[];
  overallShare: OverallShareRow[];
  trends: Record<string, ArchetypeTrend>;
  /** Dates of the oldest and newest included events; null when none passed the filter. */
  dateRange: { from: string; to: string } | null;
}

export interface SnapshotOptions {
  config?: TierConfig;
  /** Archetypes in the matchup matrix, most-played first, rogue excluded. Default 8. */
  matrixSize?: number;
  /** Matchup cells below this many games are flagged low-sample. Default 8. */
  minGames?: number;
  /** Events per trend window. Default 4. */
  recentEvents?: number;
}

/**
 * Builds a snapshot from per-event aggregates. The browser uses this directly to fold
 * locally imported events into the server-provided seed aggregates.
 */
export function deriveSnapshotFromAggregates(
  aggregates: readonly TournamentAggregate[],
  filter: MetaFilter = {},
  options: SnapshotOptions = {},
): MetaSnapshot {
  const { config = TIER_CONFIG, matrixSize = 8, minGames = 8, recentEvents = 4 } = options;
  const included = filterAggregates(aggregates, filter).sort((a, b) => compareAggregatesByDate(b, a));
  const meta = mergeAggregates(included);
  const stats = computeArchetypeStats(meta, config);
  const newest = included[0];
  const oldest = included[included.length - 1];

  return {
    aggregates: included,
    meta,
    stats,
    tiers: groupByTier(stats),
    matrix: buildMatchupMatrix(meta, topArchetypeIds(meta, matrixSize), { minGames }),
    shareByEvent: metaShareByEvent(included),
    fieldVsTopCut: fieldVsTopCut(meta),
    overallShare: overallShare(meta),
    trends: computeTrends(included, { recentEvents }),
    dateRange: newest && oldest ? { from: oldest.date, to: newest.date } : null,
  };
}

/** Aggregates raw tournaments, then derives the snapshot. */
export function buildMetaSnapshot(
  tournaments: readonly Tournament[],
  filter: MetaFilter = {},
  options: SnapshotOptions = {},
): MetaSnapshot {
  return deriveSnapshotFromAggregates(tournaments.map(aggregateTournament), filter, options);
}
