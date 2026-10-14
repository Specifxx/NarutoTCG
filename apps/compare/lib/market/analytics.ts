/**
 * Market analytics: the single source of truth for how prices are aggregated,
 * compared and ranked. The seed repository calls these functions directly;
 * the PostgreSQL repository reproduces the same rules in SQL (see the
 * `card_market_summary` view), and its integration test asserts parity.
 *
 * Rules
 * - Money is USD rounded to cents. Aggregation happens in integer cents so
 *   JS and Postgres `numeric` agree (half-cents round up).
 * - Aggregate market price for a day = median of that day's vendor market
 *   prices (USD, non-null, > 0). Computed in TS at write time, never in SQL.
 * - asOf = latest day with a non-null aggregate market price.
 * - Change over N days compares the aggregate at asOf with the latest
 *   non-null aggregate on or before asOf - N. Null if either is missing or
 *   the base is not positive.
 * - A vendor quote is current while it was captured on or after asOf - CARRY_FORWARD_MAX_DAYS
 *   (UTC midnight). Lowest price, vendor and listing counts, and the card page's quotes and
 *   listings use current quotes only, matching what the market aggregate still includes.
 * - Lowest price = min of current vendor `usd.low`; ties go to VENDOR_ORDER.
 * - Movers rank only cards whose asOf is within MOVER_MAX_LAG_DAYS of the catalog's latest
 *   asOf; gainers / losers also need |change| >= MOVER_MIN_PCT.
 * - Text ordering compares lower-cased strings by code unit
 *   (Postgres: `lower(x) collate "C"`), then the card id.
 */
import {
  CARRY_FORWARD_MAX_DAYS,
  CHANGE_WINDOW_DAYS,
  CHANGE_WINDOWS,
  DEFAULT_PAGE_SIZE,
  HISTORY_POINTS,
  MAX_PAGE_SIZE,
  MOVER_MAX_LAG_DAYS,
  MOVER_MIN_PCT,
  MOVER_MIN_PRICE,
  SPARKLINE_DAYS,
} from "./constants";
import { DEFAULT_SORT, FINISH_LABEL, FINISH_ORDER, RARITY_LABEL, RARITY_ORDER } from "./labels";
import type {
  CardMarketSummary,
  CardSet,
  ChangeWindow,
  IsoDay,
  MarketCard,
  MarketFacets,
  MarketMovers,
  MarketPage,
  MarketQuery,
  PriceChange,
  PricePoint,
  PriceStats,
  SortKey,
  VendorId,
  VendorListing,
  VendorQuote,
} from "./types";
import { vendorRank } from "./vendors";

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------- money

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Round to cents, half away from zero, tolerant of binary float error (1.005 → 1.01). */
export function roundMoney(amount: number): number {
  const sign = amount < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(amount) * 100 + 1e-7)) / 100;
}

/** A usable price: finite and positive. Zero and null mean "unknown". */
export function isPrice(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Median in integer cents; an even count averages the middle pair and rounds half-cents up. */
export function medianMoney(values: number[]): number | null {
  const cents = values.filter(isPrice).map(toCents).sort((a, b) => a - b);
  if (cents.length === 0) return null;
  const mid = cents.length >> 1;
  const median = cents.length % 2 === 1 ? cents[mid]! : (cents[mid - 1]! + cents[mid]!) / 2;
  return Math.round(median) / 100;
}

/** Cross-vendor aggregate market price for one day. */
export function aggregateMarket(values: Array<number | null | undefined>): number | null {
  return medianMoney(values.filter(isPrice));
}

/** low / mid / high from raw listing prices. `market` is left for the vendor to supply. */
export function summarizeListingPrices(prices: number[]): PriceStats {
  const valid = prices.filter(isPrice);
  if (valid.length === 0) return { low: null, mid: null, high: null, market: null };
  return {
    low: roundMoney(Math.min(...valid)),
    mid: medianMoney(valid),
    high: roundMoney(Math.max(...valid)),
    market: null,
  };
}

// ---------------------------------------------------------------- days

export function toIsoDay(date: Date): IsoDay {
  return date.toISOString().slice(0, 10);
}

export function todayUtc(now: Date = new Date()): IsoDay {
  return toIsoDay(now);
}

export function addDays(day: IsoDay, days: number): IsoDay {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: IsoDay, to: IsoDay): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function isIsoDay(value: unknown): value is IsoDay {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
  );
}

