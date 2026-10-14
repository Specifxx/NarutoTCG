import type { DeckSummary } from "@/lib/decks/types";

/** Labels for the deck header and page title. Pure. */

/** Imported events (and so their decks) carry this tournament id prefix. */
export const IMPORTED_PREFIX = "local-";

export type DeckKind = "tournament" | "community" | "imported";

export function deckKind(deck: Pick<DeckSummary, "source" | "tournament">): DeckKind {
  if (deck.source === "community") return "community";
  return deck.tournament?.id.startsWith(IMPORTED_PREFIX) ? "imported" : "tournament";
}

export const DECK_KIND_LABEL: Record<DeckKind, string> = {
  tournament: "Tournament list",
  community: "Community build",
  imported: "Imported list",
};

/** Where the data comes from, so demo content is never mistaken for real results. */
export const DECK_KIND_NOTE: Record<DeckKind, string> = {
  tournament: "Fictional demo event",
  community: "Fictional demo build",
  imported: "Imported in this browser",
};

/** "Uchiha Avenger by Saga Lindgren": the page title (the layout appends the site name). */
export function deckPageTitle(deck: Pick<DeckSummary, "name" | "author">): string {
  return `${deck.name} by ${deck.author.name}`;
}

/** Tournament lists credit the pilot; community lists the author. */
export function authorRole(deck: Pick<DeckSummary, "source">): string {
  return deck.source === "tournament" ? "Piloted by" : "By";
}
