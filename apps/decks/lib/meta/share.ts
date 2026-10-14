import { CHARTED_ARCHETYPES, getArchetype } from "@/lib/data/archetypes";
import { compareAggregatesByDate } from "@/lib/meta/aggregate";
import { safeDivide } from "@/lib/meta/math";
import type { ArchetypeCounts, MetaAggregate, MetaShareRow, TournamentAggregate } from "@/lib/meta/types";

/** Series that folds every archetype without a chart slot, rogue included. */
export const OTHER_SERIES_ID = "other";

export interface FieldVsTopCutRow {
  seriesId: string;
  label: string;
  /** Share of all entries, 0..1 */
  fieldShare: number;
  /** Share of all top cut slots, 0..1 */
  topCutShare: number;
}

export interface OverallShareRow {
  seriesId: string;
  label: string;
  entries: number;
  /** entries / total players, 0..1 */
  share: number;
}

const CHARTED_IDS: ReadonlySet<string> = new Set(CHARTED_ARCHETYPES.map((a) => a.id));

/** Separators in event names, e.g. "Store Championship — Riverside". */
const NAME_SEPARATOR = /\s+[—–-]\s+|:\s+/;
const TIER_PHRASE = /\b(?:store|regional|national)\s+championships?\b|\bregionals\b|\bnationals\b/i;
/** Tier phrases and four-digit years, removed from labels. */
const LABEL_NOISE = new RegExp(`${TIER_PHRASE.source}|\\b(?:19|20)\\d{2}\\b`, "gi");

/** Charted archetype ids in slot order, then {@link OTHER_SERIES_ID}: the stack and legend order. */
export function chartSeriesIds(): string[] {
  return [...CHARTED_ARCHETYPES.map((a) => a.id), OTHER_SERIES_ID];
}

/** The chart series an archetype is drawn in. */
export function seriesIdFor(archetypeId: string): string {
  return CHARTED_IDS.has(archetypeId) ? archetypeId : OTHER_SERIES_ID;
}

/** Legend label: the archetype short name, or "Other". */
export function seriesLabel(seriesId: string): string {
  return seriesId === OTHER_SERIES_ID ? "Other" : (getArchetype(seriesId)?.shortName ?? seriesId);
}

/**
 * Compact axis label for an event, without tier phrases or years. When the part before a
 * separator names the tier, the part after it (the city) is kept: "Konoha Regional
 * Championship — Seattle 2026" → "Seattle". Otherwise the leading part is kept:
 * "Hokage Cup — North America National Championship 2026" → "Hokage Cup",
 * "Shinobi Online Open #3" → itself.
 */
export function shortEventLabel(name: string): string {
  const parts = name.split(NAME_SEPARATOR);
  const kept = parts.length > 1 && TIER_PHRASE.test(parts[0]!) ? parts.slice(1).join(" — ") : parts[0]!;
  return kept.replace(LABEL_NOISE, "").replace(/\s{2,}/g, " ").trim() || name;
}

function seriesTotals(archetypes: Record<string, ArchetypeCounts>, value: (counts: ArchetypeCounts) => number): Map<string, number> {
  const totals = new Map(chartSeriesIds().map((id) => [id, 0]));
  for (const [id, counts] of Object.entries(archetypes)) {
    const series = seriesIdFor(id);
    totals.set(series, totals.get(series)! + value(counts));
  }
  return totals;
}

/** One row per event, oldest first, with every series' share of that event's field (sums to 1). */
export function metaShareByEvent(aggregates: readonly TournamentAggregate[]): MetaShareRow[] {
  return [...aggregates].sort(compareAggregatesByDate).map((aggregate) => ({
    tournamentId: aggregate.tournamentId,
    label: shortEventLabel(aggregate.name),
    date: aggregate.date,
    playerCount: aggregate.playerCount,
    shares: Object.fromEntries(
      [...seriesTotals(aggregate.archetypes, (c) => c.entries)].map(([id, n]) => [id, safeDivide(n, aggregate.playerCount)]),
    ),
  }));
}

/** Each series' share of the field next to its share of top cut slots. */
export function fieldVsTopCut(meta: MetaAggregate): FieldVsTopCutRow[] {
  const field = seriesTotals(meta.archetypes, (c) => c.entries);
  const cut = seriesTotals(meta.archetypes, (c) => c.topCut);
  return chartSeriesIds().map((seriesId) => ({
    seriesId,
    label: seriesLabel(seriesId),
    fieldShare: safeDivide(field.get(seriesId)!, meta.playerCount),
    topCutShare: safeDivide(cut.get(seriesId)!, meta.topCutSlots),
  }));
}

/** Entries and share per series for the overall meta pie. */
export function overallShare(meta: MetaAggregate): OverallShareRow[] {
  const field = seriesTotals(meta.archetypes, (c) => c.entries);
  return chartSeriesIds().map((seriesId) => ({
    seriesId,
    label: seriesLabel(seriesId),
    entries: field.get(seriesId)!,
    share: safeDivide(field.get(seriesId)!, meta.playerCount),
  }));
}