// ---------------------------------------------------------------- history

type SeriesKey = "market" | VendorId;

/** Latest non-null value of `key` dated on or before `day`. `history` must be oldest first. */
export function priceAtOrBefore(history: PricePoint[], day: IsoDay, key: SeriesKey = "market"): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const point = history[i]!;
    if (point.date > day) continue;
    const value = point[key];
    if (value != null) return value;
  }
  return null;
}

/** Latest day with a non-null aggregate market price. */
export function latestMarketDay(history: PricePoint[]): IsoDay | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]!.market != null) return history[i]!.date;
  }
  return null;
}

/** Change from a base price to a current one; null when either is missing or the base is not positive. */
export function priceChange(from: number | null, to: number | null): PriceChange | null {
  if (to == null || from == null || from <= 0) return null;
  return { from, to, abs: roundMoney(to - from), pct: ((to - from) / from) * 100 };
}

export function computeChange(history: PricePoint[], asOf: IsoDay, window: ChangeWindow): PriceChange | null {
  return priceChange(priceAtOrBefore(history, addDays(asOf, -CHANGE_WINDOW_DAYS[window])), priceAtOrBefore(history, asOf));
}

/** Aggregate prices in (asOf - days, asOf], oldest first, nulls skipped. */
export function sparklineValues(history: PricePoint[], asOf: IsoDay, days: number = SPARKLINE_DAYS): number[] {
  const start = addDays(asOf, -days);
  return history
    .filter((p) => p.date > start && p.date <= asOf && p.market != null)
    .map((p) => p.market as number);
}

export function emptyPoint(date: IsoDay): PricePoint {
  return { date, market: null, tcgplayer: null, ebay: null, cardmarket: null };
}

/**
 * Exactly `days` consecutive daily points ending at `end`, oldest first.
 * Card detail uses HISTORY_POINTS so the 90-day change's base day is on the chart.
 * Days without data become all-null points so charts keep a continuous axis.
 */
export function densifyHistory(history: PricePoint[], end: IsoDay, days: number = HISTORY_POINTS): PricePoint[] {
  const byDate = new Map(history.map((p) => [p.date, p]));
  const out: PricePoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(end, -offset);
    out.push(byDate.get(date) ?? emptyPoint(date));
  }
  return out;
}

// ---------------------------------------------------------------- summaries

/** Earliest capture time (ISO) a quote may have and still count as current for a card priced on `asOf`. */
export function quoteFreshSince(asOf: IsoDay): string {
  return `${addDays(asOf, -CARRY_FORWARD_MAX_DAYS)}T00:00:00.000Z`;
}

/** Quotes still current for a card priced on `asOf`; all of them when it was never priced. */
export function currentQuotes<T extends { updatedAt: string }>(quotes: T[], asOf: IsoDay | null): T[] {
  if (asOf === null) return quotes;
  const since = Date.parse(quoteFreshSince(asOf));
  return quotes.filter((q) => Date.parse(q.updatedAt) >= since);
}

export function lowestQuote(quotes: VendorQuote[]): { price: number; vendor: VendorId } | null {
  let best: { price: number; vendor: VendorId } | null = null;
  for (const quote of quotes) {
    const price = quote.usd.low;
    if (!isPrice(price)) continue;
    if (
      best === null ||
      price < best.price ||
      (price === best.price && vendorRank(quote.vendor) < vendorRank(best.vendor))
    ) {
      best = { price, vendor: quote.vendor };
    }
  }
  return best;
}

