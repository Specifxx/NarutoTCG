/**
 * Deterministic demo market for the seed catalog: daily vendor prices from each
 * set's release up to today, plus today's vendor quotes and live listings.
 *
 * Price model, per printing
 * - Base USD price from rarity x finish x character popularity, seeded per card.
 * - True price = base x exp(regimes + noise). Noise is a mean-reverting log random
 *   walk; regimes are a fading launch premium plus seeded hype spikes (tournament
 *   results) and crashes (reprint news) that ramp in over a few days, then decay.
 * - Each vendor quotes the true price with its own bias and jitter, in its own
 *   currency; eBay has no market price on ~10% of days.
 *
 * Determinism: draws are keyed by (card, absolute day[, vendor]) and the walk runs
 * forward from the set's release date, so a day's prices never change as `now` moves.
 */
import { addDays, aggregateMarket, diffDays, roundMoney, summarizeListingPrices, todayUtc } from "../analytics";
import { statsToUsd, toUsd, type FxRates } from "../fx";
import type {
  CardCondition,
  CardFinish,
  IsoDay,
  MarketCard,
  MarketDataset,
  PriceStats,
  Rarity,
  VendorId,
  VendorListing,
  VendorQuote,
} from "../types";
import { VENDOR_ORDER, VENDORS, vendorSearchUrl } from "../vendors";
import { SEED_CARDS, SEED_SETS } from "./catalog";
import {
  chance,
  gaussian,
  hashString,
  intBetween,
  pickWeighted,
  sample,
  seededRng,
  uniform,
  type Rng,
} from "./random";

export interface SeedDatasetOptions {
  now: Date;
  fx: FxRates;
}

// ---------------------------------------------------------------- price model

const RARITY_PRICE_RANGE: Record<Rarity, readonly [number, number]> = {
  common: [0.15, 0.6],
  uncommon: [0.4, 1.5],
  rare: [2, 8],
  "super-rare": [8, 35],
  "secret-rare": [60, 260],
  parallel: [90, 420],
  promo: [4, 60],
};

const FINISH_MULTIPLIER: Record<CardFinish, number> = { "non-foil": 1, foil: 1.8, "textured-foil": 3 };

/** These ranges are already quoted for the premium finish every such printing has. */
const FINISH_INCLUDED: ReadonlySet<Rarity> = new Set<Rarity>(["secret-rare", "parallel"]);

const POPULARITY: Record<string, number> = {
  "Naruto Uzumaki": 1.8,
  "Sasuke Uchiha": 1.7,
  "Itachi Uchiha": 1.7,
  "Madara Uchiha": 1.6,
  "Kakashi Hatake": 1.5,
  "Minato Namikaze": 1.35,
  Gaara: 1.3,
  Kurama: 1.3,
  Pain: 1.3,
  Jiraiya: 1.25,
  "Hinata Hyuga": 1.15,
};

/** Daily standard deviation of the log-price noise. */
const DAILY_VOLATILITY: Record<Rarity, number> = {
  common: 0.03,
  uncommon: 0.025,
  rare: 0.02,
  "super-rare": 0.018,
  "secret-rare": 0.015,
  parallel: 0.015,
  promo: 0.02,
};

/** Share of the noise pulled back toward the base price each day. */
const REVERSION = 0.06;
const MIN_TRUE_PRICE = 0.1;
/** Floor for any vendor or listing price, in the vendor's currency. */
const MIN_VENDOR_PRICE = 0.05;

/** Days since release are split into windows; each may hold one seeded hype or crash. */
const REGIME_WINDOW_DAYS = 20;
const REGIME_CHANCE = 0.75;
const HYPE_SHARE = 0.5;
/** Past this many decay constants a regime's remaining effect (< 0.25% of its peak) is dropped. */
const REGIME_HORIZON = 6;

/** Log-offset that ramps linearly to `magnitude` over `ramp` days, then decays exponentially. */
interface Regime {
  start: number;
  ramp: number;
  magnitude: number;
  decay: number;
}

// ---------------------------------------------------------------- vendors

