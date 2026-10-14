# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

| App | Port | Purpose |
| --- | --- | --- |
| `apps/simulator` | 3000 | Play-test the game |
| `apps/decks` | 3001 | Build and share decks |
| `apps/compare` | 3002 | Compare card prices |
| `apps/learn` | 3003 | Learn how to play |
| `apps/cards` | 3004 | Card database, spoilers and set checklists |
| `apps/events` | 3005 | Events (planned; linked from the shared header) |

| Package | Purpose |
| --- | --- |
| `@naruto-tcg/ui` | Shared Tailwind components, dark ninja theme, `SiteHeader` platform nav |
| `@naruto-tcg/types` | Shared types: `NarutoCard`, `CardSet`, `Deck`, `PriceRecord` |

```bash
pnpm install
pnpm dev        # run all apps
pnpm build
pnpm typecheck
```

Cross-app links in the shared header default to the local ports above. In deployed
environments set `NEXT_PUBLIC_{LEARN,EVENTS,CARDS,DECKS,SIMULATOR,COMPARE}_URL`.
