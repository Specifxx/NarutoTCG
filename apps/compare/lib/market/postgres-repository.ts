/**
 * MarketRepository over PostgreSQL / Supabase (schema: supabase/migrations).
 *
 * Reads go through the card_market_summary view, which reproduces analytics.buildSummary;
 * sorting, paging, ranking and facet ordering follow analytics.ts rule for rule, and the
 * integration test asserts parity with the in-memory seed repository. Money columns are
 * numeric(12,2) (exact cents), returned by postgres.js as strings and converted here; days
 * travel as `YYYY-MM-DD` text and timestamps as ISO strings, never as JS Dates.
 */
import {
  addDays,
  aggregateMarket,
  compareText,
  densifyHistory,
  emptyPoint,
  isIsoDay,
  isPrice,
  pageBounds,
  priceChange,
  searchTokens,
  sortListings,
  sortQuotes,
} from "./analytics";
import { CARRY_FORWARD_MAX_DAYS, CHANGE_WINDOWS, HISTORY_POINTS, MOVER_MIN_PRICE } from "./constants";
import type { Fragment, Sql, TransactionSql } from "./db";
import { DEFAULT_SORT, FINISH_LABEL, FINISH_ORDER, RARITY_LABEL, RARITY_ORDER } from "./labels";
import {
  forEachChunk,
  HISTORY_COLUMNS,
  LISTING_COLUMNS,
  lockMarketWrites,
  MARKET_DAILY_COLUMNS,
  priceColumns,
  QUOTE_COLUMNS,
  type HistoryRow,
  type ListingRow,
  type MarketDailyTableRow,
  type QuoteRow,
} from "./pg-dataset";
import { normalizeName, normalizeNumber, resolveCardRef } from "./resolve";
import type {
  CardFinish,
  CardMarketDetail,
  CardMarketSummary,
  CardRef,
  CardResolution,
  CardSet,
  ChangeWindow,
  CurrencyCode,
  FacetOption,
  IngestWriteResult,
  IsoDay,
  MarketCard,
  MarketFacets,
  MarketMovers,
  MarketPage,
  MarketQuery,
  MarketRepository,
  MarketStats,
  NormalizedVendorSnapshot,
  PriceChange,
  PricePoint,
  PriceStats,
  Rarity,
  RollupResult,
  SortKey,
  VendorId,
  VendorListing,
  VendorQuote,
} from "./types";
import { vendorSearchUrl } from "./vendors";

// ---------------------------------------------------------------- row shapes
// Enumerated text columns are typed by their CHECK constraints in the migration.

interface CardColumns {
  id: string;
  name: string;
  character: string;
  set_code: string;
  set_name: string;
  number: string;
  type: MarketCard["type"];
  rarity: Rarity;
  finish: CardFinish;
  village: string | null;
  cost: number | null;
  power: number | null;
  text: string | null;
  image_url: string | null;
}

interface SummaryRow extends CardColumns {
  as_of: IsoDay | null;
  market_price: string | null;
  base_7d: string | null;
  base_30d: string | null;
  base_90d: string | null;
  lowest_price: string | null;
  lowest_vendor: VendorId | null;
  vendor_count: number;
  listings_count: number;
  updated_at: string | null;
  sparkline: string[];
}

interface StatsColumns {
  low: string | null;
  mid: string | null;
  high: string | null;
  market: string | null;
  low_usd: string | null;
  mid_usd: string | null;
  high_usd: string | null;
  market_usd: string | null;
}

interface QuoteResultRow extends StatsColumns {
  vendor: VendorId;
  currency: CurrencyCode;
  listings_count: number;
  url: string | null;
  updated_at: string;
}

interface ListingResultRow {
  id: string;
  vendor: VendorId;
  seller: string;
  condition: VendorListing["condition"];
  quantity: number;
  currency: CurrencyCode;
  price: string;
  shipping: string | null;
  price_usd: string;
  shipping_usd: string | null;
  total_usd: string;
  url: string | null;
  updated_at: string;
}

interface HistoryResultRow {
  day: IsoDay;
  /** Null for the cross-vendor aggregate. */
  vendor: VendorId | null;
  market_usd: string | null;
}