const VENDOR_MODEL: Record<VendorId, { bias: number; jitter: number; gapChance: number }> = {
  tcgplayer: { bias: 1, jitter: 0.02, gapChance: 0 },
  ebay: { bias: 1.04, jitter: 0.06, gapChance: 0.1 },
  cardmarket: { bias: 0.9, jitter: 0.03, gapChance: 0 },
};

/** Low-value printings nobody bothers to list on eBay. */
const EBAY_UNLISTED: ReadonlySet<string> = new Set(["ntg01-040", "ntg02-031", "ntg03-031"]);
/** League promos were distributed in the US only. */
const CARDMARKET_EXCLUDED_SETS: ReadonlySet<string> = new Set(["NTPR"]);

const LISTING_CONDITIONS: readonly [
  { condition: CardCondition; weight: number; priceRange: readonly [number, number] },
  ...{ condition: CardCondition; weight: number; priceRange: readonly [number, number] }[],
] = [
  { condition: "NM", weight: 0.7, priceRange: [0.95, 1.35] },
  { condition: "LP", weight: 0.17, priceRange: [0.9, 1.15] },
  { condition: "MP", weight: 0.1, priceRange: [0.86, 1.02] },
  { condition: "HP", weight: 0.03, priceRange: [0.85, 0.92] },
];

const LISTING_QUANTITIES: readonly [{ value: number; weight: number }, ...{ value: number; weight: number }[]] = [
  { value: 1, weight: 0.6 },
  { value: 2, weight: 0.2 },
  { value: 3, weight: 0.12 },
  { value: 4, weight: 0.08 },
];

const SELLERS: readonly string[] = [
  "HiddenLeafSingles",
  "RamenStandCards",
  "KunaiAndCo",
  "ScrollKeeperTCG",
  "SharinganSingles",
  "ToadMountainTrading",
  "SandVillageVault",
  "ChakraPointCards",
  "WhirlpoolCollectibles",
  "MaskedOpsCards",
  "ShurikenDepot",
  "NinjaWayGames",
  "ValleyOfEndTCG",
  "FoxfireCollect",
  "MistyHarborCards",
  "ChuninExchange",
  "PaperBombGames",
  "SummoningScrolls",
  "WillOfFireTrades",
  "SilverFangCards",
  "LeafTreeHobbies",
  "CrowFeatherCards",
  "SageModeSingles",
  "GentleFistGames",
];

/** Vendor snapshots are taken during the first six hours of the UTC day. */
const QUOTE_WINDOW_SECONDS = 6 * 3600;

const EPOCH_DAY: IsoDay = "1970-01-01";
const BASE_SALT = hashString("base");
const REGIME_SALT = hashString("regime");
const LISTING_SALT = hashString("listings");
const VENDOR_SALT: Record<VendorId, number> = {
  tcgplayer: hashString("tcgplayer"),
  ebay: hashString("ebay"),
  cardmarket: hashString("cardmarket"),
};

// ---------------------------------------------------------------- generation

interface Context {
  now: Date;
  today: IsoDay;
  todayNumber: number;
  fx: FxRates;
  out: MarketDataset;
}

export function generateSeedDataset(options: SeedDatasetOptions): MarketDataset {
  const today = todayUtc(options.now);
  const context: Context = {
    now: options.now,
    today,
    todayNumber: diffDays(EPOCH_DAY, today),
    fx: options.fx,
    out: {
      sets: SEED_SETS.map((set) => ({ ...set })),
      cards: SEED_CARDS.map((card) => ({ ...card })),
      quotes: [],
      listings: [],
      vendorHistory: [],
      marketDaily: [],
    },
  };
  const releases = new Map(SEED_SETS.map((set) => [set.code, set.releasedOn]));
  const dayLabels = new Map<IsoDay, IsoDay[]>();
  for (const card of context.out.cards) {
    const releasedOn = releases.get(card.setCode);
    if (!releasedOn) throw new Error(`Seed card ${card.id} references unknown set ${card.setCode}`);
    const lastDay = diffDays(releasedOn, today);
    if (lastDay < 0) continue;
    let labels = dayLabels.get(releasedOn);
    if (!labels) {
      labels = Array.from({ length: lastDay + 1 }, (_, d) => addDays(releasedOn, d));
      dayLabels.set(releasedOn, labels);
    }
    generateCard(card, labels, context);
  }
  return context.out;
}

