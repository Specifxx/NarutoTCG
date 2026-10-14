import type { EventTier } from "@naruto-tcg/types";
import { SETS } from "@/lib/data/cards";
import { EVENT_TIER_ORDER } from "@/lib/format";
import type { MetaFilter } from "@/lib/meta/types";

/** Meta page filter state, mirrored in the URL. Defaults are omitted from the query string. */
export interface MetaParams {
  /** A {@link DATE_PRESETS} id. */
  range: string;
  /** Selected event tiers; empty means every tier. */
  tiers: EventTier[];
  /** A {@link formatSlug}; resolved against the formats present with {@link resolveFormat}. */
  format: string | null;
  /** Fold this browser's imported events into the meta. */
  imports: boolean;
}

export interface DatePreset {
  id: string;
  label: string;
  /** Window length, counted back from the newest available event. */
  days?: number;
  /** Fixed inclusive start date. */
  from?: string;
}

export const DEFAULT_META_PARAMS: MetaParams = { range: "all", tiers: [], format: null, imports: false };

const LATEST_SET = SETS.reduce((latest, set) => (set.releaseDate > latest.releaseDate ? set : latest));

export const DATE_PRESETS: readonly DatePreset[] = [
  { id: "all", label: "All events" },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "60d", label: "Last 60 days", days: 60 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: LATEST_SET.code.toLowerCase(), label: `Since ${LATEST_SET.code}`, from: LATEST_SET.releaseDate },
];

/** Short URL slugs for event tiers. */
export const EVENT_TIER_SLUG: Record<EventTier, string> = {
  "national-championship": "nationals",
  "regional-championship": "regionals",
  "online-open": "online",
  "store-championship": "store",
};

const TIER_BY_SLUG = new Map<string, EventTier>(
  EVENT_TIER_ORDER.flatMap((tier) => [
    [EVENT_TIER_SLUG[tier], tier],
    [tier, tier],
  ]),
);

/** URL-safe slug for a format label: "Standard (NT01–NT04)" → "standard-nt01-nt04". */
export function formatSlug(format: string): string {
  return format
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The format whose slug matches, or undefined when none of `formats` does. */
export function resolveFormat(slug: string | null, formats: readonly string[]): string | undefined {
  if (!slug) return undefined;
  return formats.find((format) => formatSlug(format) === slug);
}

/** Tiers in prestige order without duplicates; selecting every tier collapses to "all" (empty). */
export function normalizeTiers(tiers: readonly EventTier[]): EventTier[] {
  const picked = EVENT_TIER_ORDER.filter((tier) => tiers.includes(tier));
  return picked.length === EVENT_TIER_ORDER.length ? [] : picked;
}

/** Reads the filter state from a query string. Unknown or malformed values fall back to defaults. */
export function parseMetaParams(search: URLSearchParams | string): MetaParams {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const range = params.get("range");
  const tiers = (params.get("tiers") ?? "")
    .split(",")
    .map((slug) => TIER_BY_SLUG.get(slug.trim().toLowerCase()))
    .filter((tier): tier is EventTier => tier !== undefined);
  const format = formatSlug(params.get("format") ?? "");
  const imports = params.get("imports");
  return {
    range: DATE_PRESETS.some((preset) => preset.id === range) ? range! : DEFAULT_META_PARAMS.range,
    tiers: normalizeTiers(tiers),
    format: format && format.length <= 80 ? format : null,
    imports: imports === "1" || imports === "true",
  };
}

const OWN_KEYS = ["range", "tiers", "format", "imports"] as const;

/**
 * Writes the filter state onto `base` (other query keys are kept) and returns the query
 * string without a leading "?". Default values are omitted.
 */
export function serializeMetaParams(state: MetaParams, base: URLSearchParams | string = ""): string {
  const params = new URLSearchParams(base);
  for (const key of OWN_KEYS) params.delete(key);
  const tiers = normalizeTiers(state.tiers);
  if (state.range !== DEFAULT_META_PARAMS.range && DATE_PRESETS.some((p) => p.id === state.range))
    params.set("range", state.range);
  if (tiers.length > 0) params.set("tiers", tiers.map((tier) => EVENT_TIER_SLUG[tier]).join(","));
  if (state.format) params.set("format", formatSlug(state.format));
  if (state.imports) params.set("imports", "1");
  return params.toString();
}

/** Adds whole days to an ISO date (UTC), e.g. ("2026-10-10", -30) → "2026-09-10". */
export function shiftIsoDate(iso: string, days: number): string {
  const time = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(time)) return iso;
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Date bounds for a preset. Day windows count back from the newest available event, not
 * from today, so the seed data never "expires": "Last 30 days" keeps events dated on or
 * after newest − 30 days.
 */
export function presetFilter(presetId: string, newestDate: string | null): MetaFilter {
  const preset = DATE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return {};
  if (preset.from) return { from: preset.from };
  if (preset.days !== undefined && newestDate) return { from: shiftIsoDate(newestDate, -preset.days) };
  return {};
}

/** Full engine filter for the page state, given the newest event and the formats present. */
export function toMetaFilter(
  state: MetaParams,
  { newestDate, formats }: { newestDate: string | null; formats: readonly string[] },
): MetaFilter {
  const filter: MetaFilter = presetFilter(state.range, newestDate);
  const tiers = normalizeTiers(state.tiers);
  if (tiers.length > 0) filter.tiers = tiers;
  const format = resolveFormat(state.format, formats);
  if (format) filter.format = format;
  return filter;
}

/** True when a date, tier or format filter is set (drives "Reset filters"; the imports toggle is a data source, not a filter). */
export function hasActiveFilters(state: MetaParams): boolean {
  return serializeMetaParams({ ...state, imports: false }) !== "";
}

/** Clears every filter but keeps the imports toggle. */
export function resetFilters(state: MetaParams): MetaParams {
  return { ...DEFAULT_META_PARAMS, imports: state.imports };
}
