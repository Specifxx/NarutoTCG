# Monetization strategy

The reasoning behind the `monetize` skill, plus the decision log. Facts about third-party programs and policies were researched on **2026-10-14**. Those terms change, so re-check anything marked *(verify)* before you build on it.

## TL;DR

1. **Affiliate links will earn first.** AdSense adds to that, but you have to get approved, and approval depends on content.
2. **Money comes from pages where people decide to buy.** That means card price pages and "Buy this deck" buttons. Glossary and rules pages bring in traffic, and they pay through internal links to those buying pages.
3. **AdSense approves sites, not apps.** A site made only of tools (simulator, deckbuilder, price tables) usually gets rejected as "low value content". The site you apply with needs original writing that shows up in the server HTML and is linked from the homepage.
4. **Four domains means four AdSense reviews and four separate SEO authorities.** Once a domain is approved, its subdomains and subdirectories can show ads without another review. One brand domain is cheaper to monetize. See D2.
5. **Free hosting tiers don't allow this.** Vercel Hobby lists AdSense and affiliate-first sites as commercial use, which it forbids. GitHub Pages forbids sites "primarily directed at facilitating commercial transactions". Use Vercel Pro or Cloudflare. Most of the *data* can still live in GitHub. See `data-and-hosting.md`.

## Which game are we monetizing?

The brief's mechanics are Edge token, Hidden characters with AMBUSH, 1-Chakra face-down play, Missions, and upgrades paid by cost difference. Those match **Naruto Mythos TCG**. It is officially licensed, the Italian company Cicaboom Srl runs the official site and organized play, and Zvezdar Toys distributes it in the US *(verify the roles)*. It released in Europe on 13 Mar 2026 and reached US retail on 29 Aug 2026. Set 2 was due around late Sep 2026 and Set 3 in Q4 2026.

It is a different game from **Bandai's official NARUTO CARD GAME**. Bandai's game debuted at Gen Con 2026 and launches worldwide in **summer 2027**. Its rules differ: one Leader, a 50-card deck, five Chakra Cards, and one Summon Card.

This affects money because the two games sell through different stores:

| Merchant | How you earn | Mythos (now) | Bandai game (2027) | Best use |
| --- | --- | --- | --- | --- |
| **eBay** (EPN) | Commission on any purchase in the session (category-dependent rates) | Yes, singles and sealed are listed | Yes | Universal fallback, sealed, graded or high-end singles |
| **TCGplayer** (Impact) | ~3.5% reported by third parties *(verify)*, first-click 48h window per TCGplayer docs | **Unconfirmed**, no product line found | Very likely, since TCGplayer carries Bandai's other TCGs | US singles, whole-deck carts via Mass Entry |
| **CardNexus** (Impact, apply via affiliate@cardnexus.com) | 3.5% of purchases plus a per-signup bonus *(verify)* | Yes, ~915 Mythos cards and 22 sealed products listed | Likely | EU/Mythos singles |
| **Amazon Associates** | Category rates | Sealed sometimes | Sealed sometimes | Sleeves, binders, playmats, deck boxes ("what you need to start") |
| **Cardmarket** | No affiliate program confirmed | Unconfirmed | Likely | Check before building anything |

