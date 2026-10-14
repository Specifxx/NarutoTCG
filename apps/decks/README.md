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

## Scripts

```bash
pnpm --filter @naruto-tcg/decks dev        # http://localhost:3001
pnpm --filter @naruto-tcg/decks test       # vitest
pnpm --filter @naruto-tcg/decks typecheck
pnpm --filter @naruto-tcg/decks seed       # regenerate data/seed/tournaments/*.json
pnpm --filter @naruto-tcg/decks ingest -- <file...>   # validate + normalize TO exports
```