function basePrice(card: MarketCard, seed: number): number {
  const [min, max] = RARITY_PRICE_RANGE[card.rarity];
  const finish = FINISH_INCLUDED.has(card.rarity) ? 1 : FINISH_MULTIPLIER[card.finish];
  return uniform(seededRng(seed, BASE_SALT), min, max) * finish * (POPULARITY[card.character] ?? 1);
}

function regimesFor(seed: number, lastDay: number): Regime[] {
  const launch = seededRng(seed, REGIME_SALT, -1);
  const regimes: Regime[] = [
    { start: 0, ramp: 1, magnitude: uniform(launch, 0.1, 0.4), decay: uniform(launch, 20, 45) },
  ];
  for (let window = 0; window * REGIME_WINDOW_DAYS <= lastDay; window++) {
    const rng = seededRng(seed, REGIME_SALT, window);
    if (!chance(rng, REGIME_CHANCE)) continue;
    const start = window * REGIME_WINDOW_DAYS + intBetween(rng, 0, REGIME_WINDOW_DAYS - 1);
    regimes.push(
      chance(rng, HYPE_SHARE)
        ? { start, ramp: intBetween(rng, 2, 6), magnitude: uniform(rng, 0.22, 0.65), decay: uniform(rng, 6, 20) }
        : { start, ramp: intBetween(rng, 2, 5), magnitude: -uniform(rng, 0.2, 0.5), decay: uniform(rng, 10, 30) },
    );
  }
  return regimes;
}

/**
 * Summed log-offset of every regime for each day since release (index = day).
 * A day only sums regimes that started on or before it, so it never depends on `lastDay`.
 */
function regimeOffsets(regimes: Regime[], lastDay: number): Float64Array {
  const offsets = new Float64Array(lastDay + 1);
  for (const { start, ramp, magnitude, decay } of regimes) {
    const end = Math.min(lastDay, start + ramp + Math.ceil(REGIME_HORIZON * decay));
    for (let day = start; day <= end; day++) {
      const elapsed = day - start;
      offsets[day] +=
        elapsed < ramp ? (magnitude * (elapsed + 1)) / ramp : magnitude * Math.exp(-(elapsed - ramp + 1) / decay);
    }
  }
  return offsets;
}

function carriesCard(vendor: VendorId, card: MarketCard): boolean {
  switch (vendor) {
    case "tcgplayer":
      return true;
    case "ebay":
      return !EBAY_UNLISTED.has(card.id);
    case "cardmarket":
      return !CARDMARKET_EXCLUDED_SETS.has(card.setCode);
  }
}

/** Walks one printing from its release (labels[0]) to today (the last label). */
function generateCard(card: MarketCard, labels: IsoDay[], context: Context): void {
  const { fx, out } = context;
  const seed = hashString(card.id);
  const lastDay = labels.length - 1;
  const firstDayNumber = context.todayNumber - lastDay;
  const base = basePrice(card, seed);
  const volatility = DAILY_VOLATILITY[card.rarity];
  const regimes = regimeOffsets(regimesFor(seed, lastDay), lastDay);
  const lanes = VENDOR_ORDER.map((vendor) => ({
    vendor,
    ...VENDOR_MODEL[vendor],
    currency: VENDORS[vendor].currency,
    carried: carriesCard(vendor, card),
  }));

  const usdMarkets: number[] = [];
  let noise = 0;
  for (let d = 0; d <= lastDay; d++) {
    const day = labels[d];
    const rng = seededRng(seed, firstDayNumber + d);
    noise = noise * (1 - REVERSION) + volatility * gaussian(rng);
    const truePrice = Math.max(MIN_TRUE_PRICE, base * Math.exp(regimes[d] + noise));

    usdMarkets.length = 0;
    for (const lane of lanes) {
      // Draw for every vendor, carried or not, so each vendor's numbers are independent of the others' coverage.
      const jitter = uniform(rng, -lane.jitter, lane.jitter);
      const gap = chance(rng, lane.gapChance);
      if (!lane.carried) continue;

      const { vendor, currency } = lane;
      const reference = roundMoney(Math.max(MIN_VENDOR_PRICE, (truePrice * lane.bias * (1 + jitter)) / fx[currency]));
      const market = gap ? null : reference;
      const marketUsd = market === null ? null : toUsd(market, currency, fx);

      // A gap is a capture without a market price, filed as such (as ingestion would), so the
      // daily rollup never carries an older price into it.
      if (d === lastDay) {
        const quote = generateQuote(card, vendor, seed, reference, market, context);
        out.vendorHistory.push({
          cardId: card.id,
          vendor,
          day,
          currency,
          native: { ...quote.native },
          usd: { ...quote.usd },
          listingsCount: quote.listingsCount,
        });
      } else {
        out.vendorHistory.push({
          cardId: card.id,
          vendor,
          day,
          currency,
          native: { low: null, mid: null, high: null, market },
          usd: { low: null, mid: null, high: null, market: marketUsd },
          listingsCount: 0,
        });
      }
      if (marketUsd !== null) usdMarkets.push(marketUsd);
    }
    if (usdMarkets.length > 0) {
      out.marketDaily.push({ cardId: card.id, day, marketUsd: aggregateMarket(usdMarkets), vendorCount: usdMarkets.length });
    }
  }
}

