---
name: monetize
description: Launch-readiness and monetization pass for the Naruto TCG sites. Covers affiliate buy links (eBay Partner Network, TCGplayer, CardNexus, Amazon), Google AdSense approval, legal and trust pages, crawlability, and the blog/content plan. Use once the apps have real features, or whenever the user asks about affiliate links, ads, AdSense, monetization, blog posts, SEO, or whether the sites are ready to launch.
---

# Monetize the Naruto TCG sites

This skill turns working tools into sites that can earn. It puts affiliate buy links wherever someone decides to buy, adds enough original content to pass AdSense review, and sets up the legal and technical pieces both programs need.

**Read `references/strategy.md` before doing anything.** It explains the reasoning and holds the decision log. The other references cover the detail for each phase:

| File | Use in |
| --- | --- |
| `references/strategy.md` | Phase 0. Merchants per game, revenue ranking, decision log |
| `references/affiliate-links.md` | Phase 1. Env vars, link formats, package layout, placement map, disclosure |
| `references/adsense-readiness.md` | Phases 2, 3, 5. Required pages, crawler's-eye view, technical checklist, ad placement |
| `references/content-playbook.md` | Phase 4. Where content lives, homepage pattern, quality bar, article backlog |
| `references/data-and-hosting.md` | Phase 0 and Phase 1 (price data). What lives in GitHub, hosting options |
| `scripts/audit-site.mjs` | Phase 6. Raw-HTML audit of a running site |

## Ground rules

- **Never invent data.** Prices, pull rates, win rates, tournament results, and card text all come from our data or a cited source. If it's missing, leave the section out.
- **Don't scrape store HTML** (TCGplayer, eBay, Cardmarket). Prices come from a source we're allowed to use, or we don't show prices.
- **IDs come from env vars**, and every variable is documented in `.env.example`. API keys are server-side only, never `NEXT_PUBLIC_*`. If a merchant's ID is unset, its button doesn't render. Never ship a placeholder.
- **Every affiliate link** goes through `packages/affiliate`, carries `rel="sponsored noopener"`, and has a disclosure nearby.
- **No ads where people play.** Nothing on the simulator board, interactive widgets, or puzzles.
- **Quality over volume.** Don't mass-produce articles or thin programmatic pages. Thin pages get `noindex` until they're enriched.
- **Articles you write are drafts** (`draft: true`) until the user has reviewed them and added their own experience.
- **Facts in the references were checked on 2026-10-14.** Re-check anything marked *(verify)*, and any program term, link format, or policy, before relying on it.

## Phase 0: Preflight

1. Survey the repo: the apps and their routes, where card, deck, and price data lives, which game(s) the card data covers, how each route renders (static/server vs client-only), and the current hosting and domain setup.
2. Open the **Decision log** in `references/strategy.md`. For every row still `Proposed`, ask the user with AskUserQuestion, recommended option first, up to 4 questions per call. Record each answer in the table as `Confirmed YYYY-MM-DD: <choice>`. **Don't start Phase 1 until D1–D4 are confirmed.**
3. Get the identifiers, or confirm they're already in the env:
   - EPN campaign ID
   - one existing TCGplayer affiliate link (to derive the Impact base)
   - AdSense publisher ID (`ca-pub-…`), if they have one
   - CardNexus or Amazon IDs, if they've joined

   For programs they haven't joined yet, add them to the hand-off list (Phase 6). Don't block on them.
4. Make sure `packages/types` has a `game` field on cards, decks, and price records, plus optional merchant references (`tcgplayerProductId`, `tcgplayerUrl`, `cardnexusUrl`, `ebayQueryOverride`). Add them if they're missing.

## Phase 1: Affiliate link layer

Follow `references/affiliate-links.md`.

1. Create `packages/affiliate`: pure URL builders per merchant, a placement-to-subId helper, and unit tests that pin the exact URLs. Add `AffiliateLink` and `BuyBox` (with the disclosure line) to `packages/ui`.
2. Wire every row of the placement map that exists in the codebase. Skip rows for features that don't exist yet, and say so in the report.
3. Price data (D4): if confirmed, add the `PriceSource` adapter and the daily snapshot workflow described in `references/data-and-hosting.md`. Use the TCGplayer key only from secrets.
4. Spot-check the eBay query recipe on about 10 real cards and adjust it.

## Phase 2: Trust and compliance pages

Add `/about`, `/contact`, `/privacy`, `/terms`, and `/affiliate-disclosure` to every domain that will run ads or affiliate links. Put footer links to them on every page, along with the "unofficial fan site" disclaimer. The required contents are in `references/adsense-readiness.md` § Required pages. Ask the user for the real name or handle, bio, and contact address. Don't make them up.

## Phase 3: Crawlability and SEO plumbing

Follow `references/adsense-readiness.md` § Crawler's-eye view and § Technical checklist.

- Make every content route server-rendered.
- Add metadata, canonicals, `sitemap.ts`, `robots.ts`, and JSON-LD.
- `noindex` thin pages and remove them from the sitemap.
- Redirect non-primary domains per D2.

## Phase 4: Content

Follow `references/content-playbook.md`.

1. Build the blog infrastructure: MDX, categories, author page, RSS, draft handling.
2. Build the homepage pattern on every site that will apply for AdSense.
3. Draft articles from the backlog in order, cornerstones first. Each one must pass the quality bar, and each one draws on our own data. Mark them `draft: true`.
4. Give the user a review list: each draft's path, a one-line summary, and the specific spots where their own experience is needed.

## Phase 5: AdSense plumbing

Do this even before approval, so applying is a single step.

1. Add the server-rendered `google-adsense-account` meta tag.
2. Generate `ads.txt` from `NEXT_PUBLIC_ADSENSE_CLIENT`.
3. Build an `AdSlot` with a route allowlist and reserved heights, following the placement table. It renders nothing until the env var is set.
4. Add a note on enabling Privacy & messaging (CMP) to the hand-off list.

## Phase 6: Verify and report

1. Run `pnpm typecheck`, `pnpm build`, and the affiliate package tests.
2. For each app, run its production build and audit it:

   ```
   pnpm --filter @naruto-tcg/<app> build
   pnpm --filter @naruto-tcg/<app> start
   node .claude/skills/monetize/scripts/audit-site.mjs http://localhost:<port> --crawl 200
   ```

   Fix every FAIL. For every WARN that stays, either fix it or write down why it's acceptable.
3. Open 3 or more real affiliate links per merchant and check that each lands on the right product or search with its tracking parameters intact.
4. Report back:
   - what was built
   - audit results per site
   - decisions recorded
   - placement-map rows that were skipped
   - the hand-off list of things only the user can do: join programs (EPN, TCGplayer/Impact, CardNexus, Amazon); move hosting off Vercel Hobby (D3) before ads or affiliate links go live; verify Search Console and submit sitemaps; review drafts; enable the AdSense CMP; apply to AdSense in the order in `adsense-readiness.md`.
