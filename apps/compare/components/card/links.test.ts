import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketCard, VendorListing, VendorQuote } from "@/lib/market/types";
import { buildVendorLinks, listingHref } from "./links";

const card: MarketCard = {
  id: "ntg01-004",
  name: "Kakashi Hatake, Copy Ninja",
  character: "Kakashi Hatake",
  set: "Scroll of Beginnings",
  setCode: "NTG01",
  number: "004",
  type: "character",
  rarity: "super-rare",
  finish: "foil",
};

const stats = { low: 1, mid: 1, high: 1, market: 1 };
const quote: VendorQuote = {
  cardId: card.id,
  vendor: "tcgplayer",
  currency: "USD",
  native: stats,
  usd: stats,
  listingsCount: 1,
  url: "https://www.tcgplayer.com/product/123",
  updatedAt: "2026-10-14T00:00:00Z",
};

afterEach(() => vi.unstubAllEnvs());

describe("buildVendorLinks", () => {
  it("uses the quoted product page, else the vendor's search for the card", () => {
    const links = buildVendorLinks(card, [quote]);
    expect(links.tcgplayer).toBe(quote.url);
    expect(links.ebay).toBe(
      `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent("Kakashi Hatake, Copy Ninja NTG01 004")}`,
    );
    expect(links.cardmarket).toContain("cardmarket.com/en/Search?searchString=");
  });

  it("wraps every link with the deployment's affiliate tracking", () => {
    vi.stubEnv("TCGPLAYER_AFFILIATE_URL", "https://tcgplayer.pxf.io/c/1/2/3");
    vi.stubEnv("EBAY_CAMPAIGN_ID", "5338");
    vi.stubEnv("CARDMARKET_REFERRER", "narutotcg");
    const links = buildVendorLinks(card, [quote]);
    expect(new URL(links.tcgplayer).searchParams.get("u")).toBe(quote.url);
    expect(new URL(links.ebay).searchParams.get("campid")).toBe("5338");
    expect(new URL(links.cardmarket).searchParams.get("referrer")).toBe("narutotcg");
  });
});

describe("listingHref", () => {
  const listing: VendorListing = {
    id: "l1",
    cardId: card.id,
    vendor: "ebay",
    seller: "KunaiAndCo",
    condition: "NM",
    quantity: 1,
    currency: "USD",
    price: 10,
    shipping: null,
    priceUsd: 10,
    shippingUsd: null,
    totalUsd: 10,
    url: "https://www.ebay.com/itm/42",
    updatedAt: "2026-10-14T00:00:00Z",
  };

  it("prefers the listing's own page, affiliate-wrapped", () => {
    vi.stubEnv("EBAY_CAMPAIGN_ID", "5338");
    const href = listingHref(listing, buildVendorLinks(card, []));
    expect(href.startsWith("https://www.ebay.com/itm/42?")).toBe(true);
    expect(new URL(href).searchParams.get("campid")).toBe("5338");
  });

  it("falls back to the vendor link for the card", () => {
    const links = buildVendorLinks(card, []);
    expect(listingHref({ ...listing, url: null }, links)).toBe(links.ebay);
  });
});
