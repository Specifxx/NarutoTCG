# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

| App | Port | Purpose |
| --- | --- | --- |
| `apps/simulator` | 3000 | Play-test the game |
| `apps/decks` | 3001 | Competitive meta, tournament results and decklists ([README](apps/decks/README.md)) |
| `apps/compare` | 3002 | Compare card prices |
| `apps/learn` | 3003 | Learn how to play |

| Package | Purpose |
| --- | --- |
| `@naruto-tcg/ui` | Shared Tailwind components, dark ninja theme, platform `SiteHeader` |
| `@naruto-tcg/types` | Shared types: `NarutoCard`, `Deck`, `PriceRecord`, `Tournament` |

```bash
pnpm install
pnpm dev        # run all apps
pnpm build
pnpm typecheck
pnpm test
```
