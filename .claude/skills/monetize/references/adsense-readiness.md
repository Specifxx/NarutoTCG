# AdSense readiness

AdSense approval is a manual-plus-crawler review of a **site** (a domain). Its subdomains and subdirectories inherit the approval. Each separate domain is reviewed on its own. The usual rejection is **"low value content"**: too little original writing, pages that look auto-generated, or content the crawler couldn't see. Google publishes no minimum word or page count. The numbers below are working targets, not Google rules.

## Crawler's-eye view (the "lazy crawler" problem)

Reviewers and crawlers judge the HTML they get on first request. They click very little and run very little JavaScript. So:

- **Every content page is rendered on the server** (SSG or ISR in the App Router). Don't fetch content on the client with `useEffect`, and don't put it behind tabs, accordions that are closed in the HTML, modals, or login.
- **The homepage is a content page, not a splash screen.** In the server HTML it needs: a few paragraphs on what the site is and who it's for, a "Featured guides" section with 6–10 articles each showing a real 2–3 sentence excerpt, a "Latest" list, and clear links to every tool. Working target: **600+ words of visible text** in the raw HTML.
- **Every article is reachable from the homepage in at most two clicks**, and listed in `sitemap.xml`.
- No "Coming soon", lorem ipsum, empty states, or broken links anywhere when you apply. Unfinished sections are hidden or `noindex`.
- The App Router puts an RSC payload inside `<script>` tags. That doesn't count as content. The audit script strips scripts before counting words, the way a crawler does.

Check it with `node .claude/skills/monetize/scripts/audit-site.mjs <url> --crawl 200`.

## Content bar before applying

Working targets for the site you apply with:
- **~20 substantial original articles** (see `content-playbook.md`), each with something a search result can't give (our data, our decklists, our charts, real play experience). Plus the tool pages.
- **Thin programmatic pages are `noindex` until enriched.** A card page with only a name, image, and buy buttons is thin. A card page with rules text, rulings, the decks it appears in, a price history, and related cards is not. Hundreds of thin, near-identical pages can sink approval on their own.
- No duplicate articles across our domains.

## Required pages (every site, linked from the footer on every page)

| Path | Must include |
| --- | --- |
| `/about` | Who runs the site (a real name or handle, with a short bio), why it exists, the unofficial fan-site disclaimer |
| `/contact` | A working email address or form. A contact page that doesn't work counts against you. |
| `/privacy` | Use of cookies; Google and third-party vendors using cookies to serve ads based on prior visits; a link to Google's Ads Settings for opting out; affiliate tracking cookies (eBay, Impact); analytics; EEA/UK/Swiss consent; US state privacy rights; contact |
| `/terms` | Site terms, "prices are informational, no guarantee", user content rules if comments exist |
| `/affiliate-disclosure` | Every program we belong to (eBay Partner Network, TCGplayer, CardNexus, Amazon Associates), in plain language |

Also needed: a consistent header nav on every page, a 404 page that links back to content, `lang="en"`, and unique `<title>` and meta description per page.

## Technical checklist

- [ ] `app/sitemap.ts` lists every indexable URL with `lastModified`, and `app/robots.ts` allows crawling and points to the sitemap. Allow `Mediapartners-Google` explicitly if anything else is disallowed.
- [ ] Canonical URL on every page. If old domains 301 to the brand domain (D2), canonicals point at the brand domain.
- [ ] JSON-LD: `Article` (author, datePublished, dateModified) on posts, `BreadcrumbList` on deep pages. **No** `Review`/`AggregateRating` we didn't collect, and no `Product` `offers` with prices we can't back up.
- [ ] `public/ads.txt` on every domain with ads: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. Generate it from `NEXT_PUBLIC_ADSENSE_CLIENT` at build time or check it in.
- [ ] Site verification through server-rendered metadata (not a client-injected script): in the root layout, `export const metadata = { other: { "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT } }`, rendered only when set.
- [ ] Google Search Console verified for each domain, the sitemap submitted, and **pages actually indexed before applying**. "Discovered – not indexed" on most pages is a sign the content isn't ready yet.
- [ ] Fast and stable: no layout shift from ad slots (reserve their height), images sized, Core Web Vitals passing on article templates.
- [ ] Consent: use AdSense **Privacy & messaging** (it's a Google-certified CMP) for EEA/UK/Switzerland, and turn on the US state regulations message. Don't build a home-made cookie banner for ads.

## Ad placement rules (after approval)

Build one `AdSlot` component in `packages/ui`:
- It renders nothing unless `NEXT_PUBLIC_ADSENSE_CLIENT` is set **and** the route is on the allowlist.
- It reserves a fixed `min-height` so the layout doesn't shift.
- It's labeled "Advertisement".
- It loads `adsbygoogle.js` once per page with `next/script` `afterInteractive`.
- Prefer **manual units on templates** over Auto ads. If Auto ads is ever turned on, exclude the simulator and every interactive page in the AdSense UI.

| Page type | Placements |
| --- | --- |
| Articles and guides | In-article after the 2nd section, then about every 4–5 sections. One sidebar unit on desktop. |
| compare card page | One unit **below** the price chart and history. Never between the price table and the buy buttons. |
| compare / decks list pages | In-feed unit every ~10 rows |
| decks deck page | Below the decklist and guide text, away from "Buy this deck" |
| learn lessons | Between lesson sections only. **Never inside or next to** interactive widgets or puzzles. |
| simulator | **None on the board or play screens** (D6). Google advises keeping ads at least 150px from game areas or off game pages entirely, because heavy mouse use causes accidental clicks, and those get accounts suspended. |

Always:
- Keep ads away from affiliate buttons and navigation, and never make them look like content or buttons.
- Content always outweighs ads on a page.
- Never click our own ads or ask anyone to.

## Application order

1. Apply with the **content hub**: the primary domain (D2) or, with four domains, whichever of learn or decks has the most articles.
2. After approval, add the other domains in AdSense one at a time, each only once it passes the audit on its own.
3. If rejected, read the reason, fix it, re-run the audit, and wait until the fix is indexed before re-applying. Don't re-apply the same day.
