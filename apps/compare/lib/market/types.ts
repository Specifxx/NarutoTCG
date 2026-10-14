import type {
  CardCondition,
  CardFinish,
  CardType,
  CurrencyCode,
  NarutoCard,
  Rarity,
  VendorId,
} from "@naruto-tcg/types";

export type { CardCondition, CardFinish, CardType, CurrencyCode, Rarity, VendorId };

/** ISO calendar day in UTC, `YYYY-MM-DD`. */
export type IsoDay = string;

export interface CardSet {
  code: string;
  name: string;
  releasedOn: IsoDay;
}

/**
 * One priced product: a specific printing (set + number + finish).
 * `set` holds the set's display name; `setCode` is the join key.
 */
export interface MarketCard extends NarutoCard {
  setCode: string;
  finish: CardFinish;
  /** Character or card title shared by every printing, used to group variants. */
  character: string;
}

/** Low / mid / high / market for one vendor, in a single currency. Null when unknown. */
export interface PriceStats {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
}

/** Current price snapshot for one card at one vendor. */
export interface VendorQuote {
  cardId: string;
  vendor: VendorId;
  currency: CurrencyCode;
  /** Prices in the vendor's own currency. */
  native: PriceStats;
  /** The same prices converted to USD with the FX rate in force when captured. */
  usd: PriceStats;
  listingsCount: number;
  /** Product or search page on the vendor's site (not affiliate-wrapped). */
  url: string;
  updatedAt: string;
}

/** A single live offer from a seller. */
export interface VendorListing {
  id: string;
  cardId: string;
  vendor: VendorId;
  seller: string;
  condition: CardCondition;
  quantity: number;
  currency: CurrencyCode;
  price: number;
  /** Null when the vendor does not state shipping. */
  shipping: number | null;
  priceUsd: number;
  shippingUsd: number | null;
  /** priceUsd + (shippingUsd ?? 0). The comparison key. */
  totalUsd: number;
  url: string | null;
  updatedAt: string;
}

/**
 * One day of price history in USD. `market` is the cross-vendor aggregate
 * (see `aggregateMarket`); vendor keys hold that vendor's market price.
 */
export type PricePoint = { date: IsoDay; market: number | null } & Record<VendorId, number | null>;

export type ChangeWindow = "7d" | "30d" | "90d";

export interface PriceChange {
  /** Price on the base day (latest day at or before as-of minus the window). */
  from: number;
  to: number;
  abs: number;
  /** Percent, unrounded: (to - from) / from * 100. */
  pct: number;
}

/** One row of the price directory. All money in USD. */
export interface CardMarketSummary {
  card: MarketCard;
  /** Latest day with an aggregate market price, or null if never priced. */
  asOf: IsoDay | null;
  marketPrice: number | null;
  lowestPrice: number | null;
  lowestVendor: VendorId | null;
  vendorCount: number;
  listingsCount: number;
  changes: Record<ChangeWindow, PriceChange | null>;
  /** Aggregate market prices for days in (asOf - 30, asOf], oldest first, nulls skipped. */
  sparkline: number[];
  updatedAt: string | null;
}

export type SortKey =
  | "price-desc"
  | "price-asc"
  | "change7-desc"
  | "change7-asc"
  | "change30-desc"
  | "change30-asc"
  | "name-asc";

