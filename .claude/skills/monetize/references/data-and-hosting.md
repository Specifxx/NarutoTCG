# Data and hosting

Short version: **the data can live in GitHub, but the monetized sites can't be hosted there for free.**

## What lives where

| Data | Where | How it updates | Why |
| --- | --- | --- | --- |
| Cards (text, stats, image refs) | `data/<game>/cards/*.json` in the repo | A PR per set release | Changes rarely. Built statically into every app. |
| Rules, lessons, glossary, puzzles | `content/learn/**` (MDX/JSON) | PR | Same |
| Blog posts | `content/<site>/posts/*.mdx` | PR | Same |
| Tournament results and decklists | `data/<game>/tournaments/<event>.json` | PR. The TO upload wizard can open a PR through the GitHub API, or a maintainer commits the upload. | Reviewable, versioned, free |
| Price snapshots | `data/<game>/prices/` on a **`data` branch** (or a separate data repo) | A scheduled GitHub Action, once a day | Keeps price commits out of `main`, so they don't trigger app builds |
| Comments and upvotes | **Giscus** (GitHub Discussions) | Users | Free, no database. It needs a **public** repo for Discussions. If this repo is private, use a separate public `narutotcg-discussions` repo. |
| Accounts, saved private decks, non-PR uploads | Supabase / Postgres, **only if needed** | App | The first thing that actually needs a database. Supabase's free tier pauses inactive projects *(verify)*. |

### Price snapshots via GitHub Actions ("git scraping")

- Workflow `prices.yml` runs on a daily `schedule`. It calls the allowed price source(s) through the `PriceSource` adapter (D4), using keys from Actions secrets. It writes `prices/<YYYY-MM-DD>.json` (one row per card and source: `low`, `market`, `currency`, `recordedAt`) and updates `prices/latest.json` plus a compact per-card history file. Then it commits to the `data` branch.
- Apps read the snapshots at build time, or with ISR (`revalidate: 86400`), from the `data` branch through `raw.githubusercontent.com` or jsDelivr. After a snapshot commit, trigger a rebuild of **compare only** with its deploy hook.
- **Size:** about 1,000 cards × 3 sources × ~120 bytes is ~360 KB a day before compression. Git stores this compactly as diffs, and it's well under GitHub's recommended repo sizes for years. If it grows, roll old daily files into monthly ones.
- Monorepo builds: give each Vercel project an Ignored Build Step using `npx turbo-ignore`, so a commit that only touches content for one app doesn't rebuild all four.
- Don't scrape store HTML in this job (see `strategy.md`).

## Hosting the sites (D3)

| Option | Ads/affiliate allowed? | Notes |
| --- | --- | --- |
| Vercel **Hobby** (free) | **No.** Fair-use guidelines list "inclusion of advertisements, including … Google AdSense" and sites whose primary purpose is affiliate linking as commercial use, which Hobby doesn't allow. | Fine while building. Move before turning on ads or affiliate links. |
| Vercel **Pro** | Yes | ~$20/mo per seat *(verify)*. One team holds all four projects, so this is the least work. |
| Cloudflare Workers via **OpenNext** | Free tier is commonly reported to allow commercial use *(verify Cloudflare's terms)* | The Next.js adapter is `@opennextjs/cloudflare` (the older `next-on-pages` is deprecated). Free Workers have tight CPU limits per request, so keep pages static/ISR. |
| GitHub Pages | **No** for compare, and risky for all of them. GitHub's terms forbid using Pages for sites "primarily directed at … facilitating commercial transactions". It's static-only too, so there are no API routes, ISR, or middleware. | Not recommended |

Domains (D2): whatever structure is chosen, every non-primary domain should 301 to its matching path on the primary domain, with canonicals pointing to the primary domain. Don't serve the same content on two domains.
