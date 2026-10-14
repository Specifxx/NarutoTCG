import {
  buildFacets,
  buildSummary,
  compareText,
  densifyHistory,
  emptyPoint,
  pickVariants,
  queryInMemory,
  rankMovers,
  sortListings,
  sortQuotes,
  todayUtc,
} from "./analytics";
import { HISTORY_POINTS } from "./constants";
import { getFxRates, type FxRates } from "./fx";
import { resolveCardRef } from "./resolve";
import { generateSeedDataset } from "./seed/dataset";
import type {
  CardMarketDetail,
  CardMarketSummary,
  CardRef,
  CardResolution,
  CardSet,
  ChangeWindow,
  IngestWriteResult,
  IsoDay,
  MarketCard,
  MarketDataset,
  MarketFacets,
  MarketMovers,
  MarketPage,
  MarketQuery,
  MarketRepository,
  MarketStats,
  NormalizedVendorSnapshot,
  PricePoint,
  RollupResult,
  VendorListing,
  VendorQuote,
} from "./types";

export interface SeedMarketRepositoryOptions {
  now?: () => Date;
  fx?: FxRates;
}

interface CardEntry {
  card: MarketCard;
  summary: CardMarketSummary;
  /** Every priced day, oldest first. */
  history: PricePoint[];
  quotes: VendorQuote[];
  listings: VendorListing[];
}

interface SeedState {
  day: IsoDay;
  sets: CardSet[];
  cards: MarketCard[];
  lastUpdatedAt: string | null;
  summaries: CardMarketSummary[];
  entries: Map<string, CardEntry>;
}

function groupByCard<T extends { cardId: string }>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.cardId);
    if (group) group.push(row);
    else groups.set(row.cardId, [row]);
  }
  return groups;
}

/** Each card's full daily history: the aggregate from marketDaily, vendor prices from vendorHistory. */
function buildHistories(dataset: MarketDataset): Map<string, PricePoint[]> {
  const byCard = new Map<string, Map<IsoDay, PricePoint>>();
  const pointFor = (cardId: string, day: IsoDay): PricePoint => {
    let days = byCard.get(cardId);
    if (!days) {
      days = new Map();
      byCard.set(cardId, days);
    }
    let point = days.get(day);
    if (!point) {
      point = emptyPoint(day);
      days.set(day, point);
    }
    return point;
  };
  for (const row of dataset.marketDaily) pointFor(row.cardId, row.day).market = row.marketUsd;
  for (const row of dataset.vendorHistory) pointFor(row.cardId, row.day)[row.vendor] = row.usd.market;
  return new Map(
    [...byCard].map(([cardId, days]) => [cardId, [...days.values()].sort((a, b) => compareText(a.date, b.date))]),
  );
}

function buildState(dataset: MarketDataset, day: IsoDay): SeedState {
  const histories = buildHistories(dataset);
  const quotes = groupByCard(dataset.quotes);
  const listings = groupByCard(dataset.listings);
  const entries = new Map<string, CardEntry>();
  for (const card of dataset.cards) {
    const history = histories.get(card.id) ?? [];
    const cardQuotes = quotes.get(card.id) ?? [];
    entries.set(card.id, {
      card,
      summary: buildSummary(card, history, cardQuotes),
      history,
      quotes: cardQuotes,
      listings: listings.get(card.id) ?? [],
    });
  }
  return {
    day,
    sets: [...dataset.sets].sort((a, b) => compareText(a.releasedOn, b.releasedOn) || compareText(a.code, b.code)),
    cards: dataset.cards,
    lastUpdatedAt: dataset.quotes.reduce<string | null>(
      (latest, q) => (latest === null || q.updatedAt > latest ? q.updatedAt : latest),
      null,
    ),
    summaries: [...entries.values()].map((entry) => entry.summary),
    entries,
  };
}

/**
 * Read-only market backed by the deterministic demo dataset. Used whenever no
 * database is configured; writes are validated upstream and reported as dry runs.
 */
export class SeedMarketRepository implements MarketRepository {
  readonly mode = "seed";
  private readonly now: () => Date;
  private readonly fx: FxRates;
  private memo: SeedState | undefined;

  constructor(options: SeedMarketRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.fx = options.fx ?? getFxRates();
  }

  /** The dataset for the current UTC day, regenerated when the day rolls over. */
  private state(): SeedState {
    const now = this.now();
    const day = todayUtc(now);
    if (this.memo?.day !== day) this.memo = buildState(generateSeedDataset({ now, fx: this.fx }), day);
    return this.memo;
  }

  async listSets(): Promise<CardSet[]> {
    return [...this.state().sets];
  }

  async getStats(): Promise<MarketStats> {
    const { cards, lastUpdatedAt } = this.state();
    return { cards: cards.length, lastUpdatedAt };
  }

  async getFacets(): Promise<MarketFacets> {
    const { cards, sets } = this.state();
    return buildFacets(cards, sets);
  }

  async queryCards(query: MarketQuery): Promise<MarketPage> {
    return queryInMemory(this.state().summaries, query);
  }

  async getMovers(window: ChangeWindow, limit: number): Promise<MarketMovers> {
    return rankMovers(this.state().summaries, window, limit);
  }

  async getCardDetail(id: string): Promise<CardMarketDetail | null> {
    const { entries, summaries } = this.state();
    const entry = entries.get(id);
    if (!entry) return null;
    const { card, summary } = entry;
    return {
      summary,
      quotes: sortQuotes(entry.quotes),
      listings: sortListings(entry.listings),
      history: summary.asOf ? densifyHistory(entry.history, summary.asOf, HISTORY_POINTS) : [],
      variants: pickVariants(card, summaries),
    };
  }

  async resolveCard(ref: CardRef): Promise<CardResolution> {
    return resolveCardRef(this.state().cards, ref);
  }

  async ingest(snapshots: NormalizedVendorSnapshot[]): Promise<IngestWriteResult> {
    return {
      persisted: false,
      vendorQuotes: snapshots.length,
      listings: snapshots.reduce((sum, s) => sum + (s.listings?.length ?? 0), 0),
      historyPoints: snapshots.length,
      marketPoints: new Set(snapshots.map((s) => `${s.cardId}\u0000${s.day}`)).size,
    };
  }

  async rollup(day: IsoDay): Promise<RollupResult> {
    let quoted = 0;
    for (const entry of this.state().entries.values()) if (entry.quotes.length > 0) quoted++;
    return { persisted: false, day, carriedForward: 0, marketPoints: quoted };
  }
}
