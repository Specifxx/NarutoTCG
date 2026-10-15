# @naruto-tcg/decks — competitive meta, tournaments and decklists

Next.js App Router app (port 3001) that tracks the competitive Naruto TCG meta, ingests tournament
results from Tournament Organizers, and hosts a community deck directory.

> All seed tournaments, players, decklists and comments are fictional demo data.

## Routes

| Route | What it shows |
| --- | --- |
| `/` | Overview: meta snapshot, latest results, featured decks |
| `/meta` | Tier list (S/A/B/C), meta share charts, head-to-head matchup matrix, methodology |
| `/tournaments` | Event directory (seed + events imported in this browser) |
| `/tournaments/[id]` | Standings, top cut bracket, round-by-round pairings, event meta breakdown |
| `/tournaments/import` | TO import wizard: JSON/CSV upload → column mapping → validation → preview → save |
| `/decks` | Searchable deck directory with win-rate badges, authors and placement tags |
| `/deck/[id]` | Visual decklist, opening-hand drawer simulator, matchup guide, votes and comments |
| `/players/[handle]` | Player and author profiles with tournament history |

## Architecture

```
data/seed/tournaments/*.json   canonical tournament records (generated, committed)
lib/data/                      card pool, archetypes, community decks, guides, comments
lib/tournament/                Swiss standings + tiebreakers, Swiss pairing, top cut brackets
lib/seed/                      deterministic tournament simulator that produced the seed data
lib/meta/                      meta engine: per-event aggregates → tier list, shares, matchups
lib/ingest/                    ingestion pipeline: CSV/JSON parsing, mapping, resolution, validation
lib/probability/               hypergeometric + Monte Carlo opening-hand math
lib/decks/                     legality, deck utilities, deck catalog and search
lib/storage/                   localStorage stores (imported events, votes, comments)
components/                    UI (charts use Recharts)
```

### Data model

Every source — seed data, the import wizard, the `ingest` CLI and browser-scraped JSON — normalizes to
the canonical `Tournament` record in `@naruto-tcg/types` (`packages/types/src/competitive.ts`):
event metadata, `players[]` (archetype, final placement, optional decklist) and `matches[]` (round,
stage, players, outcome, game score, intentional-draw flag).

### Meta engine

Each tournament is reduced to a `TournamentAggregate` of additive counts (entries, top cuts, event
wins, non-mirror W/L/D, head-to-head results, placement points). Aggregates merge by summation, so
the server ships small per-event aggregates and the browser filters them and folds in locally
imported events without raw match data.

- **Win rate** excludes byes, intentional draws and mirror matches; draws count half. The tier score
  uses a Bayesian-adjusted win rate (20 pseudo-games at 50%) so small samples cannot top the list.
- **Top-cut conversion lift** is the smoothed conversion rate divided by the field baseline.
- **Tier score** = 50% adjusted win rate + 35% conversion lift + 15% meta share, each on a fixed
  0–100 scale; S ≥ 65, A ≥ 52, B ≥ 40, else C. Archetypes under 10 entries or 1% share are unranked.

### Deck rules (mock game)

One Leader outside the main deck, exactly 50 main-deck cards, at most 4 copies per card, 5-card
opening hand with one free mulligan; the player going first skips the turn-1 draw.

## Importing results (Tournament Organizers)

The wizard at `/tournaments/import` and the `ingest` CLI accept the same inputs. Downloadable examples
live in `public/templates/`:

| Input | Template | Notes |
| --- | --- | --- |
| Canonical tournament JSON | `tournament-template.json` | The `Tournament` record itself |
| Scraped JSON | `scraped-template.json` | Loose `event` / `standings` / `pairings` shape; see `lib/ingest/scraped.ts` |
| Standings CSV | `standings-template.csv` | Placement, player, archetype, record, optional decklist cell |
| Pairings CSV | `pairings-template.csv` | Round (or "Top 8", "Finals"), table, players, result or winner |
| Decklists CSV | `decklists-template.csv` | One row per card: player, quantity, card name or id |
| Event details | `event-meta-template.json` | Name, date, tier, location… (`--meta` for CSV imports) |

Headers are matched through synonyms, card names are fuzzy-matched to the card pool, archetype names
resolve through aliases ("Sage Naruto" → Uzumaki Sage Mode) or are classified from the decklist, and
standings without pairings are accepted (matchup stats then skip the event). Every import is
validated: duplicate or unknown players, double-booked rounds, bracket gaps, illegal decklists and
records that disagree with the pairings are reported as errors or warnings; placements that
contradict the recorded top cut are recomputed from the bracket, and a re-import of an event the
site already tracks is flagged (and never counted twice). Input is bounded: cells over 4 KB,
quantities over 50 and event names over 120 characters are rejected, and fuzzy matching is capped,
so a hostile file cannot freeze the page. Imported events are saved in the visitor's browser only;
`/meta?imports=1` folds them into the meta.

To collect results from a public results page with Claude in Chrome, use the prompt in
[`docs/chrome-extension-scraper-prompt.md`](docs/chrome-extension-scraper-prompt.md) and import the
JSON it produces.

## Scripts

```bash
pnpm --filter @naruto-tcg/decks dev        # http://localhost:3001
pnpm --filter @naruto-tcg/decks test       # vitest (unit + integration)
pnpm --filter @naruto-tcg/decks typecheck
pnpm --filter @naruto-tcg/decks build
pnpm --filter @naruto-tcg/decks seed       # regenerate data/seed/tournaments/*.json (deterministic)
pnpm --filter @naruto-tcg/decks ingest -- results.json                 # validate + write data/imports/
pnpm --filter @naruto-tcg/decks ingest -- --dry-run results.json       # validate only
pnpm --filter @naruto-tcg/decks ingest -- --meta event.json *.csv      # CSV set + event details
```

File paths resolve from the directory you run the command in. The links to the other platform apps in
the shared header come from `NEXT_PUBLIC_SIMULATOR_URL`, `NEXT_PUBLIC_DECKS_URL`,
`NEXT_PUBLIC_COMPARE_URL` and `NEXT_PUBLIC_LEARN_URL` (defaulting to the local dev ports).
