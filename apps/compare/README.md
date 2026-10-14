# Naruto TCG Price Compare

Single-card price comparison and market tracking for the Naruto TCG: a searchable price directory with market movers, per-card vendor comparison with daily price history, and an ingestion API that records prices from TCGplayer, eBay and Cardmarket.

```bash
pnpm --filter @naruto-tcg/compare dev     # http://localhost:3002
pnpm --filter @naruto-tcg/compare test    # unit tests (+ Postgres parity tests when TEST_DATABASE_URL is set)
pnpm --filter @naruto-tcg/compare build
```

With no environment configured the app runs on a deterministic **demo dataset** (simulated prices, clearly labelled in the UI) and ingestion runs as a dry run. Set `DATABASE_URL` to switch to PostgreSQL / Supabase. See [`.env.example`](./.env.example) for every variable.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Price directory: search, multi-select Set / Rarity / Finish filters, sorting, pagination, plus Top Price Gainers, Top Price Losers and Most Valuable Cards (7D / 30D). Filters live in the URL (`?q=&set=NTG01,NTG02&rarity=parallel,promo&finish=foil&sort=change7-desc&page=2&movers=30d`). |
| `/card/[id]` | Card market page: market stats, affiliate buy buttons, 7D / 30D / 90D price history chart (market plus each vendor), vendor price comparison table, live listings, other printings. |
| `POST /api/prices/cron` | Ingests price updates (vendor low / mid / high / market and individual listings) and records daily history. |
| `GET /api/prices/cron` | Daily rollup for Vercel Cron (`vercel.json`): carries vendor snapshots refreshed within the last 7 days forward into today's history and recomputes market prices. `?day=YYYY-MM-DD` closes a past day. |

## How prices are computed

All rules live in [`lib/market/analytics.ts`](./lib/market/analytics.ts); the Postgres view `card_market_summary` reproduces them, and an integration test asserts both back ends return identical results.

- **Market price** for a day = median of the vendors' market prices that day, in USD (Cardmarket converted from EUR with `FX_EUR_USD`), computed in integer cents.
- **Change** over 7 / 30 / 90 days compares the latest market price with the latest price on or before that many days earlier.
- **Lowest price** = lowest vendor low price; **listings** are ranked by delivered total (price + shipping).
- **Movers** only rank cards worth at least $1, so penny cards don't dominate.

## Architecture

```
app/
  page.tsx                    price directory (server component; URL is the state)
  card/[id]/page.tsx          card market page (ISR, revalidate 300s)
  api/prices/cron/route.ts    ingestion + rollup endpoint (Node runtime)
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
  resolve.ts                  matches scraped card references to catalog printings
  affiliate.ts / vendors.ts   marketplace URLs and affiliate tracking
supabase/migrations/          schema, indexes, summary view, RLS policies
scripts/                      db:migrate and db:seed
```

## Database (PostgreSQL / Supabase)

```bash
export DATABASE_URL=postgres://user:pass@host:5432/db   # Supabase: pooled URL, port 6543
pnpm --filter @naruto-tcg/compare db:migrate            # applies supabase/migrations/*.sql once each
pnpm --filter @naruto-tcg/compare db:seed -- --replace  # optional: load the demo dataset
```

Tables: `market_sets`, `market_cards`, `vendor_quotes` (current snapshot per card and vendor), `vendor_listings`, `price_history` (one row per card, vendor and day), `market_price_daily` (cross-vendor market price per card and day) and the `card_market_summary` view. Row Level Security is enabled with read-only policies for Supabase's `anon` and `authenticated` roles; the app writes over the direct connection.

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

Each item names its card by `card.id`, or by `setCode` + `number` and/or `name`, plus `finish` (and `rarity` when a foil and a parallel share one number). Unknown or ambiguous cards are rejected item by item, never guessed. `listings` replaces the stored listings for that card and vendor (send `[]` to clear them, or leave it out to keep them). Prices may be numbers or price text in US or EU notation (`"$1,234.50"`, `"12,50 €"`); `currency` defaults to the vendor's (Cardmarket EUR, others USD). `capturedAt` (envelope or per item) files the prices under that UTC day; captures up to 400 days old backfill history without replacing a newer current quote.

The response lists `accepted` and `rejected` items by index with a reason. Status is `200` when anything was accepted, `422` when nothing was, `401` without a valid secret, `413` over 1 MB, `415` without a JSON content type. Without `DATABASE_URL` the response says `"mode": "dry-run"`.

## Affiliate links

Buy buttons and listing links go through `buildAffiliateUrl`: `TCGPLAYER_AFFILIATE_URL` (an Impact deep-link base), `EBAY_CAMPAIGN_ID` (eBay Partner Network) and `CARDMARKET_REFERRER`. Unset variables leave links untouched. Every marketplace link uses `rel="sponsored noopener noreferrer"`, and the footer carries the disclosure. Search URL templates per vendor are in `lib/market/vendors.ts`.
