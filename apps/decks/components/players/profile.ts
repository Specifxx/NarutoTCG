import { getArchetype } from "@/lib/data/archetypes";
import { EVENT_TIER_ORDER } from "@/lib/format";
import { recordWinRate } from "@/lib/meta/stats";
import type { PlayerResult, PlayerTotals } from "@/lib/players/profiles";

/** Derived numbers for /players/[handle]. Pure, so the page stays a thin server component. */

export interface ArchetypeRow {
  archetypeId: string;
  name: string;
  count: number;
  /** Share of the player's events, 0..1. */
  share: number;
  /** Bar length relative to the most played archetype, 0..1. */
  scale: number;
}

/** Archetypes by events played (most first, then by name), with share and bar scale. */
export function archetypeRows(counts: Record<string, number>): ArchetypeRow[] {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const max = entries.reduce((most, [, count]) => Math.max(most, count), 0);
  return entries
    .map(([archetypeId, count]) => ({
      archetypeId,
      name: getArchetype(archetypeId)?.name ?? archetypeId,
      count,
      share: total > 0 ? count / total : 0,
      scale: max > 0 ? count / max : 0,
    }))
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Match win rate over every recorded match, draws counting half (byes count as wins); null without matches. */
export function matchWinRate(totals: Pick<PlayerTotals, "wins" | "losses" | "draws">): number | null {
  return recordWinRate(totals);
}

/** Negative when `a` is the better finish: lower placement, then event prestige, field size, newest. */
function compareFinish(a: PlayerResult, b: PlayerResult): number {
  return (
    a.placement - b.placement ||
    EVENT_TIER_ORDER.indexOf(a.tier) - EVENT_TIER_ORDER.indexOf(b.tier) ||
    b.playerCount - a.playerCount ||
    (a.date > b.date ? -1 : a.date < b.date ? 1 : 0)
  );
}

/**
 * The player's best finish: lowest placement, ties broken by event prestige, then field size,
 * then the newest event. Null without results.
 */
export function bestResult(results: readonly PlayerResult[]): PlayerResult | null {
  return results.reduce<PlayerResult | null>((best, result) => (!best || compareFinish(result, best) < 0 ? result : best), null);
}