/** Build a directory row from a card's full history (oldest first) and current vendor quotes. */
export function buildSummary(card: MarketCard, history: PricePoint[], allQuotes: VendorQuote[]): CardMarketSummary {
  const asOf = latestMarketDay(history);
  const quotes = currentQuotes(allQuotes, asOf);
  const lowest = lowestQuote(quotes);
  const changes = Object.fromEntries(
    CHANGE_WINDOWS.map((w) => [w, asOf ? computeChange(history, asOf, w) : null]),
  ) as Record<ChangeWindow, PriceChange | null>;
  const updatedAt = quotes.reduce<string | null>(
    (latest, q) => (latest === null || q.updatedAt > latest ? q.updatedAt : latest),
    null,
  );
  return {
    card,
    asOf,
    marketPrice: asOf ? priceAtOrBefore(history, asOf) : null,
    lowestPrice: lowest?.price ?? null,
    lowestVendor: lowest?.vendor ?? null,
    vendorCount: quotes.length,
    listingsCount: quotes.reduce((sum, q) => sum + q.listingsCount, 0),
    changes,
    sparkline: asOf ? sparklineValues(history, asOf) : [],
    updatedAt,
  };
}

export function sortQuotes(quotes: VendorQuote[]): VendorQuote[] {
  return [...quotes].sort((a, b) => vendorRank(a.vendor) - vendorRank(b.vendor));
}

/** Cheapest delivered price first; ties by vendor order, then id. */
export function sortListings(listings: VendorListing[]): VendorListing[] {
  return [...listings].sort(
    (a, b) =>
      a.totalUsd - b.totalUsd ||
      vendorRank(a.vendor) - vendorRank(b.vendor) ||
      compareText(a.id, b.id),
  );
}

// ---------------------------------------------------------------- query

