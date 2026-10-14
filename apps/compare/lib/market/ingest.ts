/**
 * Price ingestion pipeline behind /api/prices/cron.
 *
 * validate envelope → validate + normalize each item → resolve cards → dedupe → one repository write.
 * A bad row is reported in `rejected` and never sinks the batch. Storage is reached only
 * through MarketRepository, so the seed back end gives a dry run and Postgres persists.
 */
import { isIsoDay, roundMoney, summarizeListingPrices, todayUtc, toIsoDay } from "./analytics";
import { getFxRates, statsToUsd, toUsd, type FxRates } from "./fx";
import {
  describeZodError,
  IngestEnvelopeSchema,
  IngestItemSchema,
  type ApiError,
  type IngestAccepted,
  type IngestItem,
  type IngestRejection,
  type IngestResponse,
} from "./ingest-schema";
import type {
  CardRef,
  CardResolution,
  MarketRepository,
  NormalizedVendorSnapshot,
  PriceStats,
  RollupResult,
} from "./types";
import { VENDORS } from "./vendors";

type Env = Record<string, string | undefined>;

export interface IngestDeps {
  repo: MarketRepository;
  /** Read for FX_EUR_USD. Defaults to process.env. */
  env?: Env;
  now?: () => Date;
}

export type IngestMode = IngestResponse["mode"];
export type RollupResponse = RollupResult & { ok: true; mode: IngestMode };

export interface IngestOutcome {
  status: number;
  body: IngestResponse | ApiError;
}

export interface RollupOutcome {
  status: number;
  body: RollupResponse | ApiError;
}

export type SnapshotDraft = Omit<NormalizedVendorSnapshot, "cardId">;

export type NormalizeResult = { ok: true; snapshot: SnapshotDraft } | { ok: false; reason: string };

export interface NormalizeContext {
  /** The envelope's capturedAt; an item's own capturedAt overrides it. */
  capturedAt: string;
  fx: FxRates;
  now: Date;
}

/** Scraper clocks drift; anything further ahead than this is a bug, not a timezone. */
const MAX_FUTURE_SKEW_MINUTES = 10;
/** Oldest capture accepted, so a backfill can cover a little over a year of history. */
const MAX_AGE_DAYS = 400;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
/** Ambiguity messages list at most this many candidate ids. */
const MAX_LISTED_CANDIDATES = 5;

const REF_FIELDS = ["id", "name", "setCode", "number", "finish", "rarity"] as const;

const defaultNow = () => new Date();

function modeOf(persisted: boolean): IngestMode {
  return persisted ? "persisted" : "dry-run";
}

/** Rounded to cents; missing, zero and sub-cent values are unknown. */
function nativePrice(value: number | null | undefined): number | null {
  const rounded = value == null ? 0 : roundMoney(value);
  return rounded > 0 ? rounded : null;
}

function invalid(reason: string): NormalizeResult {
  return { ok: false, reason };
}

/**
 * Turn one validated item into a vendor snapshot: effective capture time and UTC day,
 * currency, native stats (supplied values first, listing-derived values fill the gaps),
 * USD conversion and USD-priced listings sorted cheapest delivered first.
 */
export function normalizeItem(item: IngestItem, context: NormalizeContext): NormalizeResult {
  const captured = new Date(item.capturedAt ?? context.capturedAt);
  const capturedAt = captured.toISOString();
  const ageMs = context.now.getTime() - captured.getTime();
  if (ageMs < -MAX_FUTURE_SKEW_MINUTES * MINUTE_MS) {
    return invalid(`capturedAt ${capturedAt} is more than ${MAX_FUTURE_SKEW_MINUTES} minutes in the future`);
  }
  if (ageMs > MAX_AGE_DAYS * DAY_MS) {
    return invalid(`capturedAt ${capturedAt} is more than ${MAX_AGE_DAYS} days old`);
  }

  const currency = item.currency ?? VENDORS[item.vendor].currency;
  const { fx } = context;

  let listings: SnapshotDraft["listings"];
  if (item.listings) {
    listings = [];
    for (const [i, listing] of item.listings.entries()) {
      const price = roundMoney(listing.price);
      const priceUsd = toUsd(price, currency, fx);
      if (priceUsd <= 0) return invalid(`listings.${i}.price: must be at least one cent`);
      const shipping = listing.shipping == null ? null : roundMoney(listing.shipping);
      const shippingUsd = shipping == null ? null : toUsd(shipping, currency, fx);
      listings.push({
        seller: listing.seller,
        condition: listing.condition,
        quantity: listing.quantity,
        currency,
        price,
        shipping,
        priceUsd,
        shippingUsd,
        totalUsd: roundMoney(priceUsd + (shippingUsd ?? 0)),
        url: listing.url ?? null,
      });
    }
    listings.sort((a, b) => a.totalUsd - b.totalUsd);
  }

  const supplied = item.prices ?? {};
  const fromListings = summarizeListingPrices(listings?.map((l) => l.price) ?? []);
  const low = nativePrice(supplied.low) ?? fromListings.low;
  const mid = nativePrice(supplied.mid) ?? fromListings.mid;
  const high = nativePrice(supplied.high) ?? fromListings.high;
  const native: PriceStats = { low, mid, high, market: nativePrice(supplied.market) ?? mid };

  if (low !== null && high !== null && low > high) return invalid("prices.low exceeds prices.high");
  if (Object.values(native).every((v) => v === null)) {
    return invalid("item needs at least one price of one cent or more");
  }

  return {
    ok: true,
    snapshot: {
      vendor: item.vendor,
      currency,
      day: toIsoDay(captured),
      capturedAt,
      native,
      usd: statsToUsd(native, currency, fx),
      url: item.url ?? null,
      ...(listings && { listings }),
      listingsCount: Math.max(listings?.length ?? 0, item.listingsCount ?? 0),
    },
  };
}

