import type { CurrencyCode, MarketCard, VendorId } from "./types";

export interface VendorConfig {
  id: VendorId;
  name: string;
  currency: CurrencyCode;
  /** Chart series color, validated for the dark surface (categorical slots 2-4; slot 1 is the market line). */
  color: string;
  /** Vendor search page for a free-text query. Used when no product URL is known. */
  searchUrl: (query: string) => string;
  /** Registrable domains an ingested product or listing URL must belong to (subdomains allowed). */
  hosts: string[];
}

/** Fixed display order everywhere: tables, chart series, tie-breaks. */
export const VENDOR_ORDER: VendorId[] = ["tcgplayer", "ebay", "cardmarket"];

export const MARKET_SERIES_COLOR = "#3987e5";

export const VENDORS: Record<VendorId, VendorConfig> = {
  tcgplayer: {
    id: "tcgplayer",
    name: "TCGplayer",
    currency: "USD",
    color: "#d95926",
    searchUrl: (q) => `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(q)}`,
    hosts: ["tcgplayer.com"],
  },
  ebay: {
    id: "ebay",
    name: "eBay",
    currency: "USD",
    color: "#199e70",
    searchUrl: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`,
    // USD and EUR storefronts: ingestion accepts only those currencies.
    hosts: ["ebay.com", "ebay.de", "ebay.fr", "ebay.it", "ebay.es", "ebay.nl", "ebay.ie", "ebay.at", "ebay.be"],
  },
  cardmarket: {
    id: "cardmarket",
    name: "Cardmarket",
    currency: "EUR",
    color: "#c98500",
    searchUrl: (q) => `https://www.cardmarket.com/en/Search?searchString=${encodeURIComponent(q)}`,
    hosts: ["cardmarket.com"],
  },
};

/** The vendor's search page for a printing: the link whenever no product URL is known. */
export function vendorSearchUrl(vendor: VendorId, card: Pick<MarketCard, "name" | "setCode" | "number">): string {
  return VENDORS[vendor].searchUrl(`${card.name} ${card.setCode} ${card.number}`);
}

/**
 * True for an https URL on one of the vendor's own domains, without embedded credentials.
 * Scraped links become "Buy" buttons wrapped in the site's affiliate tracking, so a link
 * filed under a vendor must really point at that vendor.
 */
export function isVendorUrl(vendor: VendorId, value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return VENDORS[vendor].hosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isVendorId(value: unknown): value is VendorId {
  return typeof value === "string" && (VENDOR_ORDER as string[]).includes(value);
}

/** Position in VENDOR_ORDER, for deterministic tie-breaks. */
export function vendorRank(vendor: VendorId): number {
  return VENDOR_ORDER.indexOf(vendor);
}
