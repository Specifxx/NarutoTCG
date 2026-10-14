# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

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

## Monetization

Affiliate links, AdSense readiness, and the content plan are packaged as a Claude Code skill in
[`.claude/skills/monetize`](.claude/skills/monetize/SKILL.md). Run `/monetize` once the apps have real
features. The reasoning and open decisions are in
[`references/strategy.md`](.claude/skills/monetize/references/strategy.md).
