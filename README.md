# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

| App | Port | Purpose |
| --- | --- | --- |
| `apps/simulator` | 3000 | Rule-enforced playmat, deck builder, compare & rules guide ([details](apps/simulator/README.md)) |
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
