import type { ArchetypeTrend } from "@/lib/meta/stats";
import type { ArchetypeStats, TierId } from "@/lib/meta/types";

/** Share changes within ±half a point read as steady (matches the meta page). */
export const TREND_NEUTRAL = 0.005;
/** Events per trend window in the seed snapshot (the snapshot's default). */
export const TREND_EVENTS = 4;

export type TrendDirection = "up" | "down" | "flat";

/** Direction of a meta share change; anything within ±`threshold` is flat. */
export function trendDirection(delta: number, threshold: number = TREND_NEUTRAL): TrendDirection {
  if (delta > threshold) return "up";
  if (delta < -threshold) return "down";
  return "flat";
}

/** One archetype tile in the overview's tier snapshot. */
export interface TierHighlight {
  archetypeId: string;
  tier: TierId;
  adjustedWinRate: number;
  metaShare: number;
  entries: number;
  /** Null when the selection is too short to compare two windows. */
  trend: { delta: number; direction: TrendDirection } | null;
}

/** Archetypes of the given tiers (S and A by default), tier order then score order. */
export function tierHighlights(
  tiers: Record<TierId, readonly ArchetypeStats[]>,
  trends: Record<string, ArchetypeTrend>,
  include: readonly TierId[] = ["S", "A"],
): TierHighlight[] {
  return include.flatMap((tier) =>
    (tiers[tier] ?? []).map((stat) => {
      const trend = Object.hasOwn(trends, stat.archetypeId) ? trends[stat.archetypeId] : undefined;
      return {
        archetypeId: stat.archetypeId,
        tier: stat.tier,
        adjustedWinRate: stat.adjustedWinRate,
        metaShare: stat.metaShare,
        entries: stat.entries,
        trend: trend ? { delta: trend.delta, direction: trendDirection(trend.delta) } : null,
      };
    }),
  );
}
