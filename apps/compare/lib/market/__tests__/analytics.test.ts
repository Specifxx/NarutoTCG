import { describe, expect, it } from "vitest";
import { buildSummary, currentQuotes, emptyPoint, quoteFreshSince, rankMovers } from "../analytics";
import type { CardMarketSummary, MarketCard, PricePoint, VendorId, VendorQuote } from "../types";

const card = (id: string, name = id): MarketCard => ({
  id,
  name,
  character: name,
  set: "Set",
  setCode: "S1",
  number: "001",
  type: "character",
  rarity: "rare",
  finish: "non-foil",
});

function quote(vendor: VendorId, low: number, updatedAt: string): VendorQuote {
  const stats = { low, mid: low, high: low, market: low };
  return { cardId: "c", vendor, currency: "USD", native: stats, usd: stats, listingsCount: 2, url: "https://x.test", updatedAt };
}

const point = (date: string, market: number | null): PricePoint => ({ ...emptyPoint(date), market });

describe("current quotes", () => {
  it("keeps quotes captured on or after asOf minus seven days (UTC midnight)", () => {
    expect(quoteFreshSince("2026-10-14")).toBe("2026-10-07T00:00:00.000Z");
    const quotes = [
      quote("tcgplayer", 5, "2026-10-07T00:00:00.000Z"),
      quote("ebay", 4, "2026-10-06T23:59:59.999Z"),
      quote("cardmarket", 6, "2026-10-14T05:00:00+02:00"),
    ];
    expect(currentQuotes(quotes, "2026-10-14").map((q) => q.vendor)).toEqual(["tcgplayer", "cardmarket"]);
    expect(currentQuotes(quotes, null)).toHaveLength(3);
  });

  it("leaves stale vendors out of the lowest price and counts", () => {
    const history = [point("2026-10-14", 10)];
    const summary = buildSummary(card("c"), history, [
      quote("tcgplayer", 9, "2026-10-14T03:00:00.000Z"),
      quote("ebay", 1, "2026-09-01T03:00:00.000Z"),
    ]);
    expect(summary).toMatchObject({ lowestPrice: 9, lowestVendor: "tcgplayer", vendorCount: 1, listingsCount: 2 });
    expect(summary.updatedAt).toBe("2026-10-14T03:00:00.000Z");
  });
});

describe("rankMovers", () => {
  function summary(id: string, asOf: string | null, price: number | null, pct: number | null): CardMarketSummary {
    const change = pct === null || price === null ? null : { from: price, to: price, abs: 0, pct };
    return {
      card: card(id),
      asOf,
      marketPrice: price,
      lowestPrice: null,
      lowestVendor: null,
      vendorCount: 1,
      listingsCount: 0,
      changes: { "7d": change, "30d": change, "90d": change },
      sparkline: [],
      updatedAt: null,
    };
  }

  it("ranks only cards priced within a day of the catalog's latest market day", () => {
    const movers = rankMovers(
      [
        summary("live", "2026-10-14", 10, 20),
        summary("yesterday", "2026-10-13", 10, 15),
        summary("stale", "2026-10-12", 500, 90),
        summary("never", null, null, null),
      ],
      "7d",
      10,
    );
    expect(movers.gainers.map((s) => s.card.id)).toEqual(["live", "yesterday"]);
    expect(movers.mostValuable.map((s) => s.card.id)).toEqual(["live", "yesterday"]);
  });

  it("needs a change the UI shows as non-zero", () => {
    const movers = rankMovers(
      [
        summary("up", "2026-10-14", 10, 0.05),
        summary("flat-up", "2026-10-14", 10, 0.0499),
        summary("flat-down", "2026-10-14", 10, -0.0499),
        summary("down", "2026-10-14", 10, -0.05),
      ],
      "7d",
      10,
    );
    expect(movers.gainers.map((s) => s.card.id)).toEqual(["up"]);
    expect(movers.losers.map((s) => s.card.id)).toEqual(["down"]);
  });

  it("returns nothing for an empty catalog and clamps odd limits", () => {
    expect(rankMovers([], "7d", 5)).toEqual({ window: "7d", gainers: [], losers: [], mostValuable: [] });
    const all = [summary("a", "2026-10-14", 10, 1), summary("b", "2026-10-14", 9, 2)];
    expect(rankMovers(all, "7d", -3).gainers).toEqual([]);
    expect(rankMovers(all, "7d", Number.NaN).gainers).toEqual([]);
    expect(rankMovers(all, "7d", Number.POSITIVE_INFINITY).gainers).toHaveLength(2);
  });
});
