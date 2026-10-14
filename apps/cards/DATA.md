# Cards app data contract

All card data lives in `public/data/*.json` and is validated by `lib/schema.ts`
at build time. Invalid data fails `next build` with a list of every problem.

```bash
pnpm --filter @naruto-tcg/cards validate:data   # validate public/data
CARDS_JSON=/path/to/staged.json pnpm --filter @naruto-tcg/cards validate:data
```

## `cards.json` — array of cards

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string, required | Unique, URL-safe (`[A-Za-z0-9_-]`). Usually the debut collector number, e.g. `NR01-001`. |
| `name` | string, required | e.g. `Naruto Uzumaki` |
| `title` | string | Epithet under the name, e.g. `The Third Hokage` |
| `type` | `leader` \| `character` \| `mission` \| `jutsu` | |
| `element` | `fire` \| `water` \| `lightning` \| `earth` \| `wind` | Chakra nature |
| `cost` | integer 0–20 | Required for everything except leaders; leaders must omit it |
| `power` | integer | Required for leaders and characters |
| `traits` | string[] | Character tags: `Leaf Village`, `Akatsuki`, `Team 7`, `Ninjutsu`… |
| `keywords` | string[] | Rules keywords: `Rush`, `Blocker`, `Counter`… (see `lib/keywords.ts`) |
| `effect` | string | Rules text; `""` for vanilla cards. Timing tags in `[Brackets]`, trait references in `{Braces}`, card names in `[Brackets]`. |
| `flavor`, `artist` | string | Optional |
| `imageUrl` | string | Optional base artwork (https URL or `/`-relative path). Generated frame art is used when absent. |
| `printings` | Printing[], non-empty | First entry is the debut printing |
| `reveal` | Reveal | Present for cards revealed before release |

**Printing:** `{ "setId": "ST01", "number": "ST01-001", "rarity": "rare", "variant": "standard", "imageUrl"?: "…" }`

- `rarity`: `common`, `uncommon`, `rare`, `super-rare`, `parallel-rare`, `secret-rare`, `promo`
- `variant`: `standard` (default), `parallel`, `alt-art`, `promo`
- `setId` + `number` + `variant` must be unique across all cards.

**Reveal:** `{ "date": "2026-10-13", "source": "Outlet name", "url": "https://…" }`

## `sets.json` — array of sets

`{ "id": "NR03", "name": "Booster Set 03: …", "shortName": "…", "kind": "starter" | "booster" | "promo", "releaseDate": "2026-11-20", "totalCards": 60, "description"?: "…" }`

`totalCards` counts distinct collector numbers in the finished set (parallels share
their base card's number), so spoiler progress reads "24 / 60 revealed".

## `decks.json` — array of decklists

`{ "id": "slug", "name": "…", "owner"?: "…", "description"?: "…", "leaderId": "ST01-001", "archetype"?: "…", "cards": [{ "cardId": "ST01-002", "quantity": 4 }], "createdAt": "2026-03-06", "updatedAt": "2026-03-06" }`

Decks are exactly 50 cards plus one leader, with at most 4 copies of any card.
