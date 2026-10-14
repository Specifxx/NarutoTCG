import type { VendorId } from "./types";

type Env = Record<string, string | undefined>;

/** `rel` for every outbound marketplace link (FTC: affiliate links are sponsored). */
export const AFFILIATE_REL = "sponsored noopener noreferrer";

/** eBay Partner Network rover parameters for ebay.com (US). */
const EBAY_EPN_PARAMS = { mkcid: "1", mkrid: "711-53200-19255-0", siteid: "0", toolid: "10001", mkevt: "1" };

function withParams(target: string, params: Record<string, string>): string {
  const url = new URL(target);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Wrap a marketplace URL with the deployment's affiliate tracking, when configured.
 * - TCGplayer: TCGPLAYER_AFFILIATE_URL is an Impact deep-link base
 *   (e.g. https://tcgplayer.pxf.io/c/<publisher>/<ad>/<campaign>); the target goes in `u`.
 * - eBay: EBAY_CAMPAIGN_ID (+ optional EBAY_CUSTOM_ID) adds EPN tracking params.
 * - Cardmarket: CARDMARKET_REFERRER adds `referrer`.
 * Without configuration (or for a non-http URL) the target is returned untouched.
 */
export function buildAffiliateUrl(vendor: VendorId, target: string, env: Env = process.env): string {
  if (!isHttpUrl(target)) return target;
  switch (vendor) {
    case "tcgplayer": {
      const base = env.TCGPLAYER_AFFILIATE_URL?.trim();
      if (!base || !isHttpUrl(base)) return target;
      return withParams(base, { u: target });
    }
    case "ebay": {
      const campid = env.EBAY_CAMPAIGN_ID?.trim();
      if (!campid) return target;
      const customid = env.EBAY_CUSTOM_ID?.trim();
      return withParams(target, { ...EBAY_EPN_PARAMS, campid, ...(customid ? { customid } : {}) });
    }
    case "cardmarket": {
      const referrer = env.CARDMARKET_REFERRER?.trim();
      return referrer ? withParams(target, { referrer }) : target;
    }
  }
}

/** True when this deployment earns commission on the vendor's links (drives the disclosure). */
export function hasAffiliate(vendor: VendorId, env: Env = process.env): boolean {
  switch (vendor) {
    case "tcgplayer":
      return Boolean(env.TCGPLAYER_AFFILIATE_URL?.trim());
    case "ebay":
      return Boolean(env.EBAY_CAMPAIGN_ID?.trim());
    case "cardmarket":
      return Boolean(env.CARDMARKET_REFERRER?.trim());
  }
}
