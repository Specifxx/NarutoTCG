// Pure, framework-free search engine for the card database.
//
// The index normalizes every searchable field once, so each keystroke only
// runs cheap substring checks. Text matching (`matchQuery`) is kept separate
// from facet filtering (`applyFilters`, `countFacets`) so the UI can re-run
// the facets without re-matching text when only a checkbox changes.
import {
  CARD_TYPES,
  CHAKRA_ELEMENTS,
  RARITIES,
  type CardPrinting,
  type CardSet,
  type CardType,
  type ChakraElement,
  type NarutoCard,
  type Rarity,
} from "@naruto-tcg/types";
import { RARITY_META, compareCollectorNumbers } from "./meta";

// ---------------------------------------------------------------------------
// Filter, sort, and view model
// ---------------------------------------------------------------------------

/** Value type of each multi-select facet. */
export interface FacetValueMap {
  types: CardType;
  elements: ChakraElement;
  costs: number;
  rarities: Rarity;
  sets: string;
}

export type FacetKey = keyof FacetValueMap;

export const FACET_KEYS: readonly FacetKey[] = ["types", "elements", "costs", "rarities", "sets"];

/**
 * Everything that narrows the result list. Facets are OR within a facet and
 * AND across facets; the query is AND across its tokens.
 */
export interface CardFilters {
  query: string;
  types: readonly CardType[];
  elements: readonly ChakraElement[];
  costs: readonly number[];
  rarities: readonly Rarity[];
  sets: readonly string[];
}

export const EMPTY_FILTERS: CardFilters = Object.freeze({
  query: "",
  types: [],
  elements: [],
  costs: [],
  rarities: [],
  sets: [],
});

export const SORT_KEYS = ["relevance", "set", "name", "cost-asc", "cost-desc", "power-desc", "newest"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  relevance: "Best match",
  set: "Set order",
  name: "Name (A–Z)",
  "cost-asc": "Cost (low → high)",
  "cost-desc": "Cost (high → low)",
  "power-desc": "Power (high → low)",
  newest: "Newest first",
};

