# Naruto TCG Price Compare

Single-card price comparison and market tracking for the Naruto TCG: a searchable price directory with market movers, per-card vendor comparison with daily price history, and an ingestion API that records prices from TCGplayer, eBay and Cardmarket.

```bash
pnpm --filter @naruto-tcg/compare dev     # http://localhost:3002
pnpm --filter @naruto-tcg/compare test    # unit tests (+ Postgres parity tests when TEST_DATABASE_URL is set)
pnpm --filter @naruto-tcg/compare build
```

With no environment configured the app runs on a deterministic **demo dataset** (simulated prices, clearly labelled in the UI) and ingestion runs as a dry run. Set `DATABASE_URL` to switch to PostgreSQL / Supabase. See [`.env.example`](./.env.example) for every variable; production builds also need the four `NEXT_PUBLIC_*_URL` variables for the cross-app header.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Price directory: search, multi-select Set / Rarity / Finish filters, sorting, pagination, plus Top Price Gainers, Top Price Losers and Most Valuable Cards (7D / 30D). Filters live in the URL (`?q=&set=NTG01,NTG02&rarity=parallel,promo&finish=foil&sort=change7-desc&page=2&movers=30d`). |
| `/card/[id]` | Card market page: market stats, affiliate buy buttons, 7D / 30D / 90D price history chart (market plus each vendor), vendor price comparison table, live listings, other printings. |
| `POST /api/prices/cron` | Ingests price updates (vendor low / mid / high / market and individual listings) and records daily history. |
| `GET /api/prices/cron` | Daily rollup for Vercel Cron (`vercel.json`): carries each vendor's latest capture from the last 7 days into today's history and recomputes market prices. `?day=YYYY-MM-DD` closes a past day or repairs a missed one. |

## How prices are computed

All rules live in [`lib/market/analytics.ts`](./lib/market/analytics.ts); the Postgres view `card_market_summary` reproduces them, and an integration test asserts both back ends return identical results.

