import { describe, expect, it } from "vitest";
import {
  addDays,
  aggregateMarket,
  compareText,
  diffDays,
  medianMoney,
  roundMoney,
  todayUtc,
} from "../analytics";
import { HISTORY_DAYS, HISTORY_POINTS, MAX_PAGE_SIZE, MOVER_MIN_PRICE } from "../constants";
import { statsToUsd, toUsd, type FxRates } from "../fx";
import { FINISH_ORDER, RARITY_ORDER } from "../labels";
import { SEED_CARDS, SEED_SETS } from "../seed/catalog";
import { generateSeedDataset } from "../seed/dataset";
import { SeedMarketRepository } from "../seed-repository";
import type { CardMarketSummary, MarketDataset, NormalizedVendorSnapshot, SortKey, VendorId } from "../types";
import { VENDOR_ORDER, VENDORS, vendorSearchUrl } from "../vendors";

const NOW = new Date("2026-10-14T12:00:00Z");
const TODAY = todayUtc(NOW);
const FX: FxRates = { USD: 1, EUR: 1.16 };

const generationStarted = performance.now();
const dataset = generateSeedDataset({ now: NOW, fx: FX });
/** The first (cold, un-JIT-ed) generation: what a server pays once per UTC day. */
const coldGenerationMs = performance.now() - generationStarted;
const repo = new SeedMarketRepository({ now: () => NOW, fx: FX });

const key = (...parts: string[]) => parts.join("|");

function marketsByKey(data: MarketDataset): Map<string, number | null> {
  return new Map(data.vendorHistory.map((row) => [key(row.cardId, row.vendor, row.day), row.native.market]));
}

async function allSummaries() {
  const page = await repo.queryCards({ pageSize: MAX_PAGE_SIZE });
  expect(page.total).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  return page.items;
}