export const VIEW_MODES = ["grid", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_SORT: SortKey = "relevance";
export const DEFAULT_VIEW: ViewMode = "grid";

/** Matches the data validator's cost range. */
export const MIN_COST = 0;
export const MAX_COST = 20;
export const MAX_QUERY_LENGTH = 120;
/** Longest list accepted per URL facet; anything beyond is garbage. */
const MAX_LIST_VALUES = 64;
/** Tokens beyond this are ignored so pathological queries stay fast. */
const MAX_TOKENS = 12;

export interface BrowserState {
  filters: CardFilters;
  sort: SortKey;
  view: ViewMode;
}

export const DEFAULT_STATE: BrowserState = Object.freeze({
  filters: EMPTY_FILTERS,
  sort: DEFAULT_SORT,
  view: DEFAULT_VIEW,
});

// ---------------------------------------------------------------------------
// Text normalization and tokenizing
// ---------------------------------------------------------------------------

const COMBINING_MARKS = /\p{M}+/gu;
/** Invisible format characters: soft hyphen, zero-width space/joiners, bidi controls, BOM. */
const FORMAT_CHARS = /\p{Cf}/gu;
const APOSTROPHES = /['’‘`´]/g;
const WHITESPACE = /\s+/g;
const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Lowercase, strip diacritics, apostrophes and invisible format characters,
 * fold width variants, collapse whitespace.
 */
export function normalize(text: string): string {
  return text
    .replace(FORMAT_CHARS, "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(WHITESPACE, " ")
    .trim();
}

/**
 * Split a query into normalized tokens. `"double quoted phrases"` stay one
 * token (an unterminated quote runs to the end); duplicates are dropped.
 */
export function tokenize(query: string): string[] {
  const text = query.replace(/[“”„‟″]/g, '"');
  const tokens: string[] = [];
  for (const match of text.matchAll(/"([^"]*)(?:"|$)|([^\s"]+)/g)) {
    const token = normalize(match[1] ?? match[2] ?? "");
    if (token !== "" && !tokens.includes(token)) tokens.push(token);
    if (tokens.length >= MAX_TOKENS) break;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export interface IndexedCard {
  readonly card: NarutoCard;
  /** Position in canonical (set) order. */
  readonly order: number;
  readonly name: string;
  readonly title: string;
  /** Normalized card ID plus every printing's collector number. */
  readonly ids: readonly string[];
  readonly traits: readonly string[];
  readonly keywords: readonly string[];
  readonly effect: string;
  /** Rarest rarity across all printings. */
  readonly bestRarity: Rarity;
  /** Release rank of the debut set; higher is newer. */
  readonly setRank: number;
}

export interface SearchIndex {
  readonly entries: readonly IndexedCard[];
  /** Distinct costs present in the data, ascending. */
  readonly costs: readonly number[];
  /** Known set IDs in release order (given sets first, then any unknown ones). */
  readonly setIds: readonly string[];
}

/**
 * Precompute normalized search fields. `cards` must already be in canonical
 * order (lib/data's `getAllCards()` is); `sets` provides release order for
 * the "newest" sort and facet listings.
 */
export function buildSearchIndex(
  cards: readonly NarutoCard[],
  sets: readonly Pick<CardSet, "id" | "releaseDate">[] = [],
): SearchIndex {
  const setRank = new Map<string, number>();
  const sortedSets = [...sets].sort(
    (a, b) => a.releaseDate.localeCompare(b.releaseDate) || compareCollectorNumbers(a.id, b.id),
  );
  for (const set of sortedSets) if (!setRank.has(set.id)) setRank.set(set.id, setRank.size);
  for (const card of cards) {
    for (const printing of card.printings) if (!setRank.has(printing.setId)) setRank.set(printing.setId, setRank.size);
  }

  const costs = new Set<number>();
  const entries = cards.map((card, order): IndexedCard => {
    if (card.cost !== undefined) costs.add(card.cost);
    let bestRarity: Rarity = card.printings[0]?.rarity ?? "common";
    for (const { rarity } of card.printings) if (RARITY_META[rarity].rank > RARITY_META[bestRarity].rank) bestRarity = rarity;
    const debutSet = card.printings[0]?.setId;
    return {
      card,
      order,
      name: normalize(card.name),
      title: normalize(card.title ?? ""),
      ids: unique([card.id, ...card.printings.map((p) => p.number)].map(normalize)),
      traits: card.traits.map(normalize),
      keywords: card.keywords.map(normalize),
      effect: normalize(card.effect),
      bestRarity,
      setRank: debutSet === undefined ? -1 : (setRank.get(debutSet) ?? -1),
    };
  });

  return {
    entries,
    costs: [...costs].sort((a, b) => a - b),
    setIds: [...setRank.keys()],
  };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

// ---------------------------------------------------------------------------
// Text matching and relevance
// ---------------------------------------------------------------------------

interface Tiers {
  exact: number;
  prefix: number;
  word: number;
  inner: number;
  /** Shortest token allowed to match mid-word in this field. */
  minInner: number;
}

// Every tier of a field outranks every tier of the fields after it:
// name > title > id/number > traits > keywords > effect.
const NAME: Tiers = { exact: 120, prefix: 100, word: 85, inner: 60, minInner: 2 };
const TITLE: Tiers = { exact: 90, prefix: 80, word: 70, inner: 50, minInner: 2 };
const ID: Tiers = { exact: 48, prefix: 46, word: 44, inner: 42, minInner: 2 };
const TRAIT: Tiers = { exact: 36, prefix: 34, word: 32, inner: 28, minInner: 3 };
const KEYWORD: Tiers = { exact: 26, prefix: 24, word: 22, inner: 18, minInner: 3 };
const EFFECT: Tiers = { exact: 12, prefix: 12, word: 10, inner: 6, minInner: 3 };

/** Exposed for tests and tooling; higher means a stronger field match. */
export const FIELD_WEIGHTS = { NAME, TITLE, ID, TRAIT, KEYWORD, EFFECT } as const;

function isWordStart(value: string, index: number): boolean {
  if (index === 0) return true;
  return !WORD_CHAR.test(value.charAt(index - 1));
}

function fieldScore(value: string, token: string, tiers: Tiers): number {
  if (value === "") return 0;
  if (value === token) return tiers.exact;
  if (value.startsWith(token)) return tiers.prefix;
  let index = value.indexOf(token, 1);
  if (index === -1) return 0;
  while (index !== -1) {
    if (isWordStart(value, index)) return tiers.word;
    index = value.indexOf(token, index + 1);
  }
  return token.length >= tiers.minInner ? tiers.inner : 0;
}

function listScore(values: readonly string[], token: string, tiers: Tiers): number {
  let best = 0;
  for (const value of values) {
    const score = fieldScore(value, token, tiers);
    if (score > best) best = score;
    if (best === tiers.exact) break;
  }
  return best;
}

function tokenScore(entry: IndexedCard, token: string): number {
  return Math.max(
    fieldScore(entry.name, token, NAME),
    fieldScore(entry.title, token, TITLE),
    listScore(entry.ids, token, ID),
    listScore(entry.traits, token, TRAIT),
    listScore(entry.keywords, token, KEYWORD),
    fieldScore(entry.effect, token, EFFECT),
  );
}

/** Relevance of a card for the given tokens, or 0 when any token is missing. */
export function scoreEntry(entry: IndexedCard, tokens: readonly string[]): number {
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(entry, token);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

export interface QueryMatch {
  readonly entry: IndexedCard;
  /** 0 when the query is empty. */
  readonly score: number;
}

export interface QueryResult {
  readonly tokens: readonly string[];
  /** Matching cards in canonical order. */
  readonly matches: readonly QueryMatch[];
}

/** Text-match the query against the index (every token must match somewhere). */
export function matchQuery(index: SearchIndex, query: string): QueryResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { tokens, matches: index.entries.map((entry) => ({ entry, score: 0 })) };
  }
  const matches: QueryMatch[] = [];
  for (const entry of index.entries) {
    const score = scoreEntry(entry, tokens);
    if (score > 0) matches.push({ entry, score });
  }
  return { tokens, matches };
}

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

interface CompiledFacets {
  types: ReadonlySet<CardType> | null;
  elements: ReadonlySet<ChakraElement> | null;
  costs: ReadonlySet<number> | null;
  rarities: ReadonlySet<Rarity> | null;
  sets: ReadonlySet<string> | null;
}

function toSet<T>(values: readonly T[]): ReadonlySet<T> | null {
  return values.length === 0 ? null : new Set(values);
}

function compileFacets(filters: CardFilters): CompiledFacets {
  return {
    types: toSet(filters.types),
    elements: toSet(filters.elements),
    costs: toSet(filters.costs),
    rarities: toSet(filters.rarities),
    sets: toSet(filters.sets),
  };
}

function printingPasses(printing: CardPrinting, facets: CompiledFacets): boolean {
  return (
    (facets.rarities === null || facets.rarities.has(printing.rarity)) &&
    (facets.sets === null || facets.sets.has(printing.setId))
  );
}

/**
 * Rarity and set describe a printing, not a card, so both must hold for the
 * SAME printing: "Promo in Starter Deck 01" must not match a card whose only
 * promo printing is in a promo pack.
 */
function passesPrintings(entry: IndexedCard, facets: CompiledFacets): boolean {
  return (facets.rarities === null && facets.sets === null) || entry.card.printings.some((p) => printingPasses(p, facets));
}

function passesFacet(entry: IndexedCard, facets: CompiledFacets, key: FacetKey): boolean {
  switch (key) {
    case "types":
      return facets.types === null || facets.types.has(entry.card.type);
    case "elements":
      return facets.elements === null || facets.elements.has(entry.card.element);
    case "costs":
      // Cards without a cost (leaders) never match an active cost filter.
      return facets.costs === null || (entry.card.cost !== undefined && facets.costs.has(entry.card.cost));
    case "rarities":
    case "sets":
      return passesPrintings(entry, facets);
  }
}

function passesAll(entry: IndexedCard, facets: CompiledFacets): boolean {
  return FACET_KEYS.every((key) => passesFacet(entry, facets, key));
}

// ---------------------------------------------------------------------------
// Sorting and result lists
// ---------------------------------------------------------------------------

export interface SearchHit {
  readonly card: NarutoCard;
  readonly score: number;
  readonly bestRarity: Rarity;
}

type Compare = (a: QueryMatch, b: QueryMatch) => number;

const NAME_COLLATOR = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const byOrder: Compare = (a, b) => a.entry.order - b.entry.order;

/** Ascending or descending on an optional number; missing values always sort last. */
function byOptional(pick: (card: NarutoCard) => number | undefined, direction: 1 | -1): Compare {
  return (a, b) => {
    const x = pick(a.entry.card);
    const y = pick(b.entry.card);
    if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
    return (x - y) * direction;
  };
}

function chain(...comparators: Compare[]): Compare {
  return (a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}

function comparatorFor(sort: SortKey, hasQuery: boolean): Compare {
  switch (sort) {
    case "relevance":
      return hasQuery ? chain((a, b) => b.score - a.score, byOrder) : byOrder;
    case "set":
      return byOrder;
    case "name":
      return chain(
        (a, b) => NAME_COLLATOR.compare(a.entry.card.name, b.entry.card.name),
        (a, b) => NAME_COLLATOR.compare(a.entry.card.title ?? "", b.entry.card.title ?? ""),
        byOrder,
      );
    case "cost-asc":
      return chain(
        byOptional((card) => card.cost, 1),
        byOrder,
      );
    case "cost-desc":
      return chain(
        byOptional((card) => card.cost, -1),
        byOrder,
      );
    case "power-desc":
      return chain(
        byOptional((card) => card.power, -1),
        byOrder,
      );
    case "newest":
      return chain(
        (a, b) => b.entry.setRank - a.entry.setRank,
        (a, b) => {
          const x = a.entry.card.reveal?.date;
          const y = b.entry.card.reveal?.date;
          if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
          return y.localeCompare(x);
        },
        byOrder,
      );
  }
}

/** Apply the facets of `filters` to already text-matched cards and sort them. */
export function applyFilters(result: QueryResult, filters: CardFilters, sort: SortKey = DEFAULT_SORT): SearchHit[] {
  const facets = compileFacets(filters);
  return result.matches
    .filter((match) => passesAll(match.entry, facets))
    .sort(comparatorFor(sort, result.tokens.length > 0))
    .map((match) => ({ card: match.entry.card, score: match.score, bestRarity: match.entry.bestRarity }));
}

/** Full search: query + facets + sort. */
export function search(index: SearchIndex, filters: CardFilters, sort: SortKey = DEFAULT_SORT): SearchHit[] {
  return applyFilters(matchQuery(index, filters.query), filters, sort);
}

// ---------------------------------------------------------------------------
// Facet counts
// ---------------------------------------------------------------------------

/** Per-option result counts for every facet. Every known option is present (zero-filled). */
export type FacetCounts = { readonly [K in FacetKey]: ReadonlyMap<FacetValueMap[K], number> } & {
  /** Results with every filter applied. */
  readonly total: number;
};

function bump<K>(map: Map<K, number>, key: K): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function zeroMap<K>(keys: Iterable<K>): Map<K, number> {
  const map = new Map<K, number>();
  for (const key of keys) map.set(key, 0);
  return map;
}

/** Facets that test the card itself; rarity and set are tested per printing. */
const CARD_FACET_KEYS: readonly FacetKey[] = ["types", "elements", "costs"];

/**
 * Standard faceted-search counts: each option's count is the number of
 * results if that facet's own selection were replaced by just that option,
 * keeping the query and every OTHER facet applied.
 */
export function countFacets(index: SearchIndex, result: QueryResult, filters: CardFilters): FacetCounts {
  const facets = compileFacets(filters);
  const types = zeroMap<CardType>(CARD_TYPES);
  const elements = zeroMap<ChakraElement>(CHAKRA_ELEMENTS);
  const rarities = zeroMap<Rarity>(RARITIES);
  const costs = zeroMap<number>(index.costs);
  const sets = zeroMap<string>(index.setIds);
  let total = 0;

  for (const { entry } of result.matches) {
    let failed: FacetKey | null = null;
    let failures = 0;
    for (const key of CARD_FACET_KEYS) {
      if (!passesFacet(entry, facets, key)) {
        failed = key;
        failures += 1;
        if (failures > 1) break;
      }
    }
    if (failures > 1) continue;
    const printingsPass = passesPrintings(entry, facets);
    if (failures === 1) {
      // A card that fails exactly one card facet still counts toward that facet's options.
      if (!printingsPass) continue;
      if (failed === "types") bump(types, entry.card.type);
      if (failed === "elements") bump(elements, entry.card.element);
      if (failed === "costs" && entry.card.cost !== undefined) bump(costs, entry.card.cost);
      continue;
    }
    if (printingsPass) {
      total += 1;
      bump(types, entry.card.type);
      bump(elements, entry.card.element);
      if (entry.card.cost !== undefined) bump(costs, entry.card.cost);
    }
    // Rarity option r counts the card when a printing of rarity r passes the
    // set facet; set option s when a printing in s passes the rarity facet.
    const printingRarities = new Set<Rarity>();
    const printingSets = new Set<string>();
    for (const printing of entry.card.printings) {
      if (facets.sets === null || facets.sets.has(printing.setId)) printingRarities.add(printing.rarity);
      if (facets.rarities === null || facets.rarities.has(printing.rarity)) printingSets.add(printing.setId);
    }
    for (const rarity of printingRarities) bump(rarities, rarity);
    for (const setId of printingSets) bump(sets, setId);
  }

  return { types, elements, rarities, costs, sets, total };
}

/** Convenience wrapper: facet counts for `filters` including its query. */
export function facetCounts(index: SearchIndex, filters: CardFilters): FacetCounts {
  return countFacets(index, matchQuery(index, filters.query), filters);
}

// ---------------------------------------------------------------------------
// Filter state helpers
// ---------------------------------------------------------------------------

type FacetSelection = { [K in FacetKey]: readonly FacetValueMap[K][] };

function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** Toggle `value` in `list`, then order by `order` (unknown values last). */
function toggleIn<T>(list: readonly T[], value: T, order: readonly T[]): T[] {
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const rank = (v: T) => {
    const i = order.indexOf(v);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return next.sort((a, b) => rank(a) - rank(b));
}

/** Add or remove one facet value, keeping each facet in canonical order. */
export function toggleFacetValue<K extends FacetKey>(
  filters: CardFilters,
  key: K,
  value: FacetValueMap[K],
  setOrder: readonly string[] = [],
): CardFilters {
  const v: string | number = value;
  switch (key) {
    case "types":
      return isOneOf(CARD_TYPES, v) ? { ...filters, types: toggleIn(filters.types, v, CARD_TYPES) } : filters;
    case "elements":
      return isOneOf(CHAKRA_ELEMENTS, v)
        ? { ...filters, elements: toggleIn(filters.elements, v, CHAKRA_ELEMENTS) }
        : filters;
    case "rarities":
      return isOneOf(RARITIES, v) ? { ...filters, rarities: toggleIn(filters.rarities, v, RARITIES) } : filters;
    case "costs":
      return typeof v === "number"
        ? { ...filters, costs: toggleIn(filters.costs, v, []).sort((a, b) => a - b) }
        : filters;
    case "sets":
      return typeof v === "string" ? { ...filters, sets: toggleIn(filters.sets, v, setOrder) } : filters;
    default:
      return filters;
  }
}

/** Typed read of one facet's selected values. */
export function facetValues<K extends FacetKey>(filters: CardFilters, key: K): readonly FacetValueMap[K][] {
  const selection: FacetSelection = filters;
  return selection[key];
}

export function clearFacet(filters: CardFilters, key: FacetKey): CardFilters {
  switch (key) {
    case "types":
      return { ...filters, types: [] };
    case "elements":
      return { ...filters, elements: [] };
    case "costs":
      return { ...filters, costs: [] };
    case "rarities":
      return { ...filters, rarities: [] };
    case "sets":
      return { ...filters, sets: [] };
  }
}

/** Number of selected facet values (the query is not counted). */
export function activeFacetCount(filters: CardFilters): number {
  return FACET_KEYS.reduce((n, key) => n + filters[key].length, 0);
}

export function hasActiveFilters(filters: CardFilters): boolean {
  return filters.query.trim() !== "" || activeFacetCount(filters) > 0;
}

// ---------------------------------------------------------------------------
// URL (de)serialization — the shared /cards URL contract
// ---------------------------------------------------------------------------

export const URL_PARAMS = {
  query: "q",
  types: "type",
  elements: "element",
  costs: "cost",
  rarities: "rarity",
  sets: "set",
  sort: "sort",
  view: "view",
} as const;

/** Every query-string key owned by the /cards URL contract. */
export const URL_PARAM_KEYS: readonly string[] = Object.values(URL_PARAMS);

export interface UrlContext {
  /** Known set IDs in display order. When omitted, any well-formed ID is accepted. */
  readonly setIds?: readonly string[];
}

const SET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

function rawList(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .slice(0, MAX_LIST_VALUES)
    .flatMap((value) => value.split(","))
    .slice(0, MAX_LIST_VALUES)
    .map((value) => value.trim())
    .filter((value) => value !== "");
}

function pickEnum<T extends string>(allowed: readonly T[], raw: readonly string[]): T[] {
  const wanted = new Set(raw.map((value) => value.toLowerCase()));
  return allowed.filter((value) => wanted.has(value));
}

function pickCosts(raw: readonly string[]): number[] {
  const costs = new Set<number>();
  for (const value of raw) {
    if (!/^\d{1,3}$/.test(value)) continue;
    const cost = Number(value);
    if (cost >= MIN_COST && cost <= MAX_COST) costs.add(cost);
  }
  return [...costs].sort((a, b) => a - b);
}

function pickSets(raw: readonly string[], known: readonly string[] | undefined): string[] {
  if (known === undefined) return unique(raw.filter((value) => SET_ID_PATTERN.test(value)));
  const wanted = new Set(raw.map((value) => value.toLowerCase()));
  return known.filter((id) => wanted.has(id.toLowerCase()));
}

/** Drop unpaired UTF-16 surrogates (e.g. an emoji cut in half), which encodeURIComponent rejects. */
function wellFormed(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text.slice(i, i + 2);
        i += 1;
      }
    } else if (code < 0xdc00 || code > 0xdfff) {
      out += text.charAt(i);
    }
  }
  return out;
}

/** Trim, collapse whitespace, and clamp a free-text query. */
export function cleanQuery(query: string): string {
  return wellFormed(query.replace(WHITESPACE, " ").trim().slice(0, MAX_QUERY_LENGTH)).trim();
}

/**
 * Parse filters from a query string. Every value is validated against the
 * enums / known set IDs; unknown values are dropped, duplicates removed, and
 * lists returned in canonical order.
 */
export function filtersFromSearchParams(params: URLSearchParams, context: UrlContext = {}): CardFilters {
  return {
    query: cleanQuery(params.get(URL_PARAMS.query) ?? ""),
    types: pickEnum(CARD_TYPES, rawList(params, URL_PARAMS.types)),
    elements: pickEnum(CHAKRA_ELEMENTS, rawList(params, URL_PARAMS.elements)),
    costs: pickCosts(rawList(params, URL_PARAMS.costs)),
    rarities: pickEnum(RARITIES, rawList(params, URL_PARAMS.rarities)),
    sets: pickSets(rawList(params, URL_PARAMS.sets), context.setIds),
  };
}

/** Parse filters, sort, and view; invalid sort/view fall back to the defaults. */
export function stateFromSearchParams(params: URLSearchParams, context: UrlContext = {}): BrowserState {
  const sort = params.get(URL_PARAMS.sort)?.toLowerCase() ?? null;
  const view = params.get(URL_PARAMS.view)?.toLowerCase() ?? null;
  return {
    filters: filtersFromSearchParams(params, context),
    sort: isOneOf(SORT_KEYS, sort) ? sort : DEFAULT_SORT,
    view: isOneOf(VIEW_MODES, view) ? view : DEFAULT_VIEW,
  };
}

/** Contract entries in a fixed order, omitting defaults so URLs stay short. */
function urlEntries(state: Partial<BrowserState>): Array<[string, string]> {
  const filters = state.filters ?? EMPTY_FILTERS;
  const entries: Array<[string, string]> = [];
  const query = cleanQuery(filters.query);
  if (query !== "") entries.push([URL_PARAMS.query, query]);
  for (const key of FACET_KEYS) {
    const values = filters[key];
    if (values.length > 0) entries.push([URL_PARAMS[key], values.join(",")]);
  }
  if (state.sort !== undefined && state.sort !== DEFAULT_SORT) entries.push([URL_PARAMS.sort, state.sort]);
  if (state.view !== undefined && state.view !== DEFAULT_VIEW) entries.push([URL_PARAMS.view, state.view]);
  return entries;
}

export function toSearchParams(state: Partial<BrowserState>): URLSearchParams {
  return new URLSearchParams(urlEntries(state));
}

/**
 * Human-friendly query string ("?type=leader,jutsu&q=team%207") with literal
 * commas between list values, or "" when everything is at its default.
 */
export function toQueryString(state: Partial<BrowserState>): string {
  const parts = urlEntries(state).map(
    ([key, value]) => `${key}=${value.split(",").map(encodeURIComponent).join(",")}`,
  );
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/**
 * Query that matches a multi-word tag as one phrase ("Leaf Village" must not
 * match cards that merely contain "leaf" and "village" somewhere).
 */
export function phraseQuery(term: string): string {
  const text = term.replace(/"/g, "").trim();
  return /\s/.test(text) ? `"${text}"` : text;
}

/**
 * Typed link into the card database for use by any page, e.g.
 * `cardsHref({ elements: ["fire"] })` → "/cards?element=fire".
 */
export function cardsHref(
  filters: Partial<CardFilters> = {},
  options: { sort?: SortKey; view?: ViewMode } = {},
): "/cards" | `/cards?${string}` {
  const query = toQueryString({ filters: { ...EMPTY_FILTERS, ...filters }, ...options });
  return query === "" ? "/cards" : `/cards?${query.slice(1)}`;
}

// ---------------------------------------------------------------------------
// Highlighting and suggestions
// ---------------------------------------------------------------------------

export interface HighlightSegment {
  readonly text: string;
  readonly match: boolean;
}

/**
 * Split `text` into plain and matched segments for the given normalized
 * tokens. Matching runs on the normalized form, so "naruto" highlights
 * "Narutō" and segments always map back to the original characters.
 */
export function highlightSegments(text: string, tokens: readonly string[]): HighlightSegment[] {
  if (text === "" || tokens.length === 0) return text === "" ? [] : [{ text, match: false }];

  // Normalized characters and the original [start, end) span each came from.
  let normalized = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const char of text) {
    const end = offset + char.length;
    let piece = /\s/.test(char) ? " " : normalize(char);
    if (piece === " " && (normalized === "" || normalized.endsWith(" "))) piece = "";
    for (let i = 0; i < piece.length; i += 1) {
      starts.push(offset);
      ends.push(end);
    }
    normalized += piece;
    offset = end;
  }

  const marked = new Array<boolean>(text.length).fill(false);
  for (const token of tokens) {
    let index = normalized.indexOf(token);
    while (index !== -1) {
      const from = starts[index];
      const to = ends[index + token.length - 1];
      if (from !== undefined && to !== undefined) marked.fill(true, from, to);
      index = normalized.indexOf(token, index + 1);
    }
  }

  const segments: HighlightSegment[] = [];
  let runStart = 0;
  for (let i = 1; i <= text.length; i += 1) {
    if (i === text.length || marked[i] !== marked[runStart]) {
      segments.push({ text: text.slice(runStart, i), match: marked[runStart] === true });
      runStart = i;
    }
  }
  return segments;
}

/**
 * Popular character tags and keywords, most common first, for empty-state
 * suggestions. Multi-word suggestions are returned quoted so they search as
 * phrases.
 */
export function searchSuggestions(index: SearchIndex, limit = 6): string[] {
  const traitCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();
  for (const { card } of index.entries) {
    for (const trait of card.traits) bump(traitCounts, trait);
    for (const keyword of card.keywords) bump(keywordCounts, keyword);
  }
  const ranked = (counts: Map<string, number>) =>
    [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value]) => value);
  const keywordSlots = Math.min(2, Math.floor(limit / 3));
  const keywords = ranked(keywordCounts).slice(0, keywordSlots);
  const traits = ranked(traitCounts).slice(0, limit - keywords.length);
  return [...traits, ...keywords].map(phraseQuery);
}
