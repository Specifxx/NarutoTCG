// Affiliate links for TCGplayer (Impact) and eBay (eBay Partner Network), using
// the same partner accounts as TCGEmpire/RiftCompare. These ids are PUBLIC by
// design (they appear in outbound URLs), so they are safe as code defaults and
// can be rotated via env vars. `||` (not `??`) so an env var accidentally set to
// "" still falls back: an empty id silently un-monetises every click.
import type { CardPrinting, CardSet, NarutoCard } from "@naruto-tcg/types";

/** eBay Partner Network campaign id (credits the click to our EPN account). */
export const EBAY_CAMPAIGN_ID = process.env.EBAY_AFFILIATE_CAMPAIGN || "5339155912";
/** EPN rotation and site id for ebay.com (the US marketplace). */
const EBAY_US_MKRID = process.env.EBAY_MKRID_US || "711-53200-19255-0";
const EBAY_US_SITEID = process.env.EBAY_SITEID_US || "0";

/** TCGplayer's affiliate program runs through Impact; every tcgplayer.com link is wrapped in this deep link. */
export const TCGPLAYER_IMPACT_LINK =
  process.env.TCGPLAYER_IMPACT_LINK || "https://partner.tcgplayer.com/c/7385758/1780961/21018";

/** Impact site-ownership verification token, rendered as a <meta> in the document head. */
export const IMPACT_SITE_VERIFICATION =
  process.env.IMPACT_SITE_VERIFICATION || "ebb0400c-dec0-45ae-a56e-e7bb1596e965";

/**
 * Machine-readable half of the disclosure: paid links are `sponsored` (Google's
 * required label for affiliate links) and `nofollow`. The visible half is
 * <AffiliateDisclosure>; both are required.
 */
export const AFFILIATE_REL = "sponsored nofollow noopener noreferrer";

// Prefix that separates this site's clicks from RiftCompare's in the EPN
// (customid) and Impact (sharedid) reports, which share the same accounts.
const SUBID_PREFIX = "nt";
const SUBID_MAX = 60;

/**
 * Placement sub-id, e.g. `nt-card-detail`. Sanitised hard: EPN silently drops a
 * click whose customid contains characters outside a conservative set.
 */
export function affiliateSubId(...parts: Array<string | null | undefined>): string {
  const id = [SUBID_PREFIX, ...parts]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return id.slice(0, SUBID_MAX) || SUBID_PREFIX;
}

/** Search phrase for a product, always anchored to the game so results stay on-topic. */
export function narutoQuery(text: string): string {
  const clean = text.replace(/[,"]/g, " ").replace(/\s+/g, " ").trim();
  if (clean === "") return "Naruto TCG";
  return /\bnaruto\b/i.test(clean) && /\b(tcg|card game|mythos)\b/i.test(clean) ? clean : `Naruto TCG ${clean}`;
}

/** Marketplace search phrase for one printing: name plus collector number, which sellers list. */
export function cardQuery(card: NarutoCard, printing: CardPrinting): string {
  const parallel = printing.variant === "parallel" ? " parallel" : printing.variant === "alt-art" ? " alt art" : "";
  return narutoQuery(`${card.name} ${printing.number}${parallel}`);
}

/** Search phrase for a set's sealed product. */
export function setQuery(set: CardSet): string {
  return narutoQuery(set.kind === "booster" ? `${set.name} booster box` : set.name);
}

/** eBay search tagged with the EPN "smart link" parameters (mkevt=1 is what makes the click count). */
export function ebaySearchUrl(query: string, placement: string): string {
  const url = new URL("https://www.ebay.com/sch/i.html");
  url.searchParams.set("_nkw", query);
  url.searchParams.set("mkevt", "1");
  url.searchParams.set("mkcid", "1");
  url.searchParams.set("mkrid", EBAY_US_MKRID);
  url.searchParams.set("siteid", EBAY_US_SITEID);
  url.searchParams.set("campid", EBAY_CAMPAIGN_ID);
  url.searchParams.set("toolid", "10001");
  url.searchParams.set("customid", affiliateSubId(placement, "search"));
  return url.toString();
}

/** TCGplayer search wrapped in the Impact deep link, with the placement as `sharedid`. */
export function tcgplayerSearchUrl(query: string, placement: string): string {
  const target = `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(query)}&view=grid`;
  return `${TCGPLAYER_IMPACT_LINK}?u=${encodeURIComponent(target)}&sharedid=${encodeURIComponent(affiliateSubId(placement))}`;
}

export type Retailer = "tcgplayer" | "ebay";

export interface ShopLink {
  retailer: Retailer;
  label: string;
  href: string;
}

/** TCGplayer + eBay links for one search phrase, in display order. */
export function shopLinks(query: string, placement: string): ShopLink[] {
  return [
    { retailer: "tcgplayer", label: "TCGplayer", href: tcgplayerSearchUrl(query, placement) },
    { retailer: "ebay", label: "eBay", href: ebaySearchUrl(query, placement) },
  ];
}