/** One vendor's market price on one day, the input of the daily aggregate. */
interface DayPriceRow {
  card_id: string;
  day: IsoDay;
  market_usd: string | null;
}

// ---------------------------------------------------------------- conversions

function toRequiredNumber(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Expected a number from PostgreSQL, got ${JSON.stringify(value)}`);
  return number;
}

function toNumber(value: string | null): number | null {
  return value === null ? null : toRequiredNumber(value);
}

function toStats(row: StatsColumns, suffix: "" | "_usd"): PriceStats {
  const pick = (key: "low" | "mid" | "high" | "market") => toNumber(row[`${key}${suffix}`]);
  return { low: pick("low"), mid: pick("mid"), high: pick("high"), market: pick("market") };
}

function toCard(row: CardColumns): MarketCard {
  const card: MarketCard = {
    id: row.id,
    name: row.name,
    character: row.character,
    set: row.set_name,
    setCode: row.set_code,
    number: row.number,
    type: row.type,
    rarity: row.rarity,
    finish: row.finish,
  };
  if (row.village !== null) card.village = row.village;
  if (row.cost !== null) card.cost = row.cost;
  if (row.power !== null) card.power = row.power;
  if (row.text !== null) card.text = row.text;
  if (row.image_url !== null) card.imageUrl = row.image_url;
  return card;
}

function toSummary(row: SummaryRow): CardMarketSummary {
  const marketPrice = toNumber(row.market_price);
  const bases: Record<ChangeWindow, string | null> = { "7d": row.base_7d, "30d": row.base_30d, "90d": row.base_90d };
  const changes = Object.fromEntries(
    CHANGE_WINDOWS.map((window) => [window, priceChange(toNumber(bases[window]), marketPrice)]),
  ) as Record<ChangeWindow, PriceChange | null>;
  return {
    card: toCard(row),
    asOf: row.as_of,
    marketPrice,
    lowestPrice: toNumber(row.lowest_price),
    lowestVendor: row.lowest_vendor,
    vendorCount: row.vendor_count,
    listingsCount: row.listings_count,
    changes,
    sparkline: row.sparkline.map(toRequiredNumber),
    updatedAt: row.updated_at,
  };
}

/** Product page when the vendor gave one, else the same search page the seed catalog links to. */
function quoteUrl(url: string | null, vendor: VendorId, card: MarketCard): string {
  return url ?? vendorSearchUrl(vendor, card);
}

function likeContains(token: string): string {
  return `%${token.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/** `Array.prototype.slice(0, limit)` for the limits callers use; null means no LIMIT. */
function sqlLimit(limit: number): number | null {
  if (limit === Number.POSITIVE_INFINITY) return null;
  const whole = Math.trunc(limit);
  return Number.isFinite(whole) && whole > 0 ? whole : 0;
}

const pairKey = (cardId: string, vendor: VendorId) => `${cardId}\u0000${vendor}`;
const dayKey = (cardId: string, day: IsoDay) => `${cardId}\u0000${day}`;

/** Collector numbers this long lose precision in normalizeNumber (Number("…")), so no SQL shortcut applies. */
const LONG_DIGIT_RUN = /[1-9]\d{15}/;

/** Canonical last digit run of a normalized collector number ("P-7" → "7"), or null when it has none. */
function lastDigitRun(normalized: string): string | null {
  const match = /(\d+)\D*$/.exec(normalized);
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------- SQL pieces

const SORT_COLUMN: Record<SortKey, { column: string | null; descending: boolean }> = {
  "price-desc": { column: "market_price", descending: true },
  "price-asc": { column: "market_price", descending: false },
  "change7-desc": { column: "change_7d_pct", descending: true },
  "change7-asc": { column: "change_7d_pct", descending: false },
  "change30-desc": { column: "change_30d_pct", descending: true },
  "change30-asc": { column: "change_30d_pct", descending: false },
  "name-asc": { column: null, descending: false },
};

const CHANGE_COLUMN: Record<ChangeWindow, string> = {
  "7d": "change_7d_pct",
  "30d": "change_30d_pct",
  "90d": "change_90d_pct",
};

export class PostgresMarketRepository implements MarketRepository {
  readonly mode = "postgres";

  constructor(private readonly sql: Sql) {}

  // -------------------------------------------------------------- fragments

  private isoTimestamp(column: Fragment): Fragment {
    return this.sql`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
  }

  /** Card columns from `market_cards c join market_sets st`. */
  private cardColumns(): Fragment {
    const { sql } = this;
    return sql`
      c.id, c.name, c.character, c.set_code, st.name as set_name, c.number, c.type, c.rarity, c.finish,
      c.village, c.cost, c.power, c.text, c.image_url`;
  }

  /** Text-order tie-break shared by every listing: lower(name) by code unit, then id. */
  private byName(): Fragment {
    return this.sql`lower(c.name) collate "C", c.id collate "C"`;
  }

  /** The text analytics.searchText builds: name, character, set name, set code, number, id. */
  private searchText(): Fragment {
    return this.sql`lower(c.name || ' ' || c.character || ' ' || st.name || ' ' || c.set_code || ' ' || c.number || ' ' || c.id)`;
  }

  private and(conditions: Fragment[]): Fragment {
    const { sql } = this;
    return conditions.reduce((all, condition) => sql`${all} and ${condition}`, sql`true`);
  }

  private or(conditions: Fragment[]): Fragment {
    const { sql } = this;
    return conditions.reduce((either, condition) => sql`${either} or ${condition}`, sql`false`);
  }

  private queryFilter(query: MarketQuery): Fragment {
    const { sql } = this;
    const conditions: Fragment[] = [];
    if (query.sets?.length) conditions.push(sql`c.set_code = any(${query.sets}::text[])`);
    if (query.rarities?.length) conditions.push(sql`c.rarity = any(${query.rarities}::text[])`);
    if (query.finishes?.length) conditions.push(sql`c.finish = any(${query.finishes}::text[])`);
    for (const token of searchTokens(query.q)) {
      conditions.push(sql`${this.searchText()} like ${likeContains(token)}`);
    }
    return this.and(conditions);
  }

  private sortOrder(sort: SortKey): Fragment {
    const { sql } = this;
    const { column, descending } = SORT_COLUMN[sort];
    if (column === null) return this.byName();
    return sql`s.${sql(column)} ${descending ? sql`desc` : sql`asc`} nulls last, ${this.byName()}`;
  }

  private async summaries(
    where: Fragment,
    orderBy: Fragment,
    limit: number | null = null,
    offset = 0,
  ): Promise<CardMarketSummary[]> {
    const { sql } = this;
    const rows = await sql<SummaryRow[]>`
      select
        ${this.cardColumns()},
        to_char(s.as_of, 'YYYY-MM-DD') as as_of,
        s.market_price, s.base_7d, s.base_30d, s.base_90d,
        s.lowest_price, s.lowest_vendor, s.vendor_count, s.listings_count,
        ${this.isoTimestamp(sql`s.updated_at`)} as updated_at,
        s.sparkline
      from market_cards c
      join market_sets st on st.code = c.set_code
      join card_market_summary s on s.card_id = c.id
      where ${where}
      order by ${orderBy}
      limit ${limit} offset ${offset}`;
    return rows.map(toSummary);
  }

  // -------------------------------------------------------------- reads

  async listSets(): Promise<CardSet[]> {
    const rows = await this.sql<{ code: string; name: string; released_on: IsoDay }[]>`
      select code, name, to_char(released_on, 'YYYY-MM-DD') as released_on from market_sets`;
    return rows
      .map((row) => ({ code: row.code, name: row.name, releasedOn: row.released_on }))
      .sort((a, b) => compareText(a.releasedOn, b.releasedOn) || compareText(a.code, b.code));
  }

  async getStats(): Promise<MarketStats> {
    const [row] = await this.sql<{ cards: number; last_updated_at: string | null }[]>`
      select
        (select count(*)::int from market_cards) as cards,
        (select ${this.isoTimestamp(this.sql`max(updated_at)`)} from vendor_quotes) as last_updated_at`;
    return { cards: row?.cards ?? 0, lastUpdatedAt: row?.last_updated_at ?? null };
  }

  async getFacets(): Promise<MarketFacets> {
    const [sets, rows] = await Promise.all([
      this.listSets(),
      this.sql<{ set_code: string | null; rarity: Rarity | null; finish: CardFinish | null; count: number }[]>`
        select set_code, rarity, finish, count(*)::int as count
        from market_cards
        group by grouping sets ((set_code), (rarity), (finish))`,
    ]);
    const setCounts = new Map<string, number>();
    const rarityCounts = new Map<Rarity, number>();
    const finishCounts = new Map<CardFinish, number>();
    // The grouped columns are NOT NULL, so a null marks the grouping set a row belongs to.
    for (const row of rows) {
      if (row.set_code !== null) setCounts.set(row.set_code, row.count);
      else if (row.rarity !== null) rarityCounts.set(row.rarity, row.count);
      else if (row.finish !== null) finishCounts.set(row.finish, row.count);
    }
    const option = (value: string, label: string, count: number): FacetOption => ({ value, label, count });
    return {
      sets: sets.flatMap((set) => {
        const count = setCounts.get(set.code);
        return count ? [option(set.code, set.name, count)] : [];
      }),
      rarities: RARITY_ORDER.flatMap((rarity) => {
        const count = rarityCounts.get(rarity);
        return count ? [option(rarity, RARITY_LABEL[rarity], count)] : [];
      }),
      finishes: FINISH_ORDER.flatMap((finish) => {
        const count = finishCounts.get(finish);
        return count ? [option(finish, FINISH_LABEL[finish], count)] : [];
      }),
    };
  }

  async queryCards(query: MarketQuery): Promise<MarketPage> {
    const { sql } = this;
    const where = this.queryFilter(query);
    const [counted] = await sql<{ total: number }[]>`
      select count(*)::int as total
      from market_cards c
      join market_sets st on st.code = c.set_code
      where ${where}`;
    const total = counted?.total ?? 0;
    const { page, pageSize, pageCount, offset } = pageBounds(total, query);
    const items =
      total === 0 ? [] : await this.summaries(where, this.sortOrder(query.sort ?? DEFAULT_SORT), pageSize, offset);
    return { items, total, page, pageSize, pageCount };
  }

  async getMovers(window: ChangeWindow, limit: number): Promise<MarketMovers> {
    const { sql } = this;
    const pct = sql`s.${sql(CHANGE_COLUMN[window])}`;
    const byPrice = sql`s.market_price desc nulls last, ${this.byName()}`;
    const take = sqlLimit(limit);
    const eligible = sql`s.market_price >= ${MOVER_MIN_PRICE} and ${pct} is not null`;
    const [gainers, losers, mostValuable] = await Promise.all([
      this.summaries(sql`${eligible} and ${pct} > 0`, sql`${pct} desc, ${byPrice}`, take),
      this.summaries(sql`${eligible} and ${pct} < 0`, sql`${pct} asc, ${byPrice}`, take),
      this.summaries(sql`s.market_price is not null`, byPrice, take),
    ]);
    return { window, gainers, losers, mostValuable };
  }

  async getCardDetail(id: string): Promise<CardMarketDetail | null> {
    const { sql } = this;
    const [summary] = await this.summaries(sql`c.id = ${id}`, this.byName(), 1);
    if (!summary) return null;
    const { card, asOf } = summary;
    const [quotes, listings, history, variants] = await Promise.all([
      this.quotesFor(card),
      this.listingsFor(card.id),
      asOf ? this.historyFor(card.id, asOf) : Promise.resolve([]),
      this.summaries(
        sql`c.character = ${card.character} and c.id <> ${card.id}`,
        sql`s.market_price desc nulls last, ${this.byName()}`,
      ),
    ]);
    return { summary, quotes, listings, history, variants };
  }

  private async quotesFor(card: MarketCard): Promise<VendorQuote[]> {
    const rows = await this.sql<QuoteResultRow[]>`
      select vendor, currency, low, mid, high, market, low_usd, mid_usd, high_usd, market_usd,
             listings_count, url, ${this.isoTimestamp(this.sql`updated_at`)} as updated_at
      from vendor_quotes
      where card_id = ${card.id}`;
    return sortQuotes(
      rows.map((row) => ({
        cardId: card.id,
        vendor: row.vendor,
        currency: row.currency,
        native: toStats(row, ""),
        usd: toStats(row, "_usd"),
        listingsCount: row.listings_count,
        url: quoteUrl(row.url, row.vendor, card),
        updatedAt: row.updated_at,
      })),
    );
  }

  private async listingsFor(cardId: string): Promise<VendorListing[]> {
    const rows = await this.sql<ListingResultRow[]>`
      select id, vendor, seller, condition, quantity, currency, price, shipping, price_usd, shipping_usd,
             total_usd, url, ${this.isoTimestamp(this.sql`updated_at`)} as updated_at
      from vendor_listings
      where card_id = ${cardId}`;
    return sortListings(
      rows.map((row) => ({
        id: row.id,
        cardId,
        vendor: row.vendor,
        seller: row.seller,
        condition: row.condition,
        quantity: row.quantity,
        currency: row.currency,
        price: toRequiredNumber(row.price),
        shipping: toNumber(row.shipping),
        priceUsd: toRequiredNumber(row.price_usd),
        shippingUsd: toNumber(row.shipping_usd),
        totalUsd: toRequiredNumber(row.total_usd),
        url: row.url,
        updatedAt: row.updated_at,
      })),
    );
  }

  /** HISTORY_POINTS daily points ending at asOf: the aggregate plus each vendor's market price. */
  private async historyFor(cardId: string, asOf: IsoDay): Promise<PricePoint[]> {
    const after = addDays(asOf, -HISTORY_POINTS);
    const rows = await this.sql<HistoryResultRow[]>`
      select to_char(day, 'YYYY-MM-DD') as day, null::text as vendor, market_usd
      from market_price_daily
      where card_id = ${cardId} and day > ${after}::date and day <= ${asOf}::date
      union all
      select to_char(day, 'YYYY-MM-DD') as day, vendor, market_usd
      from price_history
      where card_id = ${cardId} and day > ${after}::date and day <= ${asOf}::date`;
    const points = new Map<IsoDay, PricePoint>();
    for (const row of rows) {
      let point = points.get(row.day);
      if (!point) {
        point = emptyPoint(row.day);
        points.set(row.day, point);
      }
      point[row.vendor ?? "market"] = toNumber(row.market_usd);
    }
    return densifyHistory([...points.values()], asOf, HISTORY_POINTS);
  }

  /**
   * Fetches a superset of the printings resolveCardRef could accept, then lets that pure
   * function decide. Every SQL condition below is implied by resolveCardRef's own match:
   * - id: ASCII lower-casing (`collate "C"`) equals JS toLowerCase for ASCII ids; ids with
   *   other characters are always fetched.
   * - set code: matched in JS against the (small) set list, so case rules are identical.
   * - number: per candidate set, the last digit run of the normalized number must agree
   *   with the card's last raw digit run without leading zeros ("1", "001", "NTG01-001").
   * - name: the ASCII form of normalizeName; names with other characters are always fetched.
   */
  async resolveCard(ref: CardRef): Promise<CardResolution> {
    const { sql } = this;
    const branches: Fragment[] = [];
    if (ref.id) {
      branches.push(sql`(lower(c.id collate "C") = ${ref.id.trim().toLowerCase()} or octet_length(c.id) <> length(c.id))`);
    }
    if (ref.setCode || ref.number || ref.name) {
      const setCodes = (await sql<{ code: string }[]>`select code from market_sets`).map((row) => row.code);
      const fields = this.fieldCandidates(ref, setCodes);
      if (fields) branches.push(fields);
    }
    if (branches.length === 0) return resolveCardRef([], ref);
    const rows = await sql<CardColumns[]>`
      select ${this.cardColumns()}
      from market_cards c
      join market_sets st on st.code = c.set_code
      where ${this.or(branches)}
      order by c.id collate "C"`;
    return resolveCardRef(rows.map(toCard), ref);
  }

  /**
   * The setCode / number / name / finish part of resolveCard's superset, or null when nothing
   * can match. Synchronous on purpose: a postgres.js fragment is thenable, so returning one
   * from an async function would run it as a query.
   */
  private fieldCandidates(ref: CardRef, setCodes: string[]): Fragment | null {
    const { sql } = this;
    const setKey = ref.setCode?.trim().toUpperCase();
    const sets = setKey ? setCodes.filter((code) => code.toUpperCase() === setKey) : setCodes;
    if (sets.length === 0) return null;

    // Sets grouped by the digit run their printings must end with; null = no number condition.
    const byDigits = new Map<string | null, string[]>();
    for (const code of sets) {
      const digits =
        ref.number && !LONG_DIGIT_RUN.test(ref.number) ? lastDigitRun(normalizeNumber(ref.number, code)) : null;
      byDigits.set(digits, [...(byDigits.get(digits) ?? []), code]);
    }
    const setConditions = [...byDigits].map(([digits, codes]) =>
      digits === null
        ? sql`c.set_code = any(${codes}::text[])`
        : sql`(c.set_code = any(${codes}::text[]) and (
            ltrim(substring(c.number from '([0-9]+)[^0-9]*$'), '0') = ${digits.replace(/^0+/, "")}
            or c.number ~ '[1-9][0-9]{15}'))`,
    );

    const conditions = [sql`(${this.or(setConditions)})`];
    const nameKey = ref.name ? normalizeName(ref.name) : "";
    if (nameKey) {
      conditions.push(sql`(octet_length(c.name) <> length(c.name)
        or btrim(regexp_replace(lower(c.name collate "C"), '[^a-z0-9]+', ' ', 'g')) = ${nameKey})`);
    }
    if (ref.finish) conditions.push(sql`c.finish = ${ref.finish}`);
    return sql`(${this.and(conditions)})`;
  }

  // -------------------------------------------------------------- writes

  /**
   * Applies snapshots in order, in one transaction. A snapshot becomes the current vendor
   * quote only if it is at least as new as the stored one, so a backfill never replaces
   * fresher data; its listings (when given) replace that vendor's listings at the same
   * moment. Every snapshot is filed in price_history under its day, where the latest
   * capture of that day wins, and each changed (card, day) market price is recomputed with
   * aggregateMarket in TypeScript.
   */
  async ingest(snapshots: NormalizedVendorSnapshot[]): Promise<IngestWriteResult> {
    if (snapshots.length === 0) {
      return { persisted: true, vendorQuotes: 0, listings: 0, historyPoints: 0, marketPoints: 0 };
    }
    return this.sql.begin(async (tx) => {
      await lockMarketWrites(tx);

      const pairs = [...new Map(snapshots.map((s) => [pairKey(s.cardId, s.vendor), s])).values()];
      const stored = await tx<{ card_id: string; vendor: VendorId; updated_at: string }[]>`
        select card_id, vendor, ${this.isoTimestamp(tx`updated_at`)} as updated_at
        from vendor_quotes
        where (card_id, vendor) in (
          select * from unnest(${pairs.map((s) => s.cardId)}::text[], ${pairs.map((s) => s.vendor)}::text[])
        )`;
      const currentAt = new Map(stored.map((row) => [pairKey(row.card_id, row.vendor), Date.parse(row.updated_at)]));
      const quoteWinners = new Map<string, NormalizedVendorSnapshot>();
      const listingWinners = new Map<string, NormalizedVendorSnapshot>();
      for (const snapshot of snapshots) {
        const key = pairKey(snapshot.cardId, snapshot.vendor);
        const capturedAt = Date.parse(snapshot.capturedAt);
        const current = currentAt.get(key);
        if (current !== undefined && capturedAt < current) continue;
        currentAt.set(key, capturedAt);
        quoteWinners.set(key, snapshot);
        if (snapshot.listings) listingWinners.set(key, snapshot);
      }

      const applied = new Set<string>();
      await forEachChunk([...quoteWinners.values()].map(snapshotQuoteRow), async (chunk) => {
        const rows = await tx<{ card_id: string; vendor: VendorId }[]>`
          insert into vendor_quotes ${tx(chunk, [...QUOTE_COLUMNS])}
          on conflict (card_id, vendor) do update set
            currency = excluded.currency,
            low = excluded.low, mid = excluded.mid, high = excluded.high, market = excluded.market,
            low_usd = excluded.low_usd, mid_usd = excluded.mid_usd,
            high_usd = excluded.high_usd, market_usd = excluded.market_usd,
            listings_count = excluded.listings_count,
            url = coalesce(excluded.url, vendor_quotes.url),
            updated_at = excluded.updated_at
          where vendor_quotes.updated_at <= excluded.updated_at
          returning card_id, vendor`;
        for (const row of rows) applied.add(pairKey(row.card_id, row.vendor));
      });

      const replaced = [...listingWinners].filter(([key]) => applied.has(key)).map(([, snapshot]) => snapshot);
      const listings = replaced.flatMap(snapshotListingRows);
      if (replaced.length > 0) {
        await tx`
          delete from vendor_listings
          where (card_id, vendor) in (
            select * from unnest(${replaced.map((s) => s.cardId)}::text[], ${replaced.map((s) => s.vendor)}::text[])
          )`;
        await forEachChunk(listings, (chunk) => tx`insert into vendor_listings ${tx(chunk, [...LISTING_COLUMNS])}`);
      }

      // Per (card, vendor, day) the latest capture wins; an equal one overwrites, so re-ingesting is idempotent.
      const latestPerDay = new Map<string, NormalizedVendorSnapshot>();
      for (const snapshot of snapshots) {
        const key = `${pairKey(snapshot.cardId, snapshot.vendor)}\u0000${snapshot.day}`;
        const kept = latestPerDay.get(key);
        if (!kept || Date.parse(snapshot.capturedAt) >= Date.parse(kept.capturedAt)) latestPerDay.set(key, snapshot);
      }
      const written: { card_id: string; day: IsoDay }[] = [];
      await forEachChunk([...latestPerDay.values()].map(snapshotHistoryRow), async (chunk) => {
        const rows = await tx<{ card_id: string; day: IsoDay }[]>`
          insert into price_history ${tx(chunk, [...HISTORY_COLUMNS])}
          on conflict (card_id, vendor, day) do update set
            currency = excluded.currency,
            low = excluded.low, mid = excluded.mid, high = excluded.high, market = excluded.market,
            low_usd = excluded.low_usd, mid_usd = excluded.mid_usd,
            high_usd = excluded.high_usd, market_usd = excluded.market_usd,
            listings_count = excluded.listings_count,
            captured_at = excluded.captured_at
          where price_history.captured_at <= excluded.captured_at
          returning card_id, to_char(day, 'YYYY-MM-DD') as day`;
        written.push(...rows);
      });

      const days = [...new Map(written.map((row) => [dayKey(row.card_id, row.day), row])).values()];
      const prices =
        days.length === 0
          ? []
          : await tx<DayPriceRow[]>`
              select card_id, to_char(day, 'YYYY-MM-DD') as day, market_usd
              from price_history
              where (card_id, day) in (
                select * from unnest(${days.map((row) => row.card_id)}::text[], ${days.map((row) => row.day)}::date[])
              )`;
      const marketPoints = await writeMarketDaily(tx, prices);

      return {
        persisted: true,
        vendorQuotes: applied.size,
        listings: listings.length,
        historyPoints: written.length,
        marketPoints,
      };
    });
  }

  /**
   * Daily close for `day`: every current vendor quote captured by the end of that day, no more
   * than CARRY_FORWARD_MAX_DAYS before it, and missing from the day's history is carried
   * forward into it, then the day's market price
   * is recomputed for each card with history that day. Running it again carries nothing.
   */
  async rollup(day: IsoDay): Promise<RollupResult> {
    if (!isIsoDay(day)) throw new Error(`rollup day must be YYYY-MM-DD, got "${day}"`);
    const endOfDay = `${addDays(day, 1)}T00:00:00.000Z`;
    const staleBefore = `${addDays(day, -CARRY_FORWARD_MAX_DAYS)}T00:00:00.000Z`;
    return this.sql.begin(async (tx) => {
      await lockMarketWrites(tx);
      const carried = await tx`
        insert into price_history (
          card_id, vendor, day, currency, low, mid, high, market, low_usd, mid_usd, high_usd, market_usd,
          listings_count, captured_at
        )
        select q.card_id, q.vendor, ${day}::date, q.currency,
               q.low, q.mid, q.high, q.market, q.low_usd, q.mid_usd, q.high_usd, q.market_usd,
               q.listings_count, q.updated_at
        from vendor_quotes q
        where q.updated_at < ${endOfDay}::timestamptz and q.updated_at >= ${staleBefore}::timestamptz
        on conflict (card_id, vendor, day) do nothing
        returning card_id`;
      const prices = await tx<DayPriceRow[]>`
        select card_id, to_char(day, 'YYYY-MM-DD') as day, market_usd
        from price_history
        where day = ${day}::date`;
      const marketPoints = await writeMarketDaily(tx, prices);
      return { persisted: true, day, carriedForward: carried.length, marketPoints };
    });
  }
}

// ---------------------------------------------------------------- write helpers

function snapshotQuoteRow(snapshot: NormalizedVendorSnapshot): QuoteRow {
  return {
    card_id: snapshot.cardId,
    vendor: snapshot.vendor,
    currency: snapshot.currency,
    ...priceColumns(snapshot.native, snapshot.usd),
    listings_count: snapshot.listingsCount,
    url: snapshot.url,
    updated_at: snapshot.capturedAt,
  };
}

/** Stable ids `<cardId>:<vendor>:<n>` in the snapshot's order, as in the seed catalog. */
function snapshotListingRows(snapshot: NormalizedVendorSnapshot): ListingRow[] {
  return (snapshot.listings ?? []).map((listing, index) => ({
    id: `${snapshot.cardId}:${snapshot.vendor}:${index + 1}`,
    card_id: snapshot.cardId,
    vendor: snapshot.vendor,
    seller: listing.seller,
    condition: listing.condition,
    quantity: listing.quantity,
    currency: listing.currency,
    price: listing.price,
    shipping: listing.shipping,
    price_usd: listing.priceUsd,
    shipping_usd: listing.shippingUsd,
    total_usd: listing.totalUsd,
    url: listing.url,
    updated_at: snapshot.capturedAt,
  }));
}

function snapshotHistoryRow(snapshot: NormalizedVendorSnapshot): HistoryRow {
  return {
    card_id: snapshot.cardId,
    vendor: snapshot.vendor,
    day: snapshot.day,
    currency: snapshot.currency,
    ...priceColumns(snapshot.native, snapshot.usd),
    listings_count: snapshot.listingsCount,
    captured_at: snapshot.capturedAt,
  };
}

/** Upserts market_price_daily for every (card, day) in `prices`; returns the rows written. */
async function writeMarketDaily(tx: TransactionSql, prices: DayPriceRow[]): Promise<number> {
  const grouped = new Map<string, { cardId: string; day: IsoDay; values: Array<number | null> }>();
  for (const row of prices) {
    const key = dayKey(row.card_id, row.day);
    const group = grouped.get(key) ?? { cardId: row.card_id, day: row.day, values: [] };
    group.values.push(toNumber(row.market_usd));
    grouped.set(key, group);
  }
  const rows: MarketDailyTableRow[] = [...grouped.values()].map(({ cardId, day, values }) => ({
    card_id: cardId,
    day,
    market_usd: aggregateMarket(values),
    vendor_count: values.filter(isPrice).length,
  }));
  await forEachChunk(
    rows,
    (chunk) => tx`
      insert into market_price_daily ${tx(chunk, [...MARKET_DAILY_COLUMNS])}
      on conflict (card_id, day) do update set
        market_usd = excluded.market_usd,
        vendor_count = excluded.vendor_count`,
  );
  return rows.length;
}