Takeaways:
- Put a `game` field on every card, deck, and price record now (`packages/types` doesn't have one). Supporting the second game later then costs data, not a refactor.
- The eBay link always works, so it's always present. Other merchants appear only when we have a confirmed product page or search for that game.
- Traffic will spike at each Mythos set release and very hard at the Bandai launch in 2027. Time content to those dates.

## Revenue streams, ranked

1. **Affiliate: whole-deck carts.** One click puts 40–50 cards in a TCGplayer cart. It's the highest-intent click on the platform. It goes on every deck page, tournament decklist, and simulator deck.
2. **Affiliate: single-card buy boxes** on every card and price page, plus "most valuable", "gainers", and "losers" lists.
3. **Display ads (AdSense).** Gaming pays little per thousand pageviews. It's worth having, but it won't make the platform profitable early. Once traffic grows, compare premium ad managers (each has its own traffic threshold).
4. **Later, after traffic:** a supporter tier (Ko-fi or Patreon: ad-free plus simulator perks), sponsorships from local game stores, TOs, and accessory brands, and sponsored tournament coverage. None of these are worth building before there's an audience.

| App | Main earner | Secondary | Ads? |
| --- | --- | --- | --- |
| compare | Card buy box (all merchants), sealed product links | List pages (gainers, losers, most valuable) | Yes, once content pages exist |
| decks | "Buy this deck" (Mass Entry cart) | Per-card hover buy links, archetype guides | Yes, on guides and tournament reports |
| simulator | "Buy this deck" / "Buy missing cards" in the deckbuilder | Card detail modal links | **Not on the play area** (see D6) |
| learn | Starter-product and accessory links | Internal links to decks and compare | Yes, in articles only, never inside widgets or puzzles |

## eBay without the developer API

The Developer API isn't needed to earn on EPN. It only gives you live listing prices. Without it, we link to an **eBay search results page** with EPN tracking parameters. eBay pays on qualifying purchases made after the click, not only for the exact card. The price we show comes from our other price sources. The eBay button reads "Check eBay listings" and never shows a price we can't source. Link format and query tuning are in `affiliate-links.md`.

## TCGplayer API: use it or not?

**Recommendation: use it for compare, under these conditions.** A real price on the page is what separates a useful compare page from a thin link farm. That matters for SEO, for AdSense review, and for affiliate click-through. TCGplayer stopped issuing new API keys, so the existing key is scarce and should be protected:

- Use it only if the game is actually listed on TCGplayer. For Mythos this is unconfirmed, so check first. For the Bandai game, expect yes in 2027.
- Read the current API terms for display, attribution, caching, and historical-storage rules before storing price history. Follow them exactly.
- Fetch on a **daily schedule** (GitHub Actions cron) into snapshots. Never fetch per page view. Keep the key server-side only (a GitHub Actions secret or a server env var, never `NEXT_PUBLIC_*`).
- Put it behind a `PriceSource` adapter so it can be swapped out if access ends.
- Don't scrape TCGplayer, eBay, or Cardmarket HTML to fill gaps. It breaks their terms and puts the affiliate accounts at risk.

If no allowed price source exists for a game, compare shows the card, our own data (rarity, set, decks it appears in), and buy buttons, and those pages stay `noindex` until they carry real data.

## Can most of the database live in GitHub?

Yes. Cards, rules, lessons, blog posts, decklists, and tournament results are files in the repo. Price history can be appended by a scheduled GitHub Action. Comments and upvotes can use **Giscus** (GitHub Discussions). A real database (Supabase/Postgres) is only needed for accounts or for user uploads that don't go through a PR. Details and size estimates are in `data-and-hosting.md`.

## Do we need blog posts on every site?

- **With four separate domains: yes, in effect.** AdSense reviews each domain separately, and each one must stand on its own original content. It doesn't have to be a "blog" on each, though. Each site gets its own kind of writing: learn gets lessons and strategy, decks gets archetype guides and tournament reports, compare gets market reports and set value guides. Never copy the same article across domains. Duplicate content counts against approval and SEO.
- **With one brand domain: no.** One strong content hub (`/blog`) qualifies the domain, and the tool subdomains or paths inherit the approval.
- Either way, the homepage of the site you apply with must show substantive text and links to the articles in its server-rendered HTML. The reviewers don't dig. See `adsense-readiness.md` § "Crawler's-eye view".

## Brand and IP risk

- Every site needs the line "Unofficial fan site. Not affiliated with or endorsed by Masashi Kishimoto, Shueisha, VIZ, the Naruto Mythos publishers, or Bandai Namco" in the footer and on /about.
- Don't use official logos as our branding. Use card images only as the publishers' fan-content policies allow *(verify whether a policy exists)*.
- Domains containing "naruto" carry some trademark risk once they show ads. This is common in the TCG space, but it's another reason to keep one brand domain rather than four.

## Decision log

The skill asks the user to confirm each `Proposed` row before acting on it, then records the answer here.

| ID | Decision | Recommendation | Status |
| --- | --- | --- | --- |
| D1 | Which game(s) at launch | Naruto Mythos now. Add a `game` field everywhere and be ready for Bandai's 2027 launch. | Proposed |
| D2 | Domain structure | One brand domain. Tools on subdomains (simple: separate Vercel projects) or sub-paths (best for SEO: Next.js multi-zones). Other purchased domains 301 to it. | Proposed |
| D3 | Hosting | Vercel Pro (one team covers all four projects, ~$20/mo per seat *(verify)*), or Cloudflare Workers via OpenNext to stay free | Proposed |
| D4 | TCGplayer API | Use it for daily price snapshots if the game is listed and the terms allow it, behind a `PriceSource` adapter | Proposed |
| D5 | Where the blog lives | `/blog` on the primary domain. With four domains: native content per site (see above) | Proposed |
| D6 | Ads in the simulator | No AdSense on the board or play screens. Affiliate links only. Ads on simulator marketing pages are optional. | Proposed |
| D7 | Comments and upvotes | Giscus at launch. Add a database only if accounts are needed. | Proposed |
| D8 | eBay marketplace | Default to ebay.com. Switch to ebay.co.uk/.de/.fr/.it by visitor region on the client so pages stay static. | Proposed |

## Sources (as of 2026-10-14)

- Naruto Mythos: [ICv2, US retail](https://icv2.com/articles/news/view/62803/mythos-tcg-naruto-konoha-shido-heads-u-s-retail), [The Card Vault overview](https://thecardvault.co.uk/blogs/trading-card-games/naruto-mythos-trading-card-game-everything-you-need-to-know), [official roadmap](https://www.narutotcgmythos.com/naruto-mythos-tcg-official-roadmap), [CardNexus listing](https://cardnexus.com/en/explore/naruto-mythos)
- Bandai NARUTO CARD GAME: [naruto-official.com announcement](https://naruto-official.com/en/news/01_2661), [naruto-cardgame.com](https://www.naruto-cardgame.com/)
- TCGplayer: [affiliate program](https://docs.tcgplayer.com/docs/tcgplayer-affiliate-program), [partner guidelines](https://help.tcgplayer.com/hc/en-us/articles/31411199594391-TCGplayer-Partner-Guidelines), [API getting started (no new keys)](https://docs.tcgplayer.com/docs/getting-started)
- eBay: [EPN link format](https://developer.ebay.com/api-docs/buy/static/ref-epn-link.html)
- CardNexus: [affiliate docs](https://docs.cardnexus.com/affiliates), [partner program](https://cardnexus.com/en/partner-program)
- Hosting: [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- AdSense: [eligibility](https://support.google.com/adsense/answer/9724), [game-site ad placement](https://support.google.com/adsense/answer/1346295), [adding sites](https://support.google.com/adsense/answer/12169212), [subdomains covered by the parent site](https://support.google.com/adsense/answer/12170421)
