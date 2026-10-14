/**
 * Table rows for the market schema (supabase/migrations) and batched writes, shared by
 * the bulk loader below and PostgresMarketRepository's ingestion.
 */
import { toIsoDay } from "./analytics";
import type { Catalog } from "./catalog-schema";
import type { Sql, TransactionSql } from "./db";
import type {
  CardSet,
  CurrencyCode,
  IsoDay,
  MarketCard,
  MarketDailyRow,
  MarketDataset,
  PriceStats,
  VendorHistoryRow,
  VendorId,
  VendorListing,
  VendorQuote,
} from "./types";

/** market_meta key marking the simulated db:seed dataset. */
export const DEMO_DATA_KEY = "demo_data";

/** Rows per multi-row INSERT: 2000 rows x at most 14 columns stays under the 65,535-parameter limit. */
export const INSERT_CHUNK_ROWS = 2000;

/** Every market table, parents first. */
export const MARKET_TABLES = [
  "market_sets",
  "market_cards",
  "vendor_quotes",
  "vendor_listings",
  "price_history",
  "market_price_daily",
] as const;

export interface PriceColumns {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  low_usd: number | null;
  mid_usd: number | null;
  high_usd: number | null;
  market_usd: number | null;
}

export const PRICE_COLUMNS = [
  "low",
  "mid",
  "high",
  "market",
  "low_usd",
  "mid_usd",
  "high_usd",
  "market_usd",
] as const satisfies readonly (keyof PriceColumns)[];

export interface SetRow {
  code: string;
  name: string;
  released_on: IsoDay;
}

export interface CardRow {
  id: string;
  name: string;
  character: string;
  set_code: string;
  number: string;
  type: MarketCard["type"];
  rarity: MarketCard["rarity"];
  finish: MarketCard["finish"];
  village: string | null;
  cost: number | null;
  power: number | null;
  text: string | null;
  image_url: string | null;
}

export interface QuoteRow extends PriceColumns {
  card_id: string;
  vendor: VendorId;
  currency: CurrencyCode;
  listings_count: number;
  url: string | null;
  updated_at: string;
}

export interface ListingRow {
  id: string;
  card_id: string;
  vendor: VendorId;
  seller: string;
  condition: VendorListing["condition"];
  quantity: number;
  currency: CurrencyCode;
  price: number;
  shipping: number | null;
  price_usd: number;
  shipping_usd: number | null;
  total_usd: number;
  url: string | null;
  updated_at: string;
}

export interface HistoryRow extends PriceColumns {
  card_id: string;
  vendor: VendorId;
  day: IsoDay;
  currency: CurrencyCode;
  listings_count: number;
  captured_at: string;
}

export interface MarketDailyTableRow {
  card_id: string;
  day: IsoDay;
  market_usd: number | null;
  vendor_count: number;
}

const SET_COLUMNS = ["code", "name", "released_on"] as const satisfies readonly (keyof SetRow)[];
const CARD_COLUMNS = [
  "id",
  "name",
  "character",
  "set_code",
  "number",
  "type",
  "rarity",
  "finish",
  "village",
  "cost",
  "power",
  "text",
  "image_url",
] as const satisfies readonly (keyof CardRow)[];
export const QUOTE_COLUMNS = [
  "card_id",
  "vendor",
  "currency",
  ...PRICE_COLUMNS,
  "listings_count",
  "url",
  "updated_at",
] as const satisfies readonly (keyof QuoteRow)[];
export const LISTING_COLUMNS = [
  "id",
  "card_id",
  "vendor",
  "seller",
  "condition",
  "quantity",
  "currency",
  "price",
  "shipping",
  "price_usd",
  "shipping_usd",
  "total_usd",
  "url",
  "updated_at",
] as const satisfies readonly (keyof ListingRow)[];
export const HISTORY_COLUMNS = [
  "card_id",
  "vendor",
  "day",
  "currency",
  ...PRICE_COLUMNS,
  "listings_count",
  "captured_at",
] as const satisfies readonly (keyof HistoryRow)[];
export const MARKET_DAILY_COLUMNS = [
  "card_id",
  "day",
  "market_usd",
  "vendor_count",
] as const satisfies readonly (keyof MarketDailyTableRow)[];