describe("seed catalog", () => {
  it("has 55-65 printings with unique, well-formed ids", () => {
    expect(SEED_CARDS.length).toBeGreaterThanOrEqual(55);
    expect(SEED_CARDS.length).toBeLessThanOrEqual(65);
    expect(new Set(SEED_CARDS.map((c) => c.id)).size).toBe(SEED_CARDS.length);
    const setNames = new Map(SEED_SETS.map((s) => [s.code, s.name]));
    for (const card of SEED_CARDS) {
      expect(card.id).toMatch(new RegExp(`^${card.setCode.toLowerCase()}-${card.number.toLowerCase()}(-(f|tf|p))?$`));
      expect(card.set).toBe(setNames.get(card.setCode));
      expect(card.imageUrl).toBeUndefined();
      expect(card.text?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("covers every rarity and finish", () => {
    expect(new Set(SEED_CARDS.map((c) => c.rarity))).toEqual(new Set(RARITY_ORDER));
    expect(new Set(SEED_CARDS.map((c) => c.finish))).toEqual(new Set(FINISH_ORDER));
  });

  it("has at least six characters with several printings", () => {
    const counts = new Map<string, number>();
    for (const card of SEED_CARDS) counts.set(card.character, (counts.get(card.character) ?? 0) + 1);
    expect([...counts.values()].filter((n) => n >= 2).length).toBeGreaterThanOrEqual(6);
  });

  it("prints some numbers as non-foil, foil and parallel", () => {
    const byNumber = new Map<string, typeof SEED_CARDS>();
    for (const card of SEED_CARDS) {
      const k = key(card.setCode, card.number);
      byNumber.set(k, [...(byNumber.get(k) ?? []), card]);
    }
    const full = [...byNumber.values()].filter(
      (cards) =>
        cards.some((c) => c.finish === "non-foil" && c.rarity !== "parallel") &&
        cards.some((c) => c.finish === "foil" && c.rarity !== "parallel") &&
        cards.some((c) => c.rarity === "parallel"),
    );
    expect(full.length).toBeGreaterThanOrEqual(2);
  });

  it("dates NTG04 recently and the rest in 2025", () => {
    const released = Object.fromEntries(SEED_SETS.map((s) => [s.code, s.releasedOn]));
    expect(released).toEqual({
      NTG01: "2025-03-14",
      NTG02: "2025-07-11",
      NTG03: "2025-11-07",
      NTG04: "2026-09-04",
      NTPR: "2025-03-14",
    });
  });
});

describe("generateSeedDataset", () => {
  it("is deterministic", () => {
    expect(generateSeedDataset({ now: NOW, fx: FX })).toEqual(dataset);
  });

  // Typically ~170 ms cold; the bound catches an accidental complexity blow-up, not CI jitter.
  it("generates in well under a second", () => {
    expect(coldGenerationMs).toBeLessThan(1000);
  });

  it("keeps past prices stable as now advances", () => {
    const earlierNow = new Date("2026-09-14T08:00:00Z");
    const earlier = generateSeedDataset({ now: earlierNow, fx: FX });
    const earlierDay = todayUtc(earlierNow);
    const later = marketsByKey(dataset);
    const earlierMarkets = marketsByKey(earlier);
    expect(earlierMarkets.size).toBeGreaterThan(10_000);
    expect([...earlierMarkets].filter(([k, value]) => later.get(k) !== value)).toEqual([]);
    const laterUpToEarlierDay = dataset.vendorHistory.filter((row) => row.day <= earlierDay);
    expect(laterUpToEarlierDay.length).toBe(earlier.vendorHistory.length);

    const laterDaily = new Map(dataset.marketDaily.map((row) => [key(row.cardId, row.day), row]));
    const changed = earlier.marketDaily.filter((row) => {
      const match = laterDaily.get(key(row.cardId, row.day));
      return match?.marketUsd !== row.marketUsd || match.vendorCount !== row.vendorCount;
    });
    expect(changed).toEqual([]);
    expect(earlier.marketDaily.some((row) => row.cardId.startsWith("ntg04"))).toBe(true);
  });

  it("emits nothing for a card before its set's release", () => {
    const beforeNtg04 = generateSeedDataset({ now: new Date("2026-09-03T23:59:59Z"), fx: FX });
    expect(beforeNtg04.cards.filter((c) => c.setCode === "NTG04").length).toBeGreaterThan(0);
    const ntg04 = (id: string) => id.startsWith("ntg04-");
    expect(beforeNtg04.vendorHistory.some((r) => ntg04(r.cardId))).toBe(false);
    expect(beforeNtg04.marketDaily.some((r) => ntg04(r.cardId))).toBe(false);
    expect(beforeNtg04.quotes.some((q) => ntg04(q.cardId))).toBe(false);
    expect(beforeNtg04.listings.some((l) => ntg04(l.cardId))).toBe(false);

    const releaseDay = generateSeedDataset({ now: new Date("2026-09-04T03:00:00Z"), fx: FX });
    const firstDays = new Set(releaseDay.marketDaily.filter((r) => ntg04(r.cardId)).map((r) => r.day));
    expect([...firstDays]).toEqual(["2026-09-04"]);
  });

  it("starts each card's history on its set's release date and runs daily to today", () => {
    const released = new Map(SEED_SETS.map((s) => [s.code, s.releasedOn]));
    for (const card of dataset.cards) {
      const days = dataset.marketDaily.filter((r) => r.cardId === card.id).map((r) => r.day);
      const releasedOn = released.get(card.setCode) ?? "";
      expect(days[0], card.id).toBe(releasedOn);
      expect(days.at(-1), card.id).toBe(TODAY);
      expect(days.length, card.id).toBe(diffDays(releasedOn, TODAY) + 1);
    }
  });

  it("stores the median of the vendor market prices as the daily aggregate", () => {
    // Only eBay has gap days, filed as captures without a market price.
    expect(new Set(dataset.vendorHistory.filter((row) => row.usd.market === null).map((row) => row.vendor))).toEqual(
      new Set(["ebay"]),
    );
    const vendorMarkets = new Map<string, Array<number | null>>();
    for (const row of dataset.vendorHistory) {
      const k = key(row.cardId, row.day);
      vendorMarkets.set(k, [...(vendorMarkets.get(k) ?? []), row.usd.market]);
    }
    expect(dataset.marketDaily.length).toBe(vendorMarkets.size);
    const mismatched = dataset.marketDaily.filter((row) => {
      const values = vendorMarkets.get(key(row.cardId, row.day)) ?? [];
      return row.marketUsd !== aggregateMarket(values) || row.vendorCount !== values.filter((v) => v !== null).length;
    });
    expect(mismatched).toEqual([]);
    expect(new Set(dataset.marketDaily.map((row) => row.vendorCount))).toEqual(new Set([1, 2, 3]));
  });

  it("converts vendor history to USD with the configured rate", () => {
    const wrong = dataset.vendorHistory.filter((row) => {
      if (row.day === TODAY) return false;
      const usd = statsToUsd(row.native, row.currency, FX);
      return (
        row.currency !== VENDORS[row.vendor].currency ||
        row.usd.market !== usd.market ||
        (row.native.market === null && row.vendor !== "ebay") ||
        row.native.low !== null ||
        row.native.mid !== null ||
        row.native.high !== null ||
        row.usd.low !== null ||
        row.listingsCount !== 0
      );
    });
    expect(wrong).toEqual([]);
  });

  it("covers vendors as documented", () => {
    const carried = (vendor: VendorId) => new Set(dataset.quotes.filter((q) => q.vendor === vendor).map((q) => q.cardId));
    expect(carried("tcgplayer").size).toBe(SEED_CARDS.length);
    const ebayMissing = SEED_CARDS.filter((c) => !carried("ebay").has(c.id));
    expect(ebayMissing.length).toBeGreaterThanOrEqual(2);
    expect(ebayMissing.length).toBeLessThanOrEqual(3);
    for (const card of ebayMissing) expect(card.rarity).toBe("common");
    const cardmarketMissing = SEED_CARDS.filter((c) => !carried("cardmarket").has(c.id));
    expect(new Set(cardmarketMissing.map((c) => c.setCode))).toEqual(new Set(["NTPR"]));
    expect(cardmarketMissing.length).toBe(SEED_CARDS.filter((c) => c.setCode === "NTPR").length);

    for (const vendor of VENDOR_ORDER) {
      const cards = carried(vendor);
      expect(dataset.vendorHistory.filter((r) => r.vendor === vendor).every((r) => cards.has(r.cardId))).toBe(true);
      expect(dataset.listings.filter((l) => l.vendor === vendor).every((l) => cards.has(l.cardId))).toBe(true);
    }
  });

  it("leaves eBay without a market price on roughly one day in ten, filed as an explicit gap", () => {
    const ebayCards = new Set(dataset.quotes.filter((q) => q.vendor === "ebay").map((q) => q.cardId));
    const cardDays = dataset.marketDaily.filter((r) => ebayCards.has(r.cardId)).length;
    const ebayRows = dataset.vendorHistory.filter((r) => r.vendor === "ebay");
    // Every day an eBay card is priced has an eBay row, so the rollup never carries an older price into a gap.
    expect(ebayRows.length).toBe(cardDays);
    const gapShare = ebayRows.filter((r) => r.usd.market === null).length / cardDays;
    expect(gapShare).toBeGreaterThan(0.07);
    expect(gapShare).toBeLessThan(0.13);
  });

  it("builds quotes from today's listings", () => {
    const nowMs = NOW.getTime();
    expect(dataset.quotes.some((q) => q.native.market === null && q.listingsCount > 0)).toBe(true);
    for (const quote of dataset.quotes) {
      const listings = dataset.listings.filter((l) => l.cardId === quote.cardId && l.vendor === quote.vendor);
      const prices = listings.map((l) => l.price);
      expect(listings.length).toBeGreaterThanOrEqual(2);
      expect(listings.length).toBeLessThanOrEqual(8);
      expect(quote.listingsCount).toBe(listings.length);
      expect(quote.currency).toBe(quote.vendor === "cardmarket" ? "EUR" : "USD");
      expect(quote.native.low).toBe(Math.min(...prices));
      expect(quote.native.high).toBe(Math.max(...prices));
      expect(quote.native.mid).toBe(medianMoney(prices));
      expect(quote.usd).toEqual(statsToUsd(quote.native, quote.currency, FX));
      expect(quote.usd.low).toBe(Math.min(...listings.map((l) => l.priceUsd)));
      expect(quote.updatedAt.slice(0, 10)).toBe(TODAY);
      expect(Date.parse(quote.updatedAt)).toBeLessThanOrEqual(nowMs);
      expect(quote.updatedAt < `${TODAY}T06:00:00`).toBe(true);
      expect(listings.every((l) => l.url === quote.url)).toBe(true);

      const todayRow = dataset.vendorHistory.find(
        (r) => r.cardId === quote.cardId && r.vendor === quote.vendor && r.day === TODAY,
      );
      if (quote.native.market === null) expect(quote.vendor).toBe("ebay");
      expect(todayRow).toEqual({
        cardId: quote.cardId,
        vendor: quote.vendor,
        day: TODAY,
        currency: quote.currency,
        native: quote.native,
        usd: quote.usd,
        listingsCount: quote.listingsCount,
      });
    }
  });

  it("prices listings consistently", () => {
    const cards = new Map(dataset.cards.map((c) => [c.id, c]));
    const quotes = new Map(dataset.quotes.map((q) => [key(q.cardId, q.vendor), q]));
    expect(new Set(dataset.listings.map((l) => l.id)).size).toBe(dataset.listings.length);
    const sellers = new Set(dataset.listings.map((l) => l.seller));
    expect(sellers.size).toBeGreaterThanOrEqual(20);
    const conditions = new Set(dataset.listings.map((l) => l.condition));
    expect(conditions.has("NM") && conditions.has("LP") && conditions.has("MP")).toBe(true);
    expect(dataset.listings.filter((l) => l.condition === "NM").length / dataset.listings.length).toBeGreaterThan(0.5);
    expect(dataset.listings.some((l) => l.vendor === "ebay" && l.shipping === null)).toBe(true);
    expect(dataset.listings.some((l) => l.vendor === "tcgplayer" && l.shipping === 0)).toBe(true);

    for (const listing of dataset.listings) {
      const card = cards.get(listing.cardId);
      const quote = quotes.get(key(listing.cardId, listing.vendor));
      expect(card).toBeDefined();
      expect(quote).toBeDefined();
      if (!card || !quote) continue;
      expect(listing.id).toMatch(new RegExp(`^${listing.cardId}:${listing.vendor}:\\d+$`));
      expect(listing.currency).toBe(VENDORS[listing.vendor].currency);
      expect(listing.priceUsd).toBe(toUsd(listing.price, listing.currency, FX));
      expect(listing.shippingUsd).toBe(listing.shipping === null ? null : toUsd(listing.shipping, listing.currency, FX));
      expect(listing.totalUsd).toBe(roundMoney(listing.priceUsd + (listing.shippingUsd ?? 0)));
      expect(listing.price).toBe(roundMoney(listing.price));
      expect(listing.quantity).toBeGreaterThanOrEqual(1);
      expect(listing.quantity).toBeLessThanOrEqual(4);
      expect(listing.url).toBe(vendorSearchUrl(listing.vendor, card));
      expect(listing.updatedAt).toBe(quote.updatedAt);
      if (listing.vendor === "cardmarket" && listing.shipping !== null) {
        expect(listing.shipping).toBeGreaterThanOrEqual(1.2);
        expect(listing.shipping).toBeLessThanOrEqual(3.5);
      }
      if (quote.native.market !== null) {
        expect(listing.price).toBeGreaterThanOrEqual(roundMoney(quote.native.market * 0.85) - 0.01);
        expect(listing.price).toBeLessThanOrEqual(roundMoney(quote.native.market * 1.35) + 0.01);
      }
    }
  });

  it("never stamps a quote after now", () => {
    const earlyNow = new Date("2026-10-14T00:20:00Z");
    const early = generateSeedDataset({ now: earlyNow, fx: FX });
    expect(early.quotes.every((q) => Date.parse(q.updatedAt) <= earlyNow.getTime())).toBe(true);
    expect(early.quotes.some((q) => q.updatedAt === earlyNow.toISOString())).toBe(true);
  });

  it("follows the configured EUR rate for Cardmarket", () => {
    const strongEuro = generateSeedDataset({ now: NOW, fx: { USD: 1, EUR: 1.3 } });
    const quote = strongEuro.quotes.find((q) => q.vendor === "cardmarket");
    expect(quote).toBeDefined();
    if (quote) expect(quote.usd).toEqual(statsToUsd(quote.native, "EUR", { USD: 1, EUR: 1.3 }));
    const tcg = (data: MarketDataset) => data.quotes.filter((q) => q.vendor === "tcgplayer");
    expect(tcg(strongEuro)).toEqual(tcg(dataset));
  });
});

describe("SeedMarketRepository", () => {
  it("spans commons around $0.15 to chase cards above $300", async () => {
    const prices = (await allSummaries()).map((s) => s.marketPrice ?? Number.NaN);
    expect(prices.every((p) => Number.isFinite(p) && p > 0)).toBe(true);
    expect(Math.min(...prices)).toBeLessThan(0.3);
    expect(Math.max(...prices)).toBeGreaterThan(300);
    const { mostValuable } = await repo.getMovers("7d", 3);
    for (const top of mostValuable) expect(["parallel", "secret-rare"]).toContain(top.card.rarity);
  });

  it("summarizes every card as of today", async () => {
    const summaries = await allSummaries();
    expect(summaries.length).toBe(SEED_CARDS.length);
    for (const summary of summaries) {
      expect(summary.asOf).toBe(TODAY);
      expect(summary.sparkline.length).toBe(30);
      expect(summary.vendorCount).toBe(dataset.quotes.filter((q) => q.cardId === summary.card.id).length);
      expect(summary.lowestPrice).not.toBeNull();
    }
  });

  it("has big 7-day movers in both directions", async () => {
    const movers = await repo.getMovers("7d", 10);
    const bigGainers = movers.gainers.filter((s) => (s.changes["7d"]?.pct ?? 0) > 15);
    const bigLosers = movers.losers.filter((s) => (s.changes["7d"]?.pct ?? 0) < -15);
    expect(bigGainers.length).toBeGreaterThanOrEqual(3);
    expect(bigLosers.length).toBeGreaterThanOrEqual(3);
    for (const s of [...movers.gainers, ...movers.losers]) {
      expect(s.marketPrice ?? 0).toBeGreaterThanOrEqual(MOVER_MIN_PRICE);
    }
    const thirty = await repo.getMovers("30d", 10);
    expect(thirty.gainers.length).toBeGreaterThan(0);
    expect(thirty.losers.length).toBeGreaterThan(0);
  });

  it("has no 90-day change for the recent NTG04 set", async () => {
    const page = await repo.queryCards({ sets: ["NTG04"], pageSize: MAX_PAGE_SIZE });
    expect(page.total).toBe(SEED_CARDS.filter((c) => c.setCode === "NTG04").length);
    for (const s of page.items) {
      expect(s.changes["90d"]).toBeNull();
      expect(s.changes["30d"]).not.toBeNull();
      expect(s.changes["7d"]).not.toBeNull();
    }
    const older = await repo.queryCards({ sets: ["NTG01"], pageSize: MAX_PAGE_SIZE });
    for (const s of older.items) expect(s.changes["90d"]).not.toBeNull();
  });

  it("lists sets in release order", async () => {
    expect((await repo.listSets()).map((s) => s.code)).toEqual(["NTG01", "NTPR", "NTG02", "NTG03", "NTG04"]);
    const facets = await repo.getFacets();
    expect(facets.sets.map((s) => s.value)).toEqual(["NTG01", "NTPR", "NTG02", "NTG03", "NTG04"]);
    expect(facets.sets.reduce((sum, s) => sum + s.count, 0)).toBe(SEED_CARDS.length);
    expect(facets.rarities.map((r) => r.value)).toEqual(RARITY_ORDER);
    expect(facets.finishes.map((f) => f.value)).toEqual(FINISH_ORDER);
  });

  describe("queryCards", () => {
    it("filters by set, rarity and finish", async () => {
      const bySet = await repo.queryCards({ sets: ["NTG02", "NTPR"], pageSize: MAX_PAGE_SIZE });
      expect(bySet.total).toBe(SEED_CARDS.filter((c) => c.setCode === "NTG02" || c.setCode === "NTPR").length);
      expect(bySet.items.every((s) => ["NTG02", "NTPR"].includes(s.card.setCode))).toBe(true);

      const chase = await repo.queryCards({ rarities: ["parallel", "secret-rare"], pageSize: MAX_PAGE_SIZE });
      expect(chase.total).toBe(SEED_CARDS.filter((c) => c.rarity === "parallel" || c.rarity === "secret-rare").length);
      expect(chase.items.every((s) => s.card.rarity === "parallel" || s.card.rarity === "secret-rare")).toBe(true);

      const textured = await repo.queryCards({ finishes: ["textured-foil"], sets: ["NTG03"] });
      expect(textured.total).toBeGreaterThan(0);
      expect(textured.items.every((s) => s.card.finish === "textured-foil" && s.card.setCode === "NTG03")).toBe(true);

      const none = await repo.queryCards({ sets: ["NTG04"], rarities: ["promo"] });
      expect(none).toMatchObject({ total: 0, items: [], page: 1, pageCount: 1 });
    });

    it("matches every search token", async () => {
      const sage = await repo.queryCards({ q: "naruto SAGE" });
      expect(sage.items.map((s) => s.card.id).sort()).toEqual(["ntg03-020", "ntg03-020-tf", "ntg04-085"]);
      const bySetCode = await repo.queryCards({ q: "ntpr kakashi" });
      expect(bySetCode.items.map((s) => s.card.id)).toEqual(["ntpr-p-002"]);
      expect((await repo.queryCards({ q: "zabuza" })).total).toBe(0);
    });

    it("sorts by price, change and name", async () => {
      const values = async (sort: SortKey, pick: (s: CardMarketSummary) => number | null) =>
        (await repo.queryCards({ sort, pageSize: MAX_PAGE_SIZE })).items.map(pick);
      const desc = await values("price-desc", (s) => s.marketPrice);
      expect(desc).toEqual([...desc].sort((a, b) => (b ?? 0) - (a ?? 0)));
      const asc = await values("price-asc", (s) => s.marketPrice);
      expect(asc).toEqual([...asc].sort((a, b) => (a ?? 0) - (b ?? 0)));
      const gains = (await values("change7-desc", (s) => s.changes["7d"]?.pct ?? null)).filter((v) => v !== null);
      expect(gains).toEqual([...gains].sort((a, b) => (b ?? 0) - (a ?? 0)));
      const drops = (await values("change30-asc", (s) => s.changes["30d"]?.pct ?? null)).filter((v) => v !== null);
      expect(drops).toEqual([...drops].sort((a, b) => (a ?? 0) - (b ?? 0)));
      const names = (await repo.queryCards({ sort: "name-asc", pageSize: MAX_PAGE_SIZE })).items.map((s) => s.card.name);
      expect(names).toEqual([...names].sort(compareText));
    });

    it("paginates and clamps out-of-range pages", async () => {
      const first = await repo.queryCards({ pageSize: 10 });
      expect(first).toMatchObject({ page: 1, pageSize: 10, total: SEED_CARDS.length });
      expect(first.pageCount).toBe(Math.ceil(SEED_CARDS.length / 10));
      expect(first.items.length).toBe(10);

      const past = await repo.queryCards({ pageSize: 10, page: 999 });
      expect(past.page).toBe(past.pageCount);
      expect(past.items.length).toBe(SEED_CARDS.length - (past.pageCount - 1) * 10);

      expect((await repo.queryCards({ page: 0, pageSize: 10 })).page).toBe(1);
      expect((await repo.queryCards({ page: -3, pageSize: 10 })).page).toBe(1);
      expect((await repo.queryCards({ pageSize: 10_000 })).pageSize).toBe(MAX_PAGE_SIZE);

      const pages = await Promise.all(
        Array.from({ length: first.pageCount }, (_, i) => repo.queryCards({ pageSize: 10, page: i + 1 })),
      );
      const ids = pages.flatMap((p) => p.items.map((s) => s.card.id));
      expect(new Set(ids).size).toBe(SEED_CARDS.length);
    });
  });

  describe("getCardDetail", () => {
    it("returns 90 days of history plus the base day, cheapest listings first and same-character variants", async () => {
      const detail = await repo.getCardDetail("ntg01-001");
      expect(detail).not.toBeNull();
      if (!detail) return;
      const { summary, history, listings, quotes, variants } = detail;
      expect(summary.card.id).toBe("ntg01-001");
      expect(history.length).toBe(HISTORY_POINTS);
      expect(history.at(-1)?.date).toBe(summary.asOf);
      expect(history[0]?.date).toBe(addDays(TODAY, -HISTORY_DAYS));
      history.forEach((point, i) => {
        if (i > 0) expect(diffDays(history[i - 1]?.date ?? "", point.date)).toBe(1);
        expect(point.market).not.toBeNull();
        expect(point.tcgplayer).not.toBeNull();
      });
      expect(history.at(-1)?.market).toBe(summary.marketPrice);

      expect(quotes.map((q) => q.vendor)).toEqual(VENDOR_ORDER);
      expect(listings.length).toBe(quotes.reduce((sum, q) => sum + q.listingsCount, 0));
      for (let i = 1; i < listings.length; i++) {
        expect(listings[i]?.totalUsd ?? 0).toBeGreaterThanOrEqual(listings[i - 1]?.totalUsd ?? 0);
      }

      expect(variants.length).toBeGreaterThanOrEqual(3);
      for (const variant of variants) {
        expect(variant.card.character).toBe("Naruto Uzumaki");
        expect(variant.card.id).not.toBe("ntg01-001");
      }
      const variantPrices = variants.map((v) => v.marketPrice ?? 0);
      expect(variantPrices).toEqual([...variantPrices].sort((a, b) => b - a));
    });

    it("pads history for a recently released card", async () => {
      const detail = await repo.getCardDetail("ntg04-005");
      expect(detail?.history.length).toBe(HISTORY_POINTS);
      const priced = detail?.history.filter((p) => p.market !== null) ?? [];
      expect(priced[0]?.date).toBe("2026-09-04");
      expect(priced.length).toBe(diffDays("2026-09-04", TODAY) + 1);
    });

    it("returns null for an unknown id", async () => {
      expect(await repo.getCardDetail("ntg09-001")).toBeNull();
    });
  });

  describe("resolveCard", () => {
    it("matches by id, case-insensitively", async () => {
      expect(await repo.resolveCard({ id: "NTG01-001-P" })).toEqual({ status: "matched", cardId: "ntg01-001-p" });
    });

    it("reports printings that share a set and number as ambiguous", async () => {
      expect(await repo.resolveCard({ setCode: "NTG01", number: "1" })).toEqual({
        status: "ambiguous",
        candidates: ["ntg01-001", "ntg01-001-f", "ntg01-001-p"],
      });
      expect(await repo.resolveCard({ setCode: "ntg01", number: "NTG01-001", finish: "foil" })).toEqual({
        status: "ambiguous",
        candidates: ["ntg01-001-f", "ntg01-001-p"],
      });
    });

    it("narrows with finish and rarity", async () => {
      expect(await repo.resolveCard({ setCode: "NTG01", number: "001", finish: "foil", rarity: "parallel" })).toEqual({
        status: "matched",
        cardId: "ntg01-001-p",
      });
      expect(await repo.resolveCard({ setCode: "NTG01", number: "001", finish: "non-foil" })).toEqual({
        status: "matched",
        cardId: "ntg01-001",
      });
      expect(await repo.resolveCard({ name: "kurama, nine-tailed fox" })).toEqual({
        status: "matched",
        cardId: "ntg04-005",
      });
      expect(await repo.resolveCard({ setCode: "NTPR", number: "p-1" })).toEqual({
        status: "matched",
        cardId: "ntpr-p-001",
      });
    });

    it("reports unknown cards as not found", async () => {
      expect(await repo.resolveCard({ setCode: "NTG09", number: "001" })).toEqual({ status: "not-found" });
      expect(await repo.resolveCard({ name: "Zabuza Momochi" })).toEqual({ status: "not-found" });
    });
  });

  it("reports ingestion and rollups as dry runs", async () => {
    const snapshot = (cardId: string, vendor: VendorId, listings?: number): NormalizedVendorSnapshot => ({
      cardId,
      vendor,
      currency: VENDORS[vendor].currency,
      day: TODAY,
      capturedAt: NOW.toISOString(),
      native: { low: 1, mid: 1, high: 1, market: 1 },
      usd: { low: 1, mid: 1, high: 1, market: 1 },
      url: null,
      listingsCount: listings ?? 0,
      ...(listings === undefined
        ? {}
        : {
            listings: Array.from({ length: listings }, () => ({
              seller: "s",
              condition: "NM" as const,
              quantity: 1,
              currency: VENDORS[vendor].currency,
              price: 1,
              shipping: null,
              priceUsd: 1,
              shippingUsd: null,
              totalUsd: 1,
              url: null,
            })),
          }),
    });
    const before = await repo.getCardDetail("ntg01-001");
    const result = await repo.ingest([
      snapshot("ntg01-001", "tcgplayer", 3),
      snapshot("ntg01-001", "ebay"),
      snapshot("ntg01-002", "cardmarket", 0),
    ]);
    expect(result).toEqual({ persisted: false, vendorQuotes: 3, listings: 3, historyPoints: 3, marketPoints: 2 });
    expect(await repo.rollup(TODAY)).toEqual({
      persisted: false,
      day: TODAY,
      carriedForward: 0,
      marketPoints: SEED_CARDS.length,
    });
    expect(await repo.getCardDetail("ntg01-001")).toEqual(before);
  });

  it("regenerates when the UTC day changes", async () => {
    let now = new Date("2026-10-14T23:00:00Z");
    const rolling = new SeedMarketRepository({ now: () => now, fx: FX });
    expect((await rolling.getCardDetail("ntg01-001"))?.summary.asOf).toBe("2026-10-14");
    now = new Date("2026-10-15T01:00:00Z");
    expect((await rolling.getCardDetail("ntg01-001"))?.summary.asOf).toBe("2026-10-15");
    expect(rolling.mode).toBe("seed");
  });
});
