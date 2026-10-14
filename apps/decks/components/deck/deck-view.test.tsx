import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getDeckCatalog } from "@/lib/decks/repository";
import { DeckView } from "./deck-view";
import { ImportedDeckLoader } from "./imported-deck-loader";
import { buildSeedDeckContext } from "./server-context";
import { EMPTY_DECK_CONTEXT } from "./types";

const decks = getDeckCatalog();
const community = decks.find((deck) => deck.source === "community" && deck.description?.length)!;
const winner = decks.find((deck) => deck.tournament?.placement === 1)!;

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

describe("DeckView server render", () => {
  it("renders a tournament deck with header, decklist, stats, matchups and comments", () => {
    const context = buildSeedDeckContext(winner);
    const html = renderToString(<DeckView deck={winner} context={context} />);
    expect(html).toContain(`<h1`);
    expect(html).toContain(winner.name);
    expect(html).toContain(`/tournaments/${encodeURIComponent(winner.tournament!.id)}`);
    expect(html).toContain(`/players/${encodeURIComponent(winner.author.handle)}`);
    expect(html).toContain('aria-haspopup="dialog"');
    // The trigger only references the drawer once it is open (the drawer is not in the server HTML).
    const trigger = html.match(/<button[^>]*aria-haspopup="dialog"[^>]*>/)![0];
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).not.toContain("aria-controls");
    // Win-rate chips are visual; each summary carries the full numbers for screen readers.
    expect(count(html, /<span aria-hidden="true" class="inline-flex min-w-14/g)).toBe(context.matchups.length);
    for (const id of ["decklist", "stats", "matchups", "comments"]) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('id="write-up"');
    // The three most-played opponents start open.
    expect(count(html, /<details[^>]* open=""/g)).toBe(Math.min(3, context.matchups.length));
    expect(count(html, /<details/g)).toBe(context.matchups.length);
    // Seed comments render; the drawer does not mount until opened.
    for (const comment of context.comments) expect(html).toContain(comment.author);
    expect(html).not.toContain('role="dialog"');
  });

  it("renders a community deck's write-up and the author's matchup notes", () => {
    const html = renderToString(<DeckView deck={community} context={buildSeedDeckContext(community)} />);
    expect(html).toContain('id="write-up"');
    expect(html).toContain("Community build");
    const [opponent, note] = Object.entries(community.matchupNotes ?? {})[0]!;
    expect(opponent).toBeTruthy();
    expect(html).toContain(note.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;"));
  });

  it("shows the empty matchup state without context", () => {
    const html = renderToString(<DeckView deck={winner} context={EMPTY_DECK_CONTEXT} />);
    expect(html).toContain("No matchup data for this deck");
    expect(html).toContain("No comments yet");
  });

  it("renders the imported-deck loader as a loading state on the server", () => {
    const html = renderToString(<ImportedDeckLoader deckId="local-x--y" tournamentId="local-x" tiers={{}} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading the imported deck");
  });
});