export function priceColumns(native: PriceStats, usd: PriceStats): PriceColumns {
  return {
    low: native.low,
    mid: native.mid,
    high: native.high,
    market: native.market,
    low_usd: usd.low,
    mid_usd: usd.mid,
    high_usd: usd.high,
    market_usd: usd.market,
  };
}

export function setRow(set: CardSet): SetRow {
  return { code: set.code, name: set.name, released_on: set.releasedOn };
}

export function cardRow(card: MarketCard): CardRow {
  return {
    id: card.id,
    name: card.name,
    character: card.character,
    set_code: card.setCode,
    number: card.number,
    type: card.type,
    rarity: card.rarity,
    finish: card.finish,
    village: card.village ?? null,
    cost: card.cost ?? null,
    power: card.power ?? null,
    text: card.text ?? null,
    image_url: card.imageUrl ?? null,
  };
}

export function quoteRow(quote: VendorQuote): QuoteRow {
  return {
    card_id: quote.cardId,
    vendor: quote.vendor,
    currency: quote.currency,
    ...priceColumns(quote.native, quote.usd),
    listings_count: quote.listingsCount,
    url: quote.url,
    updated_at: quote.updatedAt,
  };
}

export function listingRow(listing: VendorListing): ListingRow {
  return {
    id: listing.id,
    card_id: listing.cardId,
    vendor: listing.vendor,
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
    updated_at: listing.updatedAt,
  };
}

export function historyRow(row: VendorHistoryRow, capturedAt: string): HistoryRow {
  return {
    card_id: row.cardId,
    vendor: row.vendor,
    day: row.day,
    currency: row.currency,
    ...priceColumns(row.native, row.usd),
    listings_count: row.listingsCount,
    captured_at: capturedAt,
  };
}

export function marketDailyRow(row: MarketDailyRow): MarketDailyTableRow {
  return { card_id: row.cardId, day: row.day, market_usd: row.marketUsd, vendor_count: row.vendorCount };
}

/** Runs `write` once per slice of at most INSERT_CHUNK_ROWS rows, in order. */
export async function forEachChunk<T>(rows: T[], write: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_ROWS) {
    await write(rows.slice(start, start + INSERT_CHUNK_ROWS));
  }
}

/**
 * Serializes every market write (ingest, rollup, bulk load) across connections, so
 * read-decide-write steps such as "is this snapshot newer than the stored quote?" stay
 * correct when two cron runs overlap. Released at commit or rollback.
 */
export async function lockMarketWrites(tx: TransactionSql): Promise<void> {
  await tx`select pg_advisory_xact_lock(hashtext('naruto-tcg/compare:market-writes'))`;
}

export type DatasetCounts = Record<keyof MarketDataset, number>;

export class MarketDataPresentError extends Error {
  constructor(cards: number, sets: number) {
    super(`The market tables already hold data (${cards} cards, ${sets} sets); load with replace to overwrite it.`);
    this.name = "MarketDataPresentError";
  }
}

async function setDemoData(tx: TransactionSql, demo: boolean): Promise<void> {
  if (demo) {
    await tx`
      insert into market_meta (key, value) values (${DEMO_DATA_KEY}, 'true')
      on conflict (key) do update set value = excluded.value, updated_at = now()`;
  } else {
    await tx`delete from market_meta where key = ${DEMO_DATA_KEY}`;
  }
}

/** The database stores each card's set name once, on market_sets, so the dataset must agree with it. */
function assertConsistentSets(dataset: Pick<MarketDataset, "sets" | "cards">): void {
  const names = new Map(dataset.sets.map((set) => [set.code, set.name]));
  for (const card of dataset.cards) {
    const name = names.get(card.setCode);
    if (name === undefined) throw new Error(`Card ${card.id} references unknown set ${card.setCode}`);
    if (name !== card.set) {
      throw new Error(`Card ${card.id} names its set "${card.set}" but set ${card.setCode} is "${name}"`);
    }
  }
}

/**
 * The capture time of a history row: the vendor quote's timestamp when the quote was
 * taken that day (today's rows), otherwise the start of the day.
 */
function historyCapturedAt(dataset: MarketDataset): (row: VendorHistoryRow) => string {
  const quoteTimes = new Map(dataset.quotes.map((q) => [`${q.cardId}\u0000${q.vendor}`, q.updatedAt]));
  return (row) => {
    const quotedAt = quoteTimes.get(`${row.cardId}\u0000${row.vendor}`);
    return quotedAt !== undefined && toIsoDay(new Date(quotedAt)) === row.day ? quotedAt : `${row.day}T00:00:00.000Z`;
  };
}

