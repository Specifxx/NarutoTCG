# Claude in Chrome — tournament scraper prompt

Paste the prompt below into Claude in Chrome while a tournament results page (standings, pairings or
decklists) is open. It produces one JSON document in the **scraped format** that the import wizard
(`/tournaments/import`, choose "JSON") and the CLI accept:

```bash
pnpm --filter @naruto-tcg/decks ingest -- --dry-run results.json   # validate only
pnpm --filter @naruto-tcg/decks ingest -- results.json             # write data/imports/<id>.json
```

The schema it targets is `ScrapedTournamentSchema` in `lib/ingest/scraped.ts`; a filled-in example
lives at `public/templates/scraped-template.json`. Only scrape pages you are allowed to use, and keep
to what the page publishes (names, countries, decklists, results).

---

```text
You are extracting Naruto TCG tournament results from the web page(s) open in this browser into ONE JSON document for the "apps/decks" ingestion pipeline. Accuracy beats completeness: copy what the pages show, never invent or "fix" data.

1. EXPLORE FIRST. Read the current page, then find and visit every related view of the SAME event: final standings, each Swiss round's pairings/results, the top cut bracket (Top 8/4, semifinals, finals), and every published decklist (usually the top cut; follow each "decklist"/"view list" link). Expand "show more", pagination and collapsed sections. Stay on the event's own site; do not log in, submit forms or post anything.

2. OUTPUT exactly one fenced ```json block with this shape (omit a field or use null when the page does not show it; numbers may be numbers or strings):
{
  "event": {
    "name": "Full event name as shown",
    "date": "YYYY-MM-DD (final day; convert from the page's format)",
    "tier": "Store Championship | Regional Championship | National Championship | Online Open",
    "format": "e.g. Standard (NT01–NT04)",
    "location": "Venue, City, Region, Country  — or \"Online\"",
    "organizer": "Organizer or store name",
    "swissRounds": 7,
    "topCutSize": 8,
    "bestOf": 3,
    "sourceUrl": "URL of the main results page",
    "notes": "Anything important the page states (e.g. 'Round 3 results missing')"
  },
  "standings": [
    {
      "placement": 1,
      "player": "Name exactly as displayed",
      "playerId": "the site's player id/handle if shown, else null",
      "country": "ISO-2 code (US, CA, GB, AU...) if shown",
      "archetype": "Deck/archetype name as displayed (e.g. 'Six Paths of Pain', 'Sage Naruto')",
      "record": "W-L-D, e.g. 6-1-1",
      "points": 19,
      "dropped": false,
      "decklist": {
        "leader": "Leader card name as displayed (include the subtitle, e.g. 'Pain — Deva Path')",
        "cards": [ { "quantity": 4, "name": "Card name as displayed", "id": "Set code like NT02-009 if shown" } ]
      }
    }
  ],
  "pairings": [
    {
      "round": 1,
      "stage": "swiss",
      "table": 1,
      "player1": "Name exactly as in standings",
      "player2": "Name exactly as in standings, or null for a bye",
      "result": "2-1",
      "winner": null
    }
  ]
}

3. FIELD RULES
- Player names: use one identical spelling for a person everywhere (standings, pairings, decklists). If two different people share a name, append the playerId in parentheses in all three places.
- standings: one row per registered player, in final placement order (top cut first). If the page only lists the top N, include just those rows and say so in event.notes.
- decklist: the main deck only (no sideboard); "leader" holds the single Leader card. If the list is only available as plain text, put that text in "decklist" as a string instead of the object.
- pairings: one row per table per round, for EVERY round you can find, Swiss then top cut.
  - "round": the Swiss round number; for top cut use either the continuing number (8, 9, 10) or the page's label ("Top 8", "Quarterfinals", "Semifinals", "Finals") and set "stage": "top-cut".
  - "result" is ALWAYS from player1's point of view: game score "2-0", "2-1", "1-2", "0-2"; "1-1" or "draw" for a draw; "ID" for an intentional draw; "bye" for a bye (with "player2": null). If the page shows only the winner's name, set "result": null and "winner": "<that name>".
  - Never guess a result. If a match result is not shown, leave that pairing out and mention it in event.notes.
- Do not add keys that are not in the shape above. Do not include anything personal beyond what the page itself publishes.

4. SELF-CHECK before answering, and fix anything that fails (or explain it in event.notes):
- Every player1/player2 name appears in standings (when standings exist).
- In each Swiss round every non-dropped player appears exactly once (byes included).
- Top cut has topCutSize − 1 matches, and the final's winner is placement 1.
- Each published decklist has exactly 1 leader and its card quantities add up to 50.
- Records in standings agree with the pairings you collected.

5. After the JSON block, add a short summary: number of players, rounds and matches captured, decklists captured, and anything missing or uncertain.
```