/** "setCode=NTG01, number=001, finish=foil" */
function describeRef(ref: CardRef): string {
  return REF_FIELDS.filter((field) => ref[field] !== undefined)
    .map((field) => `${field}=${ref[field]}`)
    .join(", ");
}

function describeResolutionFailure(ref: CardRef, resolution: Exclude<CardResolution, { status: "matched" }>): string {
  if (resolution.status === "not-found") return `unknown card (${describeRef(ref)})`;
  const { candidates } = resolution;
  const listed = candidates.slice(0, MAX_LISTED_CANDIDATES).join(", ");
  const more = candidates.length > MAX_LISTED_CANDIDATES ? ` (+${candidates.length - MAX_LISTED_CANDIDATES} more)` : "";
  return `ambiguous card: matches ${listed}${more}; add finish or rarity`;
}

/** Card lookup that asks the repository once per distinct ref within a batch. */
function memoizedResolver(repo: MarketRepository): (ref: CardRef) => Promise<CardResolution> {
  const memo = new Map<string, Promise<CardResolution>>();
  return (ref) => {
    const key = JSON.stringify(REF_FIELDS.map((field) => ref[field] ?? null));
    let resolution = memo.get(key);
    if (!resolution) {
      resolution = repo.resolveCard(ref);
      memo.set(key, resolution);
    }
    return resolution;
  };
}

const byIndex = (a: { index: number }, b: { index: number }) => a.index - b.index;

export async function processIngest(body: unknown, deps: IngestDeps): Promise<IngestOutcome> {
  const envelope = IngestEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return { status: 422, body: { ok: false, error: "Invalid payload", details: describeZodError(envelope.error) } };
  }
  const { source, items } = envelope.data;
  const context: NormalizeContext = {
    capturedAt: envelope.data.capturedAt,
    fx: getFxRates(deps.env ?? process.env, envelope.data.fxRates),
    now: (deps.now ?? defaultNow)(),
  };

  const rejected: IngestRejection[] = [];
  const drafts: { index: number; ref: CardRef; snapshot: SnapshotDraft }[] = [];
  items.forEach((raw, index) => {
    const parsed = IngestItemSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({ index, reason: describeZodError(parsed.error).join("; ") });
      return;
    }
    const normalized = normalizeItem(parsed.data, context);
    if (normalized.ok) drafts.push({ index, ref: parsed.data.card, snapshot: normalized.snapshot });
    else rejected.push({ index, reason: normalized.reason });
  });

  const resolve = memoizedResolver(deps.repo);
  const resolved = await Promise.all(
    drafts.map(async (draft) => ({ ...draft, resolution: await resolve(draft.ref) })),
  );
  const matched: { index: number; snapshot: NormalizedVendorSnapshot }[] = [];
  for (const { index, ref, snapshot, resolution } of resolved) {
    if (resolution.status === "matched") matched.push({ index, snapshot: { cardId: resolution.cardId, ...snapshot } });
    else rejected.push({ index, reason: describeResolutionFailure(ref, resolution) });
  }

  // One snapshot per (card, vendor, day): the last item in the batch wins.
  const dedupeKey = ({ cardId, vendor, day }: NormalizedVendorSnapshot) => `${cardId}\u0000${vendor}\u0000${day}`;
  const winners = new Map(matched.map((entry) => [dedupeKey(entry.snapshot), entry.index]));
  const kept: typeof matched = [];
  for (const entry of matched) {
    const winner = winners.get(dedupeKey(entry.snapshot));
    if (winner === entry.index) kept.push(entry);
    else rejected.push({ index: entry.index, reason: `superseded by item ${winner}` });
  }

  const accepted: IngestAccepted[] = kept
    .map(({ index, snapshot }) => ({ index, cardId: snapshot.cardId, vendor: snapshot.vendor }))
    .sort(byIndex);
  rejected.sort(byIndex);
  const response = { source, received: items.length, accepted, rejected };

  if (kept.length === 0) {
    return {
      status: 422,
      body: {
        ok: false,
        mode: modeOf(deps.repo.mode === "postgres"),
        ...response,
        written: { vendorQuotes: 0, listings: 0, historyPoints: 0, marketPoints: 0 },
      },
    };
  }

  // Oldest capture first, so a repository applying snapshots in order ends on the newest quote.
  const snapshots = kept
    .map((entry) => entry.snapshot)
    .sort((a, b) => (a.capturedAt < b.capturedAt ? -1 : a.capturedAt > b.capturedAt ? 1 : 0));
  const write = await deps.repo.ingest(snapshots);
  return {
    status: 200,
    body: {
      ok: true,
      mode: modeOf(write.persisted),
      ...response,
      written: {
        vendorQuotes: write.vendorQuotes,
        listings: write.listings,
        historyPoints: write.historyPoints,
        marketPoints: write.marketPoints,
      },
    },
  };
}

/** Daily rollup for Vercel Cron: carry vendor prices forward and recompute the day's market aggregate. */
export async function processRollup(day: string | null, deps: IngestDeps): Promise<RollupOutcome> {
  const today = todayUtc((deps.now ?? defaultNow)());
  const target = day ?? today;
  if (!isIsoDay(target) || target > today) {
    return {
      status: 400,
      body: { ok: false, error: "Invalid day", details: [`day must be a YYYY-MM-DD date on or before ${today}`] },
    };
  }
  const result = await deps.repo.rollup(target);
  return { status: 200, body: { ...result, ok: true, mode: modeOf(result.persisted) } };
}
