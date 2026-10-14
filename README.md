# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

| App | Port | Purpose |
| --- | --- | --- |
| `apps/simulator` | 3000 | Play-test the game |
| `apps/decks` | 3001 | Build and share decks |
| `apps/compare` | 3002 | Compare card prices and track the market ([docs](apps/compare/README.md)) |
| `apps/learn` | 3003 | Learn how to play |

| Package | Purpose |
| --- | --- |
| `@naruto-tcg/ui` | Shared Tailwind components, dark ninja theme, cross-app `SiteHeader` |
| `@naruto-tcg/types` | Shared types: `NarutoCard`, `Deck`, `PriceRecord`, rarities, finishes, vendors |

```bash
pnpm install
pnpm dev        # run all apps
pnpm build
pnpm typecheck
```

## Cross-app navigation

Every app renders the shared `SiteHeader` (Decks, Simulator, Compare, Learn). Links resolve to `NEXT_PUBLIC_DECKS_URL`, `NEXT_PUBLIC_SIMULATOR_URL`, `NEXT_PUBLIC_COMPARE_URL` and `NEXT_PUBLIC_LEARN_URL` when set. Without them, links point to `http://localhost:<port>` in development and to `/<app>` in production, for Next.js multi-zone hosting.
