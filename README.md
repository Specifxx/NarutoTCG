# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

Release phases and target dates for each app are in [SCHEDULE.md](SCHEDULE.md).

| App | Port | Purpose |
| --- | --- | --- |
| `apps/simulator` | 3000 | Play-test the game |
| `apps/decks` | 3001 | Build and share decks |
| `apps/compare` | 3002 | Compare card prices |
| `apps/learn` | 3003 | Learn how to play |

| Package | Purpose |
| --- | --- |
| `@naruto-tcg/ui` | Shared Tailwind components, dark ninja theme |
| `@naruto-tcg/types` | Shared types: `NarutoCard`, `Deck`, `PriceRecord` |

```bash
pnpm install
pnpm dev        # run all apps
pnpm build
pnpm typecheck
```
