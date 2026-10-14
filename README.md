# Naruto TCG Platform

Turborepo monorepo (pnpm) with Next.js App Router, TypeScript and Tailwind CSS.

| App | Port | Purpose |
| --- | --- | --- |
| `apps/simulator` | 3000 | Play-test the game |
| `apps/decks` | 3001 | Build and share decks |
| `apps/compare` | 3002 | Compare card prices |
| `apps/learn` | 3003 | Learn how to play (served under `/learn`) |

| Package | Purpose |
| --- | --- |
| `@naruto-tcg/ui` | Shared Tailwind components, dark ninja theme, `SiteHeader` navigation |
| `@naruto-tcg/types` | Shared types: `NarutoCard`, `Deck`, `PriceRecord` |

```bash
pnpm install
pnpm dev        # run all apps
pnpm build
pnpm typecheck
```

## Shared navigation

Every app renders `SiteHeader` from `@naruto-tcg/ui`, linking Simulator, Decks, Compare and Learn.
Links default to the local dev ports; override them at build time for deployments:

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_SIMULATOR_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_DECKS_URL` | `http://localhost:3001` |
| `NEXT_PUBLIC_COMPARE_URL` | `http://localhost:3002` |
| `NEXT_PUBLIC_LEARN_URL` | `http://localhost:3003/learn` |

## Learn portal (`apps/learn`)

Gamified onboarding for the NARUTO Mythos TCG rules, built with Framer Motion.
The app uses `basePath: "/learn"`, so it can be mounted as a zone of a larger site.

| Route | What it is |
| --- | --- |
| `/learn` | The Dojo: rank, XP and progress hub |
| `/learn/how-to-play` | Five animated lessons, each with a Learn → Train → Test flow and a mini-widget |
| `/learn/puzzles` | Lethal Puzzles: find the one winning sequence in a final Round |
| `/learn/keywords` | Searchable keyword glossary with animated tooltips |

```bash
pnpm --filter @naruto-tcg/learn dev             # http://localhost:3003/learn
pnpm --filter @naruto-tcg/learn test            # engine + content tests
pnpm --filter @naruto-tcg/learn verify:puzzles  # prove each puzzle has exactly one winning line
```

Lessons are JSON files in `apps/learn/content/lessons/`, validated against
`apps/learn/content/schema.ts` at build time. See `apps/learn/content/README.md`.