/**
 * Write a complete market dataset in one transaction with batched multi-row inserts.
 * `replace` empties the market tables first; otherwise loading into a database that
 * already holds market data throws MarketDataPresentError and changes nothing.
 */
export async function loadDataset(
  sql: Sql,
  dataset: MarketDataset,
  options: { replace: boolean },
): Promise<DatasetCounts> {
  assertConsistentSets(dataset);
  const capturedAt = historyCapturedAt(dataset);
  return sql.begin(async (tx) => {
    await lockMarketWrites(tx);
    if (options.replace) {
      // All six tables in one statement satisfies their mutual foreign keys. No CASCADE:
      // a table outside the market schema that references these must fail loudly, not be emptied.
      await tx`truncate ${tx([...MARKET_TABLES])}`;
    } else {
      const [present] = await tx<{ cards: number; sets: number }[]>`
        select (select count(*) from market_cards)::int as cards, (select count(*) from market_sets)::int as sets`;
      if (present && (present.cards > 0 || present.sets > 0)) throw new MarketDataPresentError(present.cards, present.sets);
    }
    await setDemoData(tx, true);
    const history = dataset.vendorHistory.map((row) => historyRow(row, capturedAt(row)));
    await forEachChunk(dataset.sets.map(setRow), (rows) => tx`insert into market_sets ${tx(rows, [...SET_COLUMNS])}`);
    await forEachChunk(dataset.cards.map(cardRow), (rows) => tx`insert into market_cards ${tx(rows, [...CARD_COLUMNS])}`);
    await forEachChunk(dataset.quotes.map(quoteRow), (rows) => tx`insert into vendor_quotes ${tx(rows, [...QUOTE_COLUMNS])}`);
    await forEachChunk(
      dataset.listings.map(listingRow),
      (rows) => tx`insert into vendor_listings ${tx(rows, [...LISTING_COLUMNS])}`,
    );
    await forEachChunk(history, (rows) => tx`insert into price_history ${tx(rows, [...HISTORY_COLUMNS])}`);
    await forEachChunk(
      dataset.marketDaily.map(marketDailyRow),
      (rows) => tx`insert into market_price_daily ${tx(rows, [...MARKET_DAILY_COLUMNS])}`,
    );
    return {
      sets: dataset.sets.length,
      cards: dataset.cards.length,
      quotes: dataset.quotes.length,
      listings: dataset.listings.length,
      vendorHistory: dataset.vendorHistory.length,
      marketDaily: dataset.marketDaily.length,
    };
  });
}

export interface CatalogCounts {
  sets: number;
  cards: number;
}

/**
 * Upsert the sets and printings ingestion can price, in one transaction; prices are never
 * touched. `replace` first empties every market table (prices included) and clears the
 * demo-data flag: the way to switch a database from the simulated demo to a real catalog.
 */
export async function loadCatalog(sql: Sql, catalog: Catalog, options: { replace: boolean }): Promise<CatalogCounts> {
  assertConsistentSets(catalog);
  return sql.begin(async (tx) => {
    await lockMarketWrites(tx);
    if (options.replace) {
      await tx`truncate ${tx([...MARKET_TABLES])}`;
      await setDemoData(tx, false);
    }
    await forEachChunk(
      catalog.sets.map(setRow),
      (rows) => tx`
        insert into market_sets ${tx(rows, [...SET_COLUMNS])}
        on conflict (code) do update set name = excluded.name, released_on = excluded.released_on`,
    );
    await forEachChunk(
      catalog.cards.map(cardRow),
      (rows) => tx`
        insert into market_cards ${tx(rows, [...CARD_COLUMNS])}
        on conflict (id) do update set
          name = excluded.name, character = excluded.character, set_code = excluded.set_code,
          number = excluded.number, type = excluded.type, rarity = excluded.rarity, finish = excluded.finish,
          village = excluded.village, cost = excluded.cost, power = excluded.power, text = excluded.text,
          image_url = excluded.image_url`,
    );
    return { sets: catalog.sets.length, cards: catalog.cards.length };
  });
}
