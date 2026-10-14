import type { Tournament } from "@naruto-tcg/types";
import { ROGUE_ID } from "@/lib/data/archetypes";
import { formatPercent } from "@/lib/format";
import { isIsoDate } from "@/lib/ingest/text";
import { aggregateTournament } from "@/lib/meta/aggregate";
import { TIER_CONFIG } from "@/lib/meta/config";
import { OTHER_SERIES_ID, chartSeriesIds, type FieldVsTopCutRow, type OverallShareRow } from "@/lib/meta/share";
import { recordGames } from "@/lib/meta/stats";
import type { ArchetypeStats, MatchupCell, MetaAggregate, TierConfig, TournamentAggregate } from "@/lib/meta/types";

/** Matchup cells below this many games are flagged low-sample. */
export const MATRIX_MIN_GAMES = 8;
/** Archetypes shown in the matchup matrix, selectable on the page. */
export const MATRIX_SIZES = [6, 8, 10] as const;
export const DEFAULT_MATRIX_SIZE = 8;
/** Events per trend window (latest N events vs the N before them). */
export const TREND_EVENTS = 4;
/** Share changes smaller than this (in share units, 0.005 = 0.5 points) read as flat. */
export const TREND_NEUTRAL = 0.005;
/** Named slices in the meta share donut; everything else folds into "Other". */
export const DONUT_SLICES = 5;

/** Locale-independent comparison, so server and client sort identically. */
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * True when an imported event (already sanitized by the imports store, so its tier, players and
 * matches are usable) can be placed in the meta: its date is a real YYYY-MM-DD date, or an ISO
 * timestamp on one. The date presets and trend windows depend on it.
 */
export function isMetaReady(tournament: Pick<Tournament, "date">): boolean {
  const { date } = tournament;
  return isIsoDate(date.slice(0, 10)) && (date.length === 10 || date[10] === "T");
}

/** Aggregates this browser's meta-ready imported events, skipping any that still fail to aggregate. */
export function aggregateImported(tournaments: readonly Tournament[]): TournamentAggregate[] {
  const aggregates: TournamentAggregate[] = [];
  for (const tournament of tournaments) {
    try {
      if (!isMetaReady(tournament)) continue;
      // A timestamp is placed on its day, like every other event date in the meta.
      const date = tournament.date.slice(0, 10);
      aggregates.push(aggregateTournament(date === tournament.date ? tournament : { ...tournament, date }));
    } catch {
      // A malformed import must never take the meta page down.
    }
  }
  return aggregates;
}

/**
 * Seed aggregates plus imported ones, deduplicated by tournament id. Seed events win over
 * imports with the same id; among imports the first occurrence wins.
 */
export function mergeImportedAggregates(
  seed: readonly TournamentAggregate[],
  imported: readonly TournamentAggregate[],
): TournamentAggregate[] {
  const seen = new Set(seed.map((a) => a.tournamentId));
  const merged = [...seed];
  for (const aggregate of imported) {
    if (seen.has(aggregate.tournamentId)) continue;
    seen.add(aggregate.tournamentId);
    merged.push(aggregate);
  }
  return merged;
}

/** ISO date of the newest event, or null without events. */
export function newestEventDate(aggregates: readonly TournamentAggregate[]): string | null {
  let newest: string | null = null;
  for (const a of aggregates) if (newest === null || a.date > newest) newest = a.date;
  return newest;
}

/** Distinct formats, the one with the most recent event first. */
export function availableFormats(aggregates: readonly TournamentAggregate[]): string[] {
  const latest = new Map<string, string>();
  for (const a of aggregates) {
    if (!a.format) continue;
    const seen = latest.get(a.format);
    if (seen === undefined || a.date > seen) latest.set(a.format, a.date);
  }
  return [...latest].sort(([fa, da], [fb, db]) => compareText(db, da) || compareText(fa, fb)).map(([format]) => format);
}

/** Matches played, each counted once: non-mirror matches plus mirrors. Byes and intentional draws are never counted. */
export function countMatches(meta: MetaAggregate): number {
  let nonMirrorSides = 0;
  let mirrors = 0;
  for (const counts of Object.values(meta.archetypes)) {
    nonMirrorSides += recordGames(counts.matches);
    mirrors += counts.mirrorMatches;
  }
  return nonMirrorSides / 2 + mirrors;
}

/**
 * Donut slices: the `keep` largest named series in chart order, with every other series
 * (and the existing "Other") folded into one trailing "Other" slice. Empty slices are dropped,
 * so the donut never exceeds `keep + 1` segments.
 */