/** Code-unit comparison of lower-cased text (Postgres: `lower(x) collate "C"`). */
export function compareText(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

function compareByName(a: CardMarketSummary, b: CardMarketSummary): number {
  return compareText(a.card.name, b.card.name) || (a.card.id < b.card.id ? -1 : a.card.id > b.card.id ? 1 : 0);
}

/** Nulls always sort last, whichever the direction. */
function compareNullable(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

const SORT_VALUE: Record<SortKey, { value: (s: CardMarketSummary) => number | null; direction: 1 | -1 }> = {
  "price-desc": { value: (s) => s.marketPrice, direction: -1 },
  "price-asc": { value: (s) => s.marketPrice, direction: 1 },
  "change7-desc": { value: (s) => s.changes["7d"]?.pct ?? null, direction: -1 },
  "change7-asc": { value: (s) => s.changes["7d"]?.pct ?? null, direction: 1 },
  "change30-desc": { value: (s) => s.changes["30d"]?.pct ?? null, direction: -1 },
  "change30-asc": { value: (s) => s.changes["30d"]?.pct ?? null, direction: 1 },
  "name-asc": { value: () => null, direction: 1 },
};

export function sortSummaries(items: CardMarketSummary[], sort: SortKey = DEFAULT_SORT): CardMarketSummary[] {
  const { value, direction } = SORT_VALUE[sort];
  return [...items].sort((a, b) => compareNullable(value(a), value(b), direction) || compareByName(a, b));
}

/** Lower-cased whitespace tokens; every token must appear in the card's search text. */
export function searchTokens(q: string | undefined): string[] {
  return (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

/** Text the free-text search runs against (Postgres must concatenate the same fields with spaces). */
export function searchText(card: MarketCard): string {
  return [card.name, card.character, card.set, card.setCode, card.number, card.id].join(" ").toLowerCase();
}

export function matchesQuery(card: MarketCard, query: MarketQuery): boolean {
  if (query.sets?.length && !query.sets.includes(card.setCode)) return false;
  if (query.rarities?.length && !query.rarities.includes(card.rarity)) return false;
  if (query.finishes?.length && !query.finishes.includes(card.finish)) return false;
  const tokens = searchTokens(query.q);
  if (tokens.length === 0) return true;
  const text = searchText(card);
  return tokens.every((t) => text.includes(t));
}

export function clampPageSize(pageSize: number | undefined): number {
  if (!pageSize || !Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
}

export interface PageBounds {
  page: number;
  pageSize: number;
  pageCount: number;
  offset: number;
}

/** Page arithmetic for `total` rows. A page past the end clamps to the last page; pageCount is at least 1. */
export function pageBounds(total: number, query: Pick<MarketQuery, "page" | "pageSize">): PageBounds {
  const pageSize = clampPageSize(query.pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(query.page ?? 1) || 1));
  return { page, pageSize, pageCount, offset: (page - 1) * pageSize };
}

export function paginate(items: CardMarketSummary[], query: MarketQuery): MarketPage {
  const { page, pageSize, pageCount, offset } = pageBounds(items.length, query);
  return { items: items.slice(offset, offset + pageSize), total: items.length, page, pageSize, pageCount };
}

export function queryInMemory(summaries: CardMarketSummary[], query: MarketQuery): MarketPage {
  const filtered = summaries.filter((s) => matchesQuery(s.card, query));
  return paginate(sortSummaries(filtered, query.sort), query);
}

// ---------------------------------------------------------------- rankings

/** `limit` is clamped to a whole number >= 0; Infinity means no limit. */
export function rankMovers(summaries: CardMarketSummary[], window: ChangeWindow, limit: number): MarketMovers {
  const take = Number.isNaN(limit) ? 0 : Math.max(0, Math.trunc(limit));
  const pct = (s: CardMarketSummary) => s.changes[window]?.pct ?? 0;
  const latest = summaries.reduce<IsoDay | null>((max, s) => (s.asOf && (!max || s.asOf > max) ? s.asOf : max), null);
  const cutoff = latest ? addDays(latest, -MOVER_MAX_LAG_DAYS) : null;
  const current = summaries.filter((s) => cutoff !== null && s.asOf !== null && s.asOf >= cutoff);
  const eligible = current.filter(
    (s) => s.marketPrice != null && s.marketPrice >= MOVER_MIN_PRICE && s.changes[window] != null,
  );
  const byPrice = (a: CardMarketSummary, b: CardMarketSummary) =>
    compareNullable(a.marketPrice, b.marketPrice, -1) || compareByName(a, b);
  return {
    window,
    gainers: eligible
      .filter((s) => pct(s) >= MOVER_MIN_PCT)
      .sort((a, b) => pct(b) - pct(a) || byPrice(a, b))
      .slice(0, take),
    losers: eligible
      .filter((s) => pct(s) <= -MOVER_MIN_PCT)
      .sort((a, b) => pct(a) - pct(b) || byPrice(a, b))
      .slice(0, take),
    mostValuable: current
      .filter((s) => s.marketPrice != null)
      .sort(byPrice)
      .slice(0, take),
  };
}

/** Other printings of the same character, most valuable first. */
export function pickVariants(card: MarketCard, summaries: CardMarketSummary[]): CardMarketSummary[] {
  return summaries
    .filter((s) => s.card.character === card.character && s.card.id !== card.id)
    .sort((a, b) => compareNullable(a.marketPrice, b.marketPrice, -1) || compareByName(a, b));
}

/** Facet options with non-zero counts. Sets in release order; rarities and finishes in label order. */
export function buildFacets(cards: MarketCard[], sets: CardSet[]): MarketFacets {
  const count = <K extends string>(key: (c: MarketCard) => K) => {
    const counts = new Map<K, number>();
    for (const card of cards) counts.set(key(card), (counts.get(key(card)) ?? 0) + 1);
    return counts;
  };
  const setCounts = count((c) => c.setCode);
  const rarityCounts = count((c) => c.rarity);
  const finishCounts = count((c) => c.finish);
  return {
    sets: [...sets]
      .sort((a, b) => compareText(a.releasedOn, b.releasedOn) || compareText(a.code, b.code))
      .filter((s) => setCounts.has(s.code))
      .map((s) => ({ value: s.code, label: s.name, count: setCounts.get(s.code)! })),
    rarities: RARITY_ORDER.filter((r) => rarityCounts.has(r)).map((r) => ({
      value: r,
      label: RARITY_LABEL[r],
      count: rarityCounts.get(r)!,
    })),
    finishes: FINISH_ORDER.filter((f) => finishCounts.has(f)).map((f) => ({
      value: f,
      label: FINISH_LABEL[f],
      count: finishCounts.get(f)!,
    })),
  };
}

