import { getArchetype } from "@/lib/data/archetypes";
import { recordGames } from "@/lib/meta/stats";
import type { ArchetypeStats, TierId } from "@/lib/meta/types";

export type StatsSortKey =
  | "archetype"
  | "tier"
  | "entries"
  | "share"
  | "record"
  | "winRate"
  | "adjusted"
  | "topCut"
  | "conversion"
  | "lift"
  | "eventWins"
  | "points"
  | "score";

export type SortDirection = "asc" | "desc";

export interface StatsSort {
  key: StatsSortKey;
  direction: SortDirection;
}

export const DEFAULT_STATS_SORT: StatsSort = { key: "tier", direction: "asc" };

const TIER_RANK: Record<TierId, number> = { S: 0, A: 1, B: 2, C: 3, unranked: 4 };

/** Locale-independent comparison, so server and client sort identically. */
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const archetypeName = (id: string) => getArchetype(id)?.name ?? id;

const SORT_VALUE: Record<StatsSortKey, (row: ArchetypeStats) => number | string | null> = {
  archetype: (row) => archetypeName(row.archetypeId).toLowerCase(),
  tier: (row) => TIER_RANK[row.tier],
  entries: (row) => row.entries,
  share: (row) => row.metaShare,
  record: (row) => recordGames(row.record),
  winRate: (row) => row.winRate,
  adjusted: (row) => row.adjustedWinRate,
  topCut: (row) => row.topCut,
  conversion: (row) => row.conversionRate,
  lift: (row) => row.conversionLift,
  eventWins: (row) => row.eventWins,
  points: (row) => row.points,
  score: (row) => row.score,
};

/** Direction a column sorts in on its first click: names and tiers ascend, numbers descend. */
export function defaultDirection(key: StatsSortKey): SortDirection {
  return key === "archetype" || key === "tier" ? "asc" : "desc";
}

/** Clicking the active column flips it; another column starts in its default direction. */
export function nextSort(current: StatsSort, key: StatsSortKey): StatsSort {
  if (current.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: defaultDirection(key) };
}

/**
 * Sorted copy of the stats rows. Missing values (no matches → no win rate) always sink to
 * the bottom; ties fall back to score (highest first), then archetype id.
 */
export function sortStats(rows: readonly ArchetypeStats[], { key, direction }: StatsSort): ArchetypeStats[] {
  const value = SORT_VALUE[key];
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === null || vb === null) {
      if (va !== vb) return va === null ? 1 : -1;
    } else if (va !== vb) {
      return sign * (typeof va === "number" && typeof vb === "number" ? va - vb : compareText(String(va), String(vb)));
    }
    return b.score - a.score || compareText(a.archetypeId, b.archetypeId);
  });
}
