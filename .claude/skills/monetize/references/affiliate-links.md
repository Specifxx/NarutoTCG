# Affiliate links: formats, code layout, placements

Every outbound link to a store goes through one package, so tracking, `rel`, and disclosure are handled the same way everywhere. Formats were checked on 2026-10-14. Before shipping, confirm each one with a real link generated from the program's own dashboard.

## Configuration (env vars)

Document all of these in `.env.example`. Affiliate IDs show up in every link, so they aren't secret. They live in env vars so they can change without a code edit. **API keys are secret and must never have the `NEXT_PUBLIC_` prefix.**

| Variable | Example / source |
| --- | --- |
| `NEXT_PUBLIC_EPN_CAMPID` | 10-digit EPN campaign ID (EPN dashboard → Campaigns) |
| `NEXT_PUBLIC_TCGPLAYER_AFFILIATE_BASE` | The user's Impact tracking link **without** `u=`, e.g. `https://tcgplayer.pxf.io/c/1234567/1830156/21018`. Get it by having the user paste any TCGplayer affiliate link they already use. If it's a vanity/short link, they need the full tracking URL from impact.com. |
| `NEXT_PUBLIC_CARDNEXUS_AFFILIATE_BASE` | Same shape, from CardNexus's Impact account (after approval) |
| `NEXT_PUBLIC_AMAZON_TAG` | Associates tracking ID, e.g. `narutotcg-20` |
| `TCGPLAYER_PUBLIC_KEY`, `TCGPLAYER_PRIVATE_KEY` | Server or GitHub Actions secrets only. Used by the price-snapshot job, never by page code. |

If a merchant's variable is unset, its button is **not rendered**. Never ship a placeholder ID.

## Package layout

```
packages/affiliate/
  src/
    merchants.ts     // per-merchant builders (pure functions, no React)
    placement.ts     // Placement type -> subId string
    index.ts
  src/*.test.ts      // node:test or vitest; snapshot the exact URLs
packages/ui/src/
  AffiliateLink.tsx  // <a> with rel/target/data-attrs set correctly
  BuyBox.tsx         // merchant buttons + disclosure line
```

The shape of the API (adjust it to match the codebase you find):

```ts
type Merchant = "tcgplayer" | "ebay" | "cardnexus" | "amazon";
type Placement = { app: "compare" | "decks" | "simulator" | "learn" | "blog"; slot: string };
// subId = `${app}-${slot}`, e.g. "compare-cardbuybox", "decks-buydeck"

ebaySearchUrl(opts: { query: string; placement: Placement; market?: "US" | "GB" | "DE" | "FR" | "IT"; sealed?: boolean }): string
tcgplayerUrl(opts: { destination: string; placement: Placement }): string | null
tcgplayerDeckCartUrl(opts: { cards: { qty: number; name: string; setCode?: string; number?: string }[]; productLine: string; placement: Placement }): string | null
cardnexusUrl(opts: { destination: string; placement: Placement }): string | null
amazonUrl(opts: { asinOrSearch: string; placement: Placement }): string | null
```

Rendering rules for `AffiliateLink`:
- `rel="sponsored noopener"`. Google asks for `sponsored` on affiliate links. Leave out `noreferrer`, because some programs use the referrer to confirm traffic comes from the approved site.
- `target="_blank"`.
- Add a `data-merchant` and `data-placement` attribute so analytics can count clicks without a redirect hop.
- Don't add a `/go/` redirect route. It adds a server dependency, and the networks already count clicks. Per-placement subIds give the attribution.

## eBay Partner Network (no developer API)

The tracking parameters are appended to any eBay URL. We link to **search results**:

```
https://www.ebay.com/sch/i.html?_nkw=<query>&_sacat=<category>&LH_BIN=1&_sop=15
  &mkevt=1&mkcid=1&mkrid=<rotation id>&campid=<EPN campid>&toolid=10001&customid=<subId>
```

