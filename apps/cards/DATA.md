# Cards app data contract

All card data lives in `public/data/*.json` and is validated by `lib/schema.ts`.
The validator reports two kinds of problems:

- **Errors**: data that would break or mislead pages. `next build` fails with a list of every error.
- **Warnings**: suspicious but renderable data. `next build` prints them and carries on.

`validate:data` is the stricter gate. Run it before merging scraped data:

| Check | `next build` | `validate:data` |
| --- | --- | --- |
| Any error | fails | fails |
| Any warning | prints it, succeeds | fails |
| Every set has at least one card | not checked | fails |
| Every deck has a `leaderId` and exactly 50 cards | not checked (size is a warning) | fails |

```bash
pnpm --filter @naruto-tcg/cards validate:data   # validate public/data
CARDS_JSON=/path/to/staged.json pnpm --filter @naruto-tcg/cards validate:data   # also SETS_JSON, DECKS_JSON
```

## Rules for every file

- Each file is a JSON array of objects. Anything else is an error.
- **Text** has invisible formatting characters removed and is then trimmed. These are the soft hyphen (U+00AD), zero-width and joiner characters (U+180E, U+200B–U+200D, U+2060–U+2064, U+FEFF) and bidi controls (U+200E, U+200F, U+202A–U+202E, U+2066–U+2069). Scraped DOM text often carries them, and they break search. Line breaks in `effect` are kept. A required string that is empty after cleaning is an error.
- **Optional fields** may be omitted or `null`. An empty optional string counts as absent. A value of the wrong type is an error.
- **Required integers** (`totalCards`, `quantity`) that are missing or `null` are errors.
- **Ids and collector numbers** must be URL-safe: letters, digits, `-` and `_`, starting with a letter or digit. Otherwise it is an error. This covers card, set and deck `id`, `setId`, `cardId` and printing `number`.
- **Dates** are `YYYY-MM-DD` and must be real calendar dates. `2026-02-30` is an error. Deck timestamps may add a time (see below).
- **URLs** must be `http:` or `https:`. `imageUrl` fields may also be root-relative paths such as `/images/x.png`, but not `//host/…`.
- **Unknown fields** (for example `imageURL` or `flavour`) are ignored with a warning, because they are usually typos.

## `cards.json`: array of cards

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string, required | Unique and URL-safe. Usually the debut collector number, e.g. `NR01-001`. |
| `name` | string, required | e.g. `Naruto Uzumaki` |
| `title` | string | Epithet under the name, e.g. `The Third Hokage` |
| `type` | `leader` \| `character` \| `mission` \| `jutsu`, required | |
| `element` | `fire` \| `water` \| `lightning` \| `earth` \| `wind`, required | Chakra nature |
| `cost` | integer 0–20 | Required for every type except leaders. Leaders must omit it. |
| `power` | integer 0–100000 | Required for leaders and characters, optional for the rest |
| `traits` | string[] | Character tags: `Leaf Village`, `Akatsuki`, `Team 7`, `Ninjutsu`… Duplicates are dropped with a warning. |
| `keywords` | string[] | Rules keywords: `Rush`, `Blocker`, `Counter`… Matched against the glossary in `lib/keywords.ts` ignoring case and spacing, then rewritten to the glossary spelling (`rush` becomes `Rush`). Keywords not in the glossary are kept as written. Duplicates, including case variants, are dropped with a warning. |
| `effect` | string | Rules text; `""` (or omitted) for vanilla cards. Timing tags in `[Brackets]`, trait references in `{Braces}`, card names in `[Brackets]`. |
| `flavor`, `artist` | string | Optional |
| `imageUrl` | string | Optional base artwork. Generated frame art is used when absent. |
| `printings` | Printing[], required, non-empty | List the debut printing first (see below). |
| `reveal` | Reveal | Present for cards revealed before release |

**Printing:** `{ "setId": "ST01", "number": "ST01-001", "rarity": "rare", "variant": "standard", "imageUrl"?: "…" }`

- `setId` must be the id of a set in `sets.json`.
- `number` is the collector number. It is required and URL-safe because it appears in URLs.
- `rarity`: `common`, `uncommon`, `rare`, `super-rare`, `parallel-rare`, `secret-rare`, `promo` (required).
- `variant`: `standard` (default), `parallel`, `alt-art`, `promo`.
- `setId` + `number` + `variant` must be unique across all cards.
- `setId` + `number` belongs to one card. That card's own parallels and alt-arts may share it, but a different card may not.
- **Order:** the debut printing comes first. It is a warning when a printing's set was released strictly earlier than the first printing's set. Either way, the app stable-sorts every card's printings by set release date, so `printings[0]` is always from the earliest set. Same-day sets and variants within one set keep their listed order. `printings[0]` sets the card's debut set, canonical sort order, breadcrumbs, pager and spoiler grouping.

**Reveal:** `{ "date": "2026-10-13", "source": "Outlet name", "url": "https://…" }`

- All three fields are required. `url` must be an http(s) URL.
- `date` may be at most one day after today (UTC), measured when validation runs. A later date is an error. This catches mistyped years and scheduled reveals, which would otherwise take over the Spoiler Center's "latest reveal". Add a reveal once it has happened.

## `sets.json`: array of sets

`{ "id": "NR03", "name": "Booster Set 03: …", "shortName"?: "…", "kind": "starter" | "booster" | "promo", "releaseDate": "2026-11-20", "totalCards": 60, "description"?: "…" }`

- `id` is unique and URL-safe. `name`, `kind` and `releaseDate` are required.
- `shortName` defaults to `name`.
- `releaseDate` may be in the future for announced sets.
- `totalCards` is a required integer from 1 to 10000. It counts distinct collector numbers in the finished set (parallels share their base card's number), so spoiler progress reads "24 / 60 revealed". It is a warning when the cards list more distinct numbers for the set than `totalCards`.

## `decks.json`: array of decklists

`{ "id": "slug", "name": "…", "owner"?: "…", "description"?: "…", "leaderId": "ST01-001", "archetype"?: "…", "cards": [{ "cardId": "ST01-002", "quantity": 4 }], "createdAt": "2026-03-06", "updatedAt": "2026-03-06" }`

- `id` is unique and URL-safe. `name` is required.
- `leaderId`, when present, must be a card of type `leader`. `validate:data` requires it.
- `cards` is required and must be an array. Each entry's `cardId` must be an existing, non-leader card listed only once. Its `quantity` is a required integer from 1 to 4.
- A deck whose quantities do not add up to 50 is a warning.
- `createdAt` and `updatedAt` are required. Use an ISO date (`2026-03-06`) or datetime (`2026-03-06T09:30:00Z`) whose date part is a real calendar date.

A legal deck has exactly 50 cards plus one leader, with at most 4 copies of any card.