export function sliceDonut(
  rows: readonly OverallShareRow[],
  keep: number = DONUT_SLICES,
): { slices: OverallShareRow[]; folded: string[] } {
  const order = chartSeriesIds();
  const rank = (id: string) => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  const named = rows.filter((r) => r.seriesId !== OTHER_SERIES_ID && r.entries > 0);
  const kept = new Set(
    [...named]
      .sort((a, b) => b.entries - a.entries || rank(a.seriesId) - rank(b.seriesId))
      .slice(0, Math.max(0, keep))
      .map((r) => r.seriesId),
  );
  const slices = named.filter((r) => kept.has(r.seriesId)).sort((a, b) => rank(a.seriesId) - rank(b.seriesId));
  const rest = rows.filter((r) => !kept.has(r.seriesId));
  const other = rest.reduce((sum, r) => ({ ...sum, entries: sum.entries + r.entries, share: sum.share + r.share }), {
    seriesId: OTHER_SERIES_ID,
    label: "Other",
    entries: 0,
    share: 0,
  } as OverallShareRow);
  if (other.entries > 0) slices.push(other);
  return { slices, folded: named.filter((r) => !kept.has(r.seriesId)).map((r) => r.seriesId) };
}

/** Field vs top cut rows by field share (largest first), "Other" last, empty series dropped. */
export function sortFieldVsTopCut(rows: readonly FieldVsTopCutRow[]): FieldVsTopCutRow[] {
  return rows
    .filter((r) => r.fieldShare > 0 || r.topCutShare > 0)
    .sort(
      (a, b) =>
        Number(a.seriesId === OTHER_SERIES_ID) - Number(b.seriesId === OTHER_SERIES_ID) ||
        b.fieldShare - a.fieldShare ||
        compareText(a.label, b.label),
    );
}

export type TrendDirection = "up" | "down" | "flat";

/** Direction of a meta share change; anything within ±{@link TREND_NEUTRAL} is flat. */
export function trendDirection(delta: number, threshold: number = TREND_NEUTRAL): TrendDirection {
  if (!Number.isFinite(delta) || Math.abs(delta) < threshold) return "flat";
  return delta > 0 ? "up" : "down";
}

export type UnrankedReason = "rogue" | "entries" | "share";

/** Why an archetype sits outside the tier list, or null when it is ranked. */
export function unrankedReason(stat: ArchetypeStats, config: TierConfig = TIER_CONFIG): UnrankedReason | null {
  if (stat.archetypeId === ROGUE_ID) return "rogue";
  if (stat.entries < config.minEntries) return "entries";
  if (stat.metaShare < config.minShare) return "share";
  return null;
}

/** "52.1% (48.3–55.9)"; "—" without matches. */
export function formatWinRateInterval(winRate: number | null, interval: [number, number] | null): string {
  if (winRate === null) return "—";
  if (!interval) return formatPercent(winRate);
  return `${formatPercent(winRate)} (${(interval[0] * 100).toFixed(1)}–${(interval[1] * 100).toFixed(1)})`;
}

/** Conversion lift as a multiplier: 1.62 → "1.6×". */
export function formatLift(lift: number): string {
  return Number.isFinite(lift) ? `${lift.toFixed(1)}×` : "—";
}

/** W-L-D, always with the draw count. */
export function formatWLD(record: { wins: number; losses: number; draws: number }): string {
  return `${record.wins}-${record.losses}-${record.draws}`;
}

/** Hover text for a matrix cell: "Pain vs Gaara: 52.6% · 60-54-0 · 95% CI 43–62%". */
export function matchupCellTitle(cell: MatchupCell, rowName: string, columnName: string, minGames: number): string {
  if (cell.mirror) return `${rowName} mirror: ${cell.games} ${cell.games === 1 ? "match" : "matches"} (not counted in win rates)`;
  if (cell.winRate === null) return `${rowName} vs ${columnName}: no games yet`;
  const ci = cell.interval ? ` · 95% CI ${Math.round(cell.interval[0] * 100)}–${Math.round(cell.interval[1] * 100)}%` : "";
  const low = cell.lowSample ? ` · low sample (fewer than ${minGames} games)` : "";
  return `${rowName} vs ${columnName}: ${formatPercent(cell.winRate)} · ${formatWLD(cell.record)}${ci}${low}`;
}

/** Blends a hex fill toward another hex color (default: the chart surface) by `amount` 0..1. */
export function blendHex(fill: string, amount: number, toward = "#0d0d14"): string {
  const parse = (hex: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    const value = m ? parseInt(m[1]!, 16) : 0;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const a = parse(fill);
  const b = parse(toward);
  const t = Math.min(1, Math.max(0, amount));
  return `#${a
    .map((c, i) =>
      Math.round(c + (b[i]! - c) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * Axis-sized event label. Long names keep their first word and a trailing number
 * ("Shinobi Online Open #4" → "Shinobi #4"); anything else is cut with an ellipsis.
 */
export function compactEventTick(label: string, max = 14): string {
  if (label.length <= max) return label;
  const words = label.split(/\s+/);
  const last = words[words.length - 1]!;
  if (words.length > 1 && /^#?\d+$/.test(last)) {
    const compact = `${words[0]} ${last}`;
    if (compact.length <= max) return compact;
  }
  return `${label.slice(0, max - 1).trimEnd()}…`;
}
