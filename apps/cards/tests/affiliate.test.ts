import type { CardPrinting, CardSet, NarutoCard } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import {
  EBAY_CAMPAIGN_ID,
  TCGPLAYER_IMPACT_LINK,
  affiliateSubId,
  cardQuery,
  ebaySearchUrl,
  narutoQuery,
  setQuery,
  shopLinks,
  tcgplayerSearchUrl,
} from "@/lib/affiliate";

const card = { id: "ST01-002", name: "Sasuke Uchiha" } as NarutoCard;
const standard: CardPrinting = { setId: "ST01", number: "ST01-002", rarity: "super-rare", variant: "standard" };

describe("affiliate links", () => {
  it("builds sanitised, prefixed sub-ids", () => {
    expect(affiliateSubId("card detail", "ST01-002")).toBe("nt-card-detail-st01-002");
    expect(affiliateSubId("a/b?c=d", null, undefined)).toBe("nt-a-b-c-d");
    expect(affiliateSubId("x".repeat(100))).toHaveLength(60);
  });

  it("anchors searches to the game and to the printing", () => {
    expect(narutoQuery("Sasuke Uchiha")).toBe("Naruto TCG Sasuke Uchiha");
    expect(narutoQuery("Naruto TCG booster")).toBe("Naruto TCG booster");
    expect(narutoQuery("  ")).toBe("Naruto TCG");
    expect(cardQuery(card, standard)).toBe("Naruto TCG Sasuke Uchiha ST01-002");
    expect(cardQuery(card, { ...standard, variant: "parallel" })).toBe("Naruto TCG Sasuke Uchiha ST01-002 parallel");
    const set = { name: "Booster Set 01: Will of Fire", kind: "booster" } as CardSet;
    expect(setQuery(set)).toBe("Naruto TCG Booster Set 01: Will of Fire booster box");
  });

  it("tags eBay searches with every EPN parameter", () => {
    const url = new URL(ebaySearchUrl("Naruto TCG Sasuke", "card-detail"));
    expect(url.hostname).toBe("www.ebay.com");
    expect(url.searchParams.get("_nkw")).toBe("Naruto TCG Sasuke");
    expect(url.searchParams.get("mkevt")).toBe("1");
    expect(url.searchParams.get("mkcid")).toBe("1");
    expect(url.searchParams.get("mkrid")).toBe("711-53200-19255-0");
    expect(url.searchParams.get("campid")).toBe(EBAY_CAMPAIGN_ID);
    expect(url.searchParams.get("toolid")).toBe("10001");
    expect(url.searchParams.get("customid")).toBe("nt-card-detail-search");
  });

  it("wraps TCGplayer searches in the Impact deep link", () => {
    const url = new URL(tcgplayerSearchUrl("Naruto TCG Sasuke & Co", "set-page"));
    expect(`${url.origin}${url.pathname}`).toBe(TCGPLAYER_IMPACT_LINK);
    const target = new URL(url.searchParams.get("u") ?? "");
    expect(target.hostname).toBe("www.tcgplayer.com");
    expect(target.searchParams.get("q")).toBe("Naruto TCG Sasuke & Co");
    expect(url.searchParams.get("sharedid")).toBe("nt-set-page");
  });

  it("returns TCGplayer then eBay", () => {
    expect(shopLinks("q", "p").map((l) => l.retailer)).toEqual(["tcgplayer", "ebay"]);
  });
});