- **Freshness**: a vendor quote counts as current for 7 days (`CARRY_FORWARD_MAX_DAYS`) after its capture, measured against the card's latest market day. Older quotes are left out of the lowest price, the best-price badge, the vendor table and the live listings.
- **Market price** for a day = median of the market prices of the vendors with current prices, in USD (Cardmarket converted from EUR with `FX_EUR_USD`), computed in integer cents. The daily rollup and every ingest carry each vendor's latest capture from the last 7 days into the day being written, so the median covers every current vendor even when only one vendor was pushed that day. `GET ?day=` repairs a missed day.
- **Change** over 7 / 30 / 90 days compares the latest market price with the latest price on or before that many days earlier.
- **Lowest price** = lowest current vendor low price; **listings** are ranked by delivered total (price + shipping).
- **Movers**: Top Gainers / Losers only rank cards worth at least $1 (so penny cards don't dominate) whose latest market day is within 1 day of the catalog's latest market day and whose change is at least 0.05% (the smallest change the UI shows as non-zero). Most Valuable leaves out the same stale cards.

## Architecture

```
app/
  (directory)/page.tsx        price directory (server component; URL is the state)
  (directory)/loading.tsx     the route group's own loading skeleton
  card/[id]/page.tsx          card market page (ISR, revalidate 300s)
  api/prices/cron/route.ts    ingestion + rollup endpoint (Node runtime)
  error.tsx                   error boundary for pages under the root layout
  global-error.tsx            last-resort boundary when the root layout itself fails
  robots.ts / sitemap.ts      robots.txt and sitemap.xml
components/
  directory/                  filters, multi-selects, movers, results table, pagination
  card/                       chart (Recharts), vendor comparison, listings, buy buttons
  market/                     shared atoms: card art, price change, badges, sparkline
lib/market/
  types.ts                    domain types + MarketRepository contract
  analytics.ts                pricing, change, ranking, filtering semantics
  repository.ts               picks Postgres (DATABASE_URL) or the seed dataset
  seed/                       deterministic demo catalog and price generator
  postgres-repository.ts      SQL implementation; db.ts holds the pooled client
  ingest-schema.ts / ingest.ts  wire format (zod) and the ingestion pipeline
  catalog-schema.ts           catalog file format for db:catalog
  resolve.ts                  matches scraped card references to catalog printings
  affiliate.ts / vendors.ts   marketplace URLs, vendor domains and affiliate tracking
supabase/migrations/          schema, indexes, summary view, RLS policies
scripts/                      db:migrate, db:catalog and db:seed
docs/chrome-extension-prompt.md  Claude in Chrome prompt that captures ingestion payloads
next.config.ts                security headers (no framing, nosniff, referrer policy)
```

## Database (PostgreSQL / Supabase)

```bash
export DATABASE_URL="postgres://user:pass@host:6543/postgres?sslmode=require"  # Supabase: pooled URL
pnpm --filter @naruto-tcg/compare db:migrate                       # applies supabase/migrations/*.sql once each
pnpm --filter @naruto-tcg/compare db:catalog path/to/catalog.json  # load the sets and cards to price
```

TLS is required for non-local hosts: append `?sslmode=require` to Supabase's connection string (the pooled string from the dashboard carries no `sslmode`). Set `sslmode=disable` only for a trusted local database.

### Card catalog

Ingestion only prices cards that already exist, so load a catalog before pushing prices. `db:catalog` upserts sets and cards from a JSON file and never touches prices:

```json
{
  "sets": [{ "code": "NTG01", "name": "Scroll of Beginnings", "releasedOn": "2025-03-14" }],
  "cards": [
    {
      "id": "ntg01-001-p",
      "name": "Naruto Uzumaki, Knucklehead Genin",
      "character": "Naruto Uzumaki",
      "setCode": "NTG01",
      "number": "001",
      "type": "character",
      "rarity": "parallel",
      "finish": "foil",
      "village": "Leaf",
      "cost": 3,
      "power": 3
    }
  ]
}
```

Set codes are upper-case and card ids lower-case; `character` groups a card's printings. `village`, `cost`, `power`, `text` and `imageUrl` (https) are optional.

| Command | Effect |
| --- | --- |
| `db:catalog path/to/catalog.json` | Upserts the real catalog; prices are untouched. |
| `db:seed -- --catalog-only` | Loads just the demo catalog, without simulated prices. |
| `db:seed -- --replace` | Loads the full simulated demo dataset and marks the database as demo data: the UI labels it "Demo data — simulated prices" even in Postgres mode. |
| `db:catalog -- --replace path/to/catalog.json` | Imports the real catalog and clears market data and the demo flag, to leave demo data behind. |

Tables: `market_sets`, `market_cards`, `vendor_quotes` (current snapshot per card and vendor), `vendor_listings`, `price_history` (one row per card, vendor and day), `market_price_daily` (cross-vendor market price per card and day), `market_meta` (the demo-data flag) and the `card_market_summary` view. Row Level Security is enabled with read-only policies for Supabase's `anon` and `authenticated` roles (none on `market_meta`); the app writes over the direct connection.

Run the parity and persistence tests against a scratch database (each run uses its own throwaway schema):

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/compare_test pnpm --filter @naruto-tcg/compare test
```

## Ingestion API

`POST /api/prices/cron` with `Authorization: Bearer $CRON_SECRET` and a JSON body:

```json
{
  "source": "chrome-extension/1.0.0",
  "capturedAt": "2026-10-14T11:55:00Z",
  "fxRates": { "EUR": 1.17 },
  "items": [
    {
      "card": { "setCode": "NTG01", "number": "001", "finish": "foil", "rarity": "parallel" },
      "vendor": "tcgplayer",
      "url": "https://www.tcgplayer.com/product/512345",
      "prices": { "low": 39.99, "mid": 48.25, "high": 89.99, "market": 46.1 },
      "listingsCount": 37,
      "listings": [
        { "seller": "Hidden Leaf Games", "condition": "NM", "quantity": 2, "price": 41.5, "shipping": 1.31 },
        { "seller": "Akatsuki Cards", "condition": "LP", "quantity": 1, "price": 39.99, "shipping": 4.99 },
        { "seller": "Konoha Collectibles", "condition": "NM", "quantity": 1, "price": 44, "shipping": 0 }
      ]
    },
    {
      "card": { "setCode": "NTG01", "number": "002", "finish": "non-foil" },
      "vendor": "cardmarket",
      "currency": "EUR",
      "prices": { "low": 52, "mid": 58.4, "high": 75, "market": 56.9 },
      "listingsCount": 18
    }
  ]
}
```

Response (demo mode):

```json
{
  "ok": true,
  "mode": "dry-run",
  "source": "chrome-extension/1.0.0",
  "received": 2,
  "accepted": [
    { "index": 0, "cardId": "ntg01-001-p", "vendor": "tcgplayer" },
    { "index": 1, "cardId": "ntg01-002", "vendor": "cardmarket" }
  ],
  "rejected": [],
  "written": { "vendorQuotes": 2, "listings": 3, "historyPoints": 2, "marketPoints": 2 }
}
```

The `capturedAt` above is a fixed example: replace it with the current time. Captures more than 10 minutes in the future or older than 400 days are rejected.

Each item names its card by `card.id`, or by `setCode` + `number` and/or `name`, plus `finish` (and `rarity` when a foil and a parallel share one number). A `rarity` of `parallel` or `promo` is a hard constraint: it only matches printings of that rarity. Unknown or ambiguous cards are rejected item by item, never guessed. `listings` replaces the stored listings for that card and vendor (send `[]` to clear them, or leave it out to keep them); when both `listings` and `listingsCount` are left out, the stored listing count is kept too. Prices may be numbers or price text in US or EU notation (`"$1,234.50"`, `"12,50 €"`); `currency` defaults to the vendor's (Cardmarket EUR, others USD). `capturedAt` (envelope or per item) files the prices under that UTC day; captures up to 400 days old backfill history without replacing a newer current quote.

Items are also rejected one by one when a product or listing `url` is not an https link on the vendor's own domain (tcgplayer.com, ebay.com and eBay's EU sites, cardmarket.com; see [`lib/market/vendors.ts`](./lib/market/vendors.ts)) or when a string contains a NUL character. Within one batch the latest `capturedAt` per card, vendor and day wins (on a tie, the later item); the others are rejected as superseded.

The response lists `accepted` and `rejected` items by index with a reason. Without `DATABASE_URL` it says `"mode": "dry-run"`.

| Status | When |
| --- | --- |
| `200` | At least one item was accepted. |
| `400` | The body is not valid JSON (POST), or `?day=` is not a valid past or current `YYYY-MM-DD` (GET). |
| `401` | Missing or wrong `Authorization: Bearer` secret. |
| `413` | Body over 1 MB (1,000,000 bytes). |
| `415` | `Content-Type` is not `application/json` (parameters such as `charset` are allowed). |
| `422` | Invalid envelope, or no item was accepted. |
| `503` | `CRON_SECRET` is unset in production. |
| `500` | Unexpected failure. |

### Capturing prices with Claude in Chrome

[`docs/chrome-extension-prompt.md`](./docs/chrome-extension-prompt.md) is a ready-to-paste prompt. It has Claude in Chrome read an open TCGplayer, eBay or Cardmarket page and output this exact payload, including vendor low / mid / high / market values and individual listings.

## Affiliate links

Buy buttons and listing links go through `buildAffiliateUrl`: `TCGPLAYER_AFFILIATE_URL` (an Impact deep-link base), `EBAY_CAMPAIGN_ID` (eBay Partner Network) and `CARDMARKET_REFERRER`. Unset variables leave links untouched. Every marketplace link uses `rel="sponsored noopener noreferrer"`, and the footer carries the disclosure. Search URL templates per vendor are in `lib/market/vendors.ts`.
