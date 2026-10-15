# Learn content: authoring guide

Everything the Learn app teaches is data in this folder. Lessons are plain JSON, so you can edit, review or import them without touching React code.

## File layout

```
content/
├── lessons/
│   ├── 01-deck-setup.json                  # one file per lesson (order = file prefix)
│   ├── 02-charging-chakra.json
│   ├── 03-summoning-and-hidden-cards.json
│   ├── 04-combat-and-missions.json
│   ├── 05-the-edge-token.json
│   └── index.ts                            # imports + validates every lesson (LESSONS)
├── schema.ts                               # TypeScript types + parseLesson() validator
├── tutorial-lesson.schema.json             # JSON Schema (draft 2020-12) mirror for editors/tools
├── keywords.ts                             # glossary: ids, terms, aliases used by [[markup]]
├── puzzles.ts                              # Lethal Puzzles
└── content.test.ts                         # npm test: lessons, markup and keywords
```

Each lesson file starts with `"$schema": "../tutorial-lesson.schema.json"`, which gives VS Code (and most editors) autocomplete and inline errors. `parseLesson` ignores that key.

## Lesson shape (schema v1)

| Field | Notes |
| --- | --- |
| `schemaVersion` | Always `1`. |
| `id` | kebab-case URL slug (`/learn/how-to-play/<id>`). The five lesson ids are fixed. |
| `order`, `title`, `subtitle`, `summary` | `subtitle` and `summary` accept markup. |
| `emblem`, `accent` | Emblem name (`kage`, `chakra`, `mask`…) and accent (`gold`, `energy`, `mist`, `blood`, `chakra`, `leaf`). |
| `estMinutes` | Whole minutes. |
| `steps[]` | 5–7 steps: `id`, `title`, `body` (40–90 words), optional `bullets` (≤ 4), `callout` (`tip` / `rule` / `warning`), `visual`, `source`. |
| `widget` | `{ id, title, brief }`. `id` is one of `deck-forge`, `chakra-charger`, `hidden-card-sim`, `mission-evaluator`, `edge-duel`; `brief` states the challenge goal. |
| `quiz[]` | 1–6 questions (3 is the house style): `id`, `prompt`, 2–4 `choices`, `answerIndex`, `explanation`. |
| `sources[]` | Optional lesson-level references. |

`source` is `{ "document": "NARUTO Mythos TCG Rulebook (EN)", "page": 13, "section": "Hidden Characters" }`. `page` may be a number or a string such as `"18–20"`.

## Text markup

| Markup | Renders as |
| --- | --- |
| `**1 Chakra**` | Bold text. |
| `[[AMBUSH]]` | Keyword chip with an animated tooltip. Matches a keyword's `id`, `term` or any alias, case-insensitively. |
| `[[upgrading\|upgrade]]` | Same chip with custom display text. |

Valid keywords live in `keywords.ts`. Watch out for near-twins: `[[UPGRADE]]` is the card trigger and `[[upgrading]]` is the rule, `[[hidden]]` is the status and `[[reveal]]` is the action. **EXHAUST** is a platform term, not an official keyword. Whenever you use it, say so in the text. Keep quiz `choices` plain text, because they render inside buttons and a chip there would nest one button in another.

## Step visuals

Each visual is an animated, self-contained illustration (`components/lesson/visuals/*`) that replays when the step changes and has a Replay button. Card ids must be keys of `PRACTICE_CARDS` in `lib/game/cards.ts`.

| `kind` | Fields | Shows |
| --- | --- | --- |
| `phase-track` | `active`: `start` \| `action` \| `mission` \| `end` | Start → Action → Mission → End, with the active phase glowing |
| `deck-stack` | `deckSize`, `missions`, `hand` | Deck pile with its count, Missions kept aside, opening hand fanning out |
| `chakra-formula` | `base`, `characters`, `bonus?` | "5 + N + X = total" with orbs filling a Chakra gauge |
| `card` | `cardId`, `face?` (`up` \| `hidden` \| `flip`), `tokens?` | A large card; `flip` loops the hidden → AMBUSH reveal; tokens drop in |
| `mission-ladder` | `highlight?`: `D` \| `C` \| `B` \| `A` | Ranks, entry Round, +1…+4 bonus and the D → A evaluation order |
| `power-clash` | `you`, `opp`, `edge`, `label?` | Tug-of-war over one mission; on a tie the Edge token decides |
| `edge-token` | `holder`, `caption?` | The Edge flying to its holder and its three powers |
| `upgrade-stack` | `fromCardId`, `toCardId` | The higher card sliding on top: "5 − 2 = 3 Chakra", tokens carried over |
| `turn-order` | `sequence[]` of `{ side, action }` (≤ 12) | Alternating turns; the first `pass` takes the Edge, then successive turns |

Start a `turn-order` sequence with the Edge holder. `upgrade-stack` needs the same character name and a strictly higher cost, otherwise the visual shows it as illegal.

## Validate

```bash
cd apps/learn
npm test            # parseLesson on every lesson + every [[keyword]] resolves + card ids exist
npm run typecheck   # TypeScript
npm run build       # LESSONS are validated at module load, so a bad file fails the build
```

`parseLesson` reports the file and JSON path of the first problem, for example `[content] 03-summoning-and-hidden-cards.json → $.steps[2].visual.cardId: unknown practice card "kakashi"`. The JSON Schema catches the same structural problems earlier, in the editor or in any 2020-12 validator such as Ajv. Uniqueness of ids and card existence are checked only by `parseLesson`.

## Importing from official PDFs, FAQs and manuals

Use a structured extractor (for example the Claude Chrome extension prompt in `chrome-import-prompt.md`) to turn a rulebook page, FAQ or manual into an array of `TutorialStep` objects. Then do the following:

1. **Paste into the right lesson** (or a new `0N-<id>.json` plus an entry in `lessons/index.ts`) and keep the `source` block (document, page, section, URL) on every step.
2. **Run `npm test`.** Fix any unknown keyword in `[[…]]` (map it to an existing id or alias, or add a glossary entry in `keywords.ts`) and replace any real card names in visuals with practice card ids.
3. **Review by hand before merging.** The checklist:
   - Rules match the cited page: costs, the 5 + characters + CHAKRA +X formula, D → C → B → A order, ties to the Edge holder, at least 1 Power to win, the 2-copies-per-version limit.
   - Text is **paraphrased, not copied**. Extracted rulebook prose is a reference, not lesson copy.
   - There's no Leader card in Mythos (you are the Kage), and EXHAUST is labelled as a platform term.
   - Bodies are 40–90 words, there are at most 4 bullets, and each callout says one thing.
   - Each visual illustrates the step's claim (e.g. a tie step uses a tied `power-clash`).
   - FAQ rulings that override the rulebook cite the FAQ as their `source`.
4. **Check it on a phone-width screen.** Visuals and long words must not overflow at 360px.
