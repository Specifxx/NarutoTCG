# Content playbook

The articles do three jobs. They get AdSense approval, they bring in search traffic, and they send readers to pages with buy links. Each article should do all three. Make fewer, better articles: a post that only repeats what the official rulebook says adds nothing, and that is what the "low value" rejections and Google's scaled-content spam policy are aimed at.

## Where content lives

- **One domain (D2):** `/blog` on the primary domain, with categories `rules`, `strategy`, `decks`, `market`, `news`. Tool subdomains link into it, and articles link out to the tools.
- **Four domains:** each site gets its own kind of writing, and nothing is duplicated across them:
  - learn: rules and strategy (`rules`, `strategy`)
  - decks: archetype guides, tier lists, tournament reports (`decks`)
  - compare: market reports and set value guides (`market`)
  - simulator: a few "how to use the simulator" and playtesting guides; mostly relies on linking to the others
- **Storage:** MDX in the repo (`content/<site>/posts/<slug>.mdx`), with frontmatter `title`, `description`, `date`, `updated`, `author`, `category`, `game`, `draft`, `heroImage`, `heroAlt`. It's built statically. Pages: author page, category pages, and an RSS feed.

## Homepage pattern (applies to every site being applied with)

1. H1 plus 2–3 paragraphs: what this is, who it's for, and what you can do here (links to the tools).
2. "Start here": 3–4 cornerstone guides with excerpts.
3. A tool strip (simulator, deckbuilder, price checker, lessons), each with one sentence of real description.
4. "Latest": 6–10 newest posts with date and excerpt.
5. If the data exists: "This week in the meta" or "Biggest price movers", as server-rendered text plus a small table, not a client-only widget.

All of it is in the server HTML, so a crawler that never runs JavaScript still sees a full page.

## Quality bar (every article must pass before `draft: false`)

- [ ] **Something only we can say.** At least one original thing: data from our tournament database or price history, a decklist we built or tested, simulator screenshots of a real board state, draw-odds math from our probability tool, or the author's own play experience. If an article has none of these, don't write it.
- [ ] **Accurate.** Rules claims are checked against the official rulebook or FAQ for *that game*, and the source is cited. Card names, numbers, and text come from our card DB. Never invent prices, pull rates, win rates, or tournament results. If the data isn't there, say so or cut the section.
- [ ] **Readable.** Answer the question in the first paragraph. Use descriptive H2s, short paragraphs, and tables wherever you're comparing things. Length should fit the topic: cornerstone guides are usually 1,500–3,000 words, focused posts 800–1,500. Don't pad.
- [ ] **Visuals.** At least one image, table, chart, or decklist embed. Every image has alt text.
- [ ] **Linked.** At least 3 internal links to relevant tools and pages, and at least 2 links from older posts back to this one (edit them).
- [ ] **Monetized with care.** Affiliate links only where a reader would actually want to buy, with the disclosure line before the first link. Use deck embeds that already include "Buy this deck".
- [ ] **Accountable.** Real author byline linking to an author page, publish date, and updated date. Time-sensitive posts (tier lists, prices) carry the date in the title or first line.
- [ ] **Reviewed by a person.** Claude writes drafts with `draft: true`. The user reads each one, fixes it, and adds their own experience (games played, events attended, cards opened) before publishing. AI-only articles shouldn't go live.

## Backlog (in priority order; game-specific facts come from our data)

Before writing anything, check which game each article is for (D1). Titles below use Mythos mechanics. Adjust them for the Bandai game once its rules are final.

**Cornerstone (write first, these anchor the homepage)**
1. How to play Naruto Mythos TCG: a complete beginner's guide (setup, the four rounds, missions, winning). Links to the learn lessons and the simulator.
2. How to build your first deck: card ratios, chakra curve, and a budget list with a "Buy this deck" button.
3. Best starter decks and how to upgrade them (sealed and accessory affiliate links).
4. Card rarities and how to tell versions apart (1st vs 2nd edition, holo variants, secret and legendary). Only use rarity data we've sourced.

**Rules deep dives (learn)**
5. Chakra explained: base chakra, chakra from characters, spending efficiently
6. Hidden characters and AMBUSH: when to play face-down
7. Missions from D-Rank to A-Rank: scoring and which to contest
8. The Edge token: why passing first matters
9. Upgrades: paying the difference, and when it's worth it
10. The 15 most common rules mistakes (with official rulings cited)
11. Glossary: every keyword with examples (doubles as the glossary page's long-form companion)

**Decks and meta (decks)**
12. Tier list for <month year>: methodology, data window, sample size, and a link to every list
13. Archetype guide ×N: game plan, key cards, mulligans, matchups, budget swaps, full list
14. Tournament report: <event>, covering top cut, archetype breakdown, and standout tech (only events we have data for)
15. Matchup guide: how the top 4 archetypes play against each other, using our matchup matrix

**Market (compare)**
16. Most valuable cards in <set>, as a dated snapshot from our price history
17. Is a booster box worth opening? Expected-value analysis (only with sourced pull rates; otherwise skip)
18. Where to buy singles in the US vs the EU, comparing marketplaces honestly (the affiliate disclosure is up front)
19. How to spot fake cards and protect your collection (sleeves, binders, storage, with accessory links)
20. Monthly price report: gainers, losers, and why (link each card's page)

**News and evergreen comparisons**
21. Naruto Mythos TCG vs Bandai's NARUTO CARD GAME: what's different (high search interest ahead of the 2027 launch)
22. <Set name> review: best cards for competitive play
23. Simulator guide: how to playtest a deck before you buy it

## Publishing rhythm

- Before applying for AdSense: cornerstones 1–4, plus about 16 more from the backlog, all reviewed by the user.
- After that: about 1–2 posts per week. A meta or price report on each set release. A tier list update each month, editing the existing post and its `updated` date rather than creating a new URL every month.
- When the Bandai game is announced in more detail (Dec 2026 onward) and when it launches (summer 2027), publish comparison and how-to-play content early. That's the biggest traffic window this platform will see.
