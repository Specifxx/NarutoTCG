import type { EventTier } from "@naruto-tcg/types";
import { ARCHETYPES } from "@/lib/data/archetypes";
import { CARD_INDEX } from "@/lib/data/cards";
import {
  DECK_SORT_LABELS,
  PLACEMENT_FILTER_LABELS,
  type DeckQuery,
  type DeckSort,
  type DeckSource,
  type PlacementFilter,
} from "@/lib/decks/catalog";
import { EVENT_TIER_ORDER } from "@/lib/format";

/** Deck directory filter state, mirrored in the URL. Defaults are omitted from the query string. */
export interface DeckParams {
  /** Free-text search (`q`), trimmed. */
  text: string;
  /** Archetype ids in {@link ARCHETYPES} order; empty means every archetype. */
  archetypeIds: string[];
  source: DeckSource;
  /** Event tiers in prestige order; empty means no tier filter (community decks included). */
  tiers: EventTier[];
  placement: PlacementFilter;
  /** Card ids the deck must all contain, in the order they were added. */
  cardIds: string[];
  sort: DeckSort;
}

export const DEFAULT_DECK_PARAMS: DeckParams = {
  text: "",
  archetypeIds: [],
  source: "all",
  tiers: [],
  placement: "any",
  cardIds: [],
  sort: "newest",
};

export const MAX_TEXT_LENGTH = 100;
export const MAX_CARD_FILTERS = 10;

export const DECK_SOURCES: readonly DeckSource[] = ["all", "tournament", "community"];

export const DECK_SOURCE_LABELS: Record<DeckSource, string> = {
  all: "All",
  tournament: "Tournament",
  community: "Community",
};

/** Short URL slugs for event tiers (the full tier id is accepted too). */
export const TIER_SLUG: Record<EventTier, string> = {
  "national-championship": "nationals",
  "regional-championship": "regionals",
  "online-open": "online",
  "store-championship": "store",
};

const TIER_BY_SLUG = new Map<string, EventTier>(
  EVENT_TIER_ORDER.flatMap((tier) => [
    [TIER_SLUG[tier], tier],
    [tier, tier],
  ]),
);

const ARCHETYPE_ORDER = ARCHETYPES.map((archetype) => archetype.id);
const OWN_KEYS = ["q", "archetype", "source", "tier", "placement", "card", "sort"] as const;

/** Every value of a repeatable key, with comma lists split: `?a=x&a=y,z` → ["x", "y", "z"]. */
function listParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Known archetype ids only, deduplicated, in directory order. */
export function normalizeArchetypeIds(ids: readonly string[]): string[] {
  const picked = new Set(ids);
  return ARCHETYPE_ORDER.filter((id) => picked.has(id));
}

/** Known tiers only, deduplicated, in prestige order. */
export function normalizeTiers(tiers: readonly EventTier[]): EventTier[] {
  return EVENT_TIER_ORDER.filter((tier) => tiers.includes(tier));
}

/** Known card ids only (case-insensitive), deduplicated, insertion order, at most {@link MAX_CARD_FILTERS}. */
export function normalizeCardIds(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim().toUpperCase();
    if (CARD_INDEX.has(id) && !out.includes(id)) out.push(id);
  }
  return out.slice(0, MAX_CARD_FILTERS);
}

function pick<T extends string>(labels: Record<T, string>, value: string | null, fallback: T): T {
  return value !== null && Object.hasOwn(labels, value) ? (value as T) : fallback;
}

/** Reads the directory state from a query string. Unknown or malformed values are ignored. */
export function parseDeckParams(search: URLSearchParams | string): DeckParams {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const tiers = listParam(params, "tier")
    .map((slug) => TIER_BY_SLUG.get(slug.toLowerCase()))
    .filter((tier): tier is EventTier => tier !== undefined);
  return {
    text: (params.get("q") ?? "").trim().slice(0, MAX_TEXT_LENGTH).trim(),
    archetypeIds: normalizeArchetypeIds(listParam(params, "archetype").map((id) => id.toLowerCase())),
    source: pick(DECK_SOURCE_LABELS, params.get("source"), DEFAULT_DECK_PARAMS.source),
    tiers: normalizeTiers(tiers),
    placement: pick(PLACEMENT_FILTER_LABELS, params.get("placement"), DEFAULT_DECK_PARAMS.placement),
    cardIds: normalizeCardIds(listParam(params, "card")),
    sort: pick(DECK_SORT_LABELS, params.get("sort"), DEFAULT_DECK_PARAMS.sort),
  };
}

/**
 * Writes the directory state onto `base` (other query keys are kept) and returns the query
 * string without a leading "?". Lists are written as repeated keys; defaults are omitted.
 */
export function serializeDeckParams(state: DeckParams, base: URLSearchParams | string = ""): string {
  const params = new URLSearchParams(base);
  for (const key of OWN_KEYS) params.delete(key);
  const text = state.text.trim().slice(0, MAX_TEXT_LENGTH).trim();
  if (text) params.set("q", text);
  for (const id of normalizeArchetypeIds(state.archetypeIds)) params.append("archetype", id);
  if (state.source !== "all" && DECK_SOURCES.includes(state.source)) params.set("source", state.source);
  for (const tier of normalizeTiers(state.tiers)) params.append("tier", TIER_SLUG[tier]);
  if (state.placement !== "any" && Object.hasOwn(PLACEMENT_FILTER_LABELS, state.placement)) params.set("placement", state.placement);
  for (const id of normalizeCardIds(state.cardIds)) params.append("card", id);
  if (state.sort !== "newest" && Object.hasOwn(DECK_SORT_LABELS, state.sort)) params.set("sort", state.sort);
  return params.toString();
}

/** Number of active filter groups besides the text search (drives the mobile "Filters" badge). */
export function activeFilterCount(state: DeckParams): number {
  return (
    state.archetypeIds.length +
    (state.source !== "all" ? 1 : 0) +
    state.tiers.length +
    (state.placement !== "any" ? 1 : 0) +
    state.cardIds.length
  );
}

/** True when any filter (text included, sort excluded) narrows the directory. */
export function hasActiveFilters(state: DeckParams): boolean {
  return state.text.trim() !== "" || activeFilterCount(state) > 0;
}

/** Clears every filter and keeps the sort order. */
export function resetDeckFilters(state: DeckParams): DeckParams {
  return { ...DEFAULT_DECK_PARAMS, sort: state.sort };
}

/** The catalog query for a directory state. */
export function toDeckQuery(state: DeckParams): DeckQuery {
  return {
    text: state.text,
    archetypeIds: state.archetypeIds,
    source: state.source,
    tiers: state.tiers,
    placement: state.placement,
    cardIds: state.cardIds,
    sort: state.sort,
  };
}

/** Adds `value` when absent, removes it when present. */
export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