- `mkevt=1` means click. `mkcid=1` is the EPN channel. `toolid=10001` is the default.
- Rotation IDs (`mkrid`) by marketplace: US `711-53200-19255-0`, GB `710-53481-19255-0`, DE `707-53477-19255-0`, FR `709-53476-19255-0`, IT `724-53478-19255-0`.
- `_sacat`: CCG Individual Cards is `183454` on ebay.com *(verify per marketplace, and find the sealed-box category ID)*. `LH_BIN=1` limits results to Buy It Now. `_sop=15` sorts by price plus shipping, lowest first.
- **Query recipe:** `<game keyword> <card name> <collector number>`, e.g. `Naruto Mythos Rock Lee 117/130`. Run it by hand for ~10 real cards (a common, a rare, a secret rare, a promo, and a card that shares a name with others) and adjust until the first page is mostly the right card. Store a `ebayQueryOverride` on a card only when the recipe fails for it.
- **Marketplace (D8):** server HTML always uses ebay.com. After hydration, a small client effect may rewrite the links to the visitor's marketplace using `navigator.language` or a saved region choice. That keeps pages static.
- Never show an "eBay price". We don't have one without the API.

## TCGplayer (Impact)

- **Deep link:** `${BASE}?u=${encodeURIComponent(destination)}&subId1=${subId}`. The destination must be on tcgplayer.com.
- **Single card:** the destination is the product page URL. Store `tcgplayerProductId` and `tcgplayerUrl` on the card record when known (the API's product data includes the URL). Otherwise fall back to TCGplayer search for the card name within the product line.
- **Whole-deck cart (Mass Entry):** TCGplayer's Mass Entry tool accepts one line per card, written as `qty name [SET] number`. Deck sites deep-link to it with the list prefilled, roughly `https://www.tcgplayer.com/massentry?productline=<Line>&c=<lines joined by "||">` *(this exact URL shape is not documented; verify it by inspecting a working "Buy on TCGplayer" button on an established deck site before shipping)*. Wrap the result in the Impact deep link. If the game has no TCGplayer product line, hide this button and fall back to CardNexus or eBay.
- **Program rules:** links are not for your own purchases, and the partnership has to be disclosed where users can't miss it (TCGplayer Partner Guidelines).

## CardNexus (Impact)

Apply by emailing affiliate@cardnexus.com. Approval gives an Impact account, and links are built the same way as TCGplayer: `${BASE}?u=<encoded cardnexus.com URL>&subId1=<subId>`. CardNexus lists the Mythos catalog (`https://cardnexus.com/en/explore/naruto-mythos`), so it's the main singles merchant for Mythos until TCGplayer coverage is confirmed. Store a `cardnexusUrl` per card when it can be resolved.

## Amazon Associates (optional)

Use it for accessories and sealed product only: sleeves (state the card size), deck boxes, binders, playmats. The learn "what you need to start" article and the blog are the natural places. Link format: `https://www.amazon.com/dp/<ASIN>?tag=<tag>`. Associates closes accounts that don't make qualifying sales within its probation window *(verify the current rule)*, so join only once there's traffic.

## Placement map

| App / page | Placement (`slot`) | Merchants, in order | Notes |
| --- | --- | --- | --- |
| compare `/cards/[id]` | `cardbuybox` | TCGplayer (when listed) → CardNexus → eBay | Next to the price table. Disclosure line under the buttons. |
| compare price table rows | `pricetable` | The row's own merchant | Each sourced price links to that merchant |
| compare lists (gainers / losers / most valuable) | `list` | Primary merchant per row | Small "Buy" link per row |
| compare `/sealed/[id]` | `sealedbuybox` | CardNexus / TCGplayer → eBay (sealed) → Amazon | |
| decks `/decks/[id]` | `buydeck` | TCGplayer Mass Entry → per-card list fallback | Above the fold, next to the deck title |
| decks tournament results | `tournamentdeck` | Same as `buydeck` | One button per top-cut list |
| decks card hover/popover | `cardhover` | Primary merchant | |
| simulator deckbuilder | `deckbuilder` | "Buy this deck" / "Buy missing cards" | **Never on the board.** Keep it in the deckbuilder side panel and the export dialog. |
| learn articles | `learn-<slug>` | Starter product, accessories | Only where the article recommends a product |
| blog | `blog-<slug>` | Whatever the article discusses | In context. Never a wall of links. |

## Disclosure (required by FTC, EPN, and TCGplayer)

- Put this line right under every BuyBox: *"We may earn a commission when you buy through these links. It doesn't change the price you pay."*
- Every page footer links to `/affiliate-disclosure`.
- Articles that contain affiliate links open with a one-line disclosure **before** the first link.
- Don't style affiliate buttons to look like site navigation, and don't put them inside or right next to AdSense units (see `adsense-readiness.md`).