/**
 * Today's live listings and the vendor quote summarizing them. `reference` is the
 * vendor's price level today even when it published no market price (an eBay gap).
 */
function generateQuote(
  card: MarketCard,
  vendor: VendorId,
  seed: number,
  reference: number,
  market: number | null,
  context: Context,
): VendorQuote {
  const { fx } = context;
  const rng = seededRng(seed, LISTING_SALT, VENDOR_SALT[vendor], context.todayNumber);
  const currency = VENDORS[vendor].currency;
  const url = vendorSearchUrl(vendor, card);
  const updatedAt = quoteTimestamp(rng, context);

  const sellers = sample(rng, SELLERS, intBetween(rng, 2, 8));
  const listings: VendorListing[] = sellers.map((seller, i) => {
    const { condition, priceRange } = pickWeighted(rng, LISTING_CONDITIONS);
    const quantity = pickWeighted(rng, LISTING_QUANTITIES).value;
    const price = roundMoney(Math.max(MIN_VENDOR_PRICE, reference * uniform(rng, priceRange[0], priceRange[1])));
    const shipping = shippingFor(vendor, price, rng);
    const priceUsd = toUsd(price, currency, fx);
    const shippingUsd = shipping === null ? null : toUsd(shipping, currency, fx);
    return {
      id: `${card.id}:${vendor}:${i + 1}`,
      cardId: card.id,
      vendor,
      seller,
      condition,
      quantity,
      currency,
      price,
      shipping,
      priceUsd,
      shippingUsd,
      totalUsd: roundMoney(priceUsd + (shippingUsd ?? 0)),
      url,
      updatedAt,
    };
  });
  context.out.listings.push(...listings);

  const native: PriceStats = { ...summarizeListingPrices(listings.map((l) => l.price)), market };
  const quote: VendorQuote = {
    cardId: card.id,
    vendor,
    currency,
    native,
    usd: statsToUsd(native, currency, fx),
    listingsCount: listings.length,
    url,
    updatedAt,
  };
  context.out.quotes.push(quote);
  return quote;
}

/** A seeded moment in today's snapshot window, never later than `now`. */
function quoteTimestamp(rng: Rng, context: Context): string {
  const startOfDay = Date.parse(`${context.today}T00:00:00Z`);
  const at = startOfDay + Math.floor(rng() * QUOTE_WINDOW_SECONDS) * 1000;
  return new Date(Math.min(at, context.now.getTime())).toISOString();
}

/** Shipping in the vendor's currency; null when the seller does not state it. */
function shippingFor(vendor: VendorId, price: number, rng: Rng): number | null {
  switch (vendor) {
    case "tcgplayer":
      return chance(rng, price >= 5 ? 0.6 : 0.25) ? 0 : roundMoney(uniform(rng, 0.99, 4.99));
    case "ebay": {
      const roll = rng();
      if (roll < 0.15) return null;
      if (roll < 0.45) return 0;
      return roundMoney(uniform(rng, 1.5, 5.99));
    }
    case "cardmarket":
      return roundMoney(uniform(rng, 1.2, 3.5));
  }
}
