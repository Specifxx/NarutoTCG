# Shinobi Sim — Naruto TCG simulator

Rule-enforced playmat, deck builder, deck comparison and rules guide (Next.js App Router, Zustand, Immer, Framer Motion, Tailwind v4).

| Route | What it does |
| --- | --- |
| `/simulator` | Playmat vs the Rogue Ninja AI or hot-seat. Phase bar, mission lanes with Hidden slots, Chakra pool, Edge token, action log, inspector. |
| `/decks` | Split-screen deck builder: filterable card pool (type, element, cost, rarity, village), strict validator, Chakra curve, archetype classifier, import/export codes, auto-build. |
| `/compare` | Two decks side by side: curve overlay, card overlap, AI-vs-AI matchup simulation. |
| `/learn` | Rules guide generated from the engine's constants, plus a card-text lab. |

```bash
pnpm --filter @naruto-tcg/simulator dev     # http://localhost:3000
pnpm --filter @naruto-tcg/simulator test    # engine tests (rules + AI-vs-AI conservation checks)
pnpm --filter @naruto-tcg/simulator build
```

## Rules

Round structure follows the [Naruto Mythos TCG](https://www.narutotcgmythos.com/how-to-play): 4 rounds; missions D/C/B/A revealed one per round with +1/+2/+3/+4 rank bonuses; Start Phase gives 5 Chakra + 1 per character in play and draws 2; players alternate single actions; the first to pass takes the Edge token, which wins tied missions and a tied game; Hidden plays cost 1 and have 0 Power; revealing pays full cost and triggers MAIN + AMBUSH; Evolve (Upgrade) pays the cost difference and keeps Power tokens; End Phase clears unspent Chakra and all Power tokens.

Simulator-format rules (all in `lib/game-engine/format.ts`): 40-card main deck, exactly 1 Leader, exactly 3 differently named missions, at most 3 copies per card name; **Add Power Token** (1 Chakra) and **Draw Card** (2 Chakra) actions; Leader `TECHNIQUE [n]` once per round.

## Architecture

```
lib/cards/        card types, normalisation of untrusted JSON, runtime loader for /data/cards.json
lib/game-engine/  pure engine — no React
  abilities.ts    card-text compiler: "MAIN: POWERUP 2." → structured effects
  engine.ts       createGame / applyAction reducer (Immer), automatic phase transitions
  legal.ts        validateAction — the single source of truth for legality (UI, AI and reducer all use it)
  effects.ts      effect resolution;  power.ts  Power = printed + tokens + equipment + auras + round modifiers
  ai.ts           one-ply search AI that never reads hidden enemy cards;  simulate.ts  AI-vs-AI games
  store.ts        Zustand store wrapping the engine
lib/deck/         validator, analytics (curve, archetype), auto-builder & starter decks, deck codes, persisted deck store
components/       cards, deckbuilder, playmat, compare, learn, ui
```

Every game is reproducible from its seed (mulberry32 RNG stored in state).

## Card data

`public/data/cards.json` is loaded at runtime and validated by `lib/cards/normalize.ts` against the contract in `public/data/cards.schema.json`. The bundled cards are an original seed set (`set: "SIM"`). To add real or scraped cards, append entries with the same schema — keep the `SIM` leaders and missions if your source has none. Ability text written in the grammar shown on `/learn` (Card text lab) is automated; other lines are displayed and flagged as manual.
