import { buildAffiliateUrl } from "@/lib/market/affiliate";
import type { MarketCard, VendorId, VendorListing, VendorQuote } from "@/lib/market/types";
import { VENDOR_ORDER, vendorSearchUrl } from "@/lib/market/vendors";

/**
 * Outbound marketplace links for a card. Server-only: affiliate tracking is read
 * from process.env, so client components receive the finished hrefs as props.
 */
export type VendorLinks = Record<VendorId, string>;

/** Call-to-action verb when the vendor quotes the card. Cardmarket ships from the EU, so it is offered as a lookup. */
export const VENDOR_VERB: Record<VendorId, "Buy" | "View"> = { tcgplayer: "Buy", ebay: "Buy", cardmarket: "View" };

/** Product page when the vendor quotes the card, otherwise its search page; affiliate-wrapped either way. */
export function buildVendorLinks(card: MarketCard, quotes: VendorQuote[]): VendorLinks {
  const byVendor = new Map(quotes.map((q) => [q.vendor, q]));
  const entries = VENDOR_ORDER.map((vendor) => {
    const target = byVendor.get(vendor)?.url ?? vendorSearchUrl(vendor, card);
    return [vendor, buildAffiliateUrl(vendor, target)] as const;
  });
  return Object.fromEntries(entries) as VendorLinks;
}

/** A listing's own page when captured, otherwise the vendor's page for the card. */
export function listingHref(listing: VendorListing, links: VendorLinks): string {
  return listing.url ? buildAffiliateUrl(listing.vendor, listing.url) : links[listing.vendor];
}