export interface MarketQuery {
  q?: string;
  sets?: string[];
  rarities?: Rarity[];
  finishes?: CardFinish[];
  sort?: SortKey;
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface MarketPage {
  items: CardMarketSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface MarketFacets {
  sets: FacetOption[];
  rarities: FacetOption[];
  finishes: FacetOption[];
}

export interface MarketMovers {
  window: ChangeWindow;
  gainers: CardMarketSummary[];
  losers: CardMarketSummary[];
  mostValuable: CardMarketSummary[];
}

export interface CardMarketDetail {
  summary: CardMarketSummary;
  /** One per vendor that has a snapshot, in VENDOR_ORDER. */
  quotes: VendorQuote[];
  /** Live listings across vendors, cheapest totalUsd first. */
  listings: VendorListing[];
  /** HISTORY_POINTS daily points, oldest first, covering [asOf - HISTORY_DAYS, asOf]; [] when never priced. */
  history: PricePoint[];
  /** Other printings that share `character`, most valuable first. */
  variants: CardMarketSummary[];
}

/** How an ingested price row identifies its card when the internal id is unknown. */
export interface CardRef {
  id?: string;
  name?: string;
  setCode?: string;
  number?: string;
  finish?: CardFinish;
  /** Only narrows otherwise ambiguous matches (e.g. foil vs parallel of the same number). */
  rarity?: Rarity;
}

export type CardResolution =
  | { status: "matched"; cardId: string }
  | { status: "not-found" }
  | { status: "ambiguous"; candidates: string[] };

/** A vendor snapshot after validation, card resolution and currency normalization. */
export interface NormalizedVendorSnapshot {
  cardId: string;
  vendor: VendorId;
  currency: CurrencyCode;
  /** UTC day the snapshot is filed under in price history. */
  day: IsoDay;
  capturedAt: string;
  native: PriceStats;
  usd: PriceStats;
  url: string | null;
  /** Undefined leaves stored listings untouched; an array (even empty) replaces them. */
  listings?: Omit<VendorListing, "id" | "cardId" | "vendor" | "updatedAt">[];
  /** Total listings the vendor reports; null = unknown, which keeps the stored count when `listings` is omitted. */
  listingsCount: number | null;
}

export interface IngestWriteResult {
  /** False when the repository cannot store data (seed / demo mode). */
  persisted: boolean;
  vendorQuotes: number;
  listings: number;
  historyPoints: number;
  marketPoints: number;
}

export interface RollupResult {
  persisted: boolean;
  day: IsoDay;
  /** Vendor history rows carried forward from the current snapshot. */
  carriedForward: number;
  /** Aggregate market rows (re)computed for the day. */
  marketPoints: number;
}

export type RepositoryMode = "seed" | "postgres";

/** Catalog-wide figures for the directory header. */
export interface MarketStats {
  /** Printings in the catalog. */
  cards: number;
  /** Newest vendor quote update across the catalog, or null before any prices. */
  lastUpdatedAt: string | null;
  /** True when the prices are simulated sample data: the seed repository, or a database loaded by db:seed. */
  demoData: boolean;
}

/**
 * Storage contract shared by the in-memory seed data and PostgreSQL / Supabase.
 * Both implementations must follow the semantics documented in `analytics.ts`
 * so that the two back ends rank and price cards identically.
 */
export interface MarketRepository {
  readonly mode: RepositoryMode;
  listSets(): Promise<CardSet[]>;
  getStats(): Promise<MarketStats>;
  /** Every card id, for the sitemap. */
  listCardIds(): Promise<string[]>;
  getFacets(): Promise<MarketFacets>;
  queryCards(query: MarketQuery): Promise<MarketPage>;
  getMovers(window: ChangeWindow, limit: number): Promise<MarketMovers>;
  getCardDetail(id: string): Promise<CardMarketDetail | null>;
  resolveCard(ref: CardRef): Promise<CardResolution>;
  ingest(snapshots: NormalizedVendorSnapshot[]): Promise<IngestWriteResult>;
  rollup(day: IsoDay): Promise<RollupResult>;
}

/** One vendor's prices for one card on one day (a `price_history` row). */
export interface VendorHistoryRow {
  cardId: string;
  vendor: VendorId;
  day: IsoDay;
  currency: CurrencyCode;
  native: PriceStats;
  usd: PriceStats;
  listingsCount: number;
}

/** Cross-vendor aggregate for one card on one day (a `market_price_daily` row). */
export interface MarketDailyRow {
  cardId: string;
  day: IsoDay;
  /** aggregateMarket() of that day's vendor usd.market values. */
  marketUsd: number | null;
  /** Vendors with a usable market price that day. */
  vendorCount: number;
}

/** A complete market snapshot: what the seed generator produces and what the database stores. */
export interface MarketDataset {
  sets: CardSet[];
  cards: MarketCard[];
  quotes: VendorQuote[];
  listings: VendorListing[];
  vendorHistory: VendorHistoryRow[];
  marketDaily: MarketDailyRow[];
}
