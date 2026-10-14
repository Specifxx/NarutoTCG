# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

| App | Port | Purpose |
| --- | --- | --- |
| `apps/simulator` | 3000 | Play-test the game |
| `apps/decks` | 3001 | Build and share decks |
| `apps/compare` | 3002 | Compare card prices |
| `apps/learn` | 3003 | Learn how to play |
| `apps/events` | 3004 | Event calendar & map, store locator, submissions, countdowns |

| Package | Purpose |
| --- | --- |
| `@naruto-tcg/ui` | Shared Tailwind components, dark ninja theme, platform `SiteHeader` |
| `@naruto-tcg/types` | Shared types: `NarutoCard`, `Deck`, `PriceRecord`, `TcgEvent`, `Store` |

```bash
pnpm install
pnpm dev        # run all apps
pnpm build
pnpm typecheck
```

## Zones and navigation

Each app is a Next.js zone that owns top-level paths (`/learn`, `/events`, `/decks`, ...).
In production they are served from one origin, so `SiteHeader` links are plain paths.
In local dev each zone runs on its own port; `apps/events/.env.development` maps the
sibling zones (`NEXT_PUBLIC_ZONE_URL_<ZONE>`) so header links reach them.

## Events data

`apps/events/data/*.json` holds the sample stores, events, gazetteer places and
countdown milestones in the import format described in `apps/events/lib/data/schema.ts`.
Times are venue-local (`"2026-10-24T11:00"` + IANA zone) and weekly events are a single
record with a `recurrence` rule. Validate seed or imported files with:

```bash
pnpm --filter @naruto-tcg/events validate:data
pnpm --filter @naruto-tcg/events validate:data -- --events ./extracted-events.json --stores ./extracted-stores.json
```
