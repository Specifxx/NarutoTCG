import type { Tournament } from "@naruto-tcg/types";
import { buildTournamentDecks } from "@/lib/decks/catalog";
import { parseDeckId, type DeckDetail } from "@/lib/decks/types";
import { IMPORTED_PREFIX } from "./deck-meta";

/** Finding decks from events imported in this browser. Client-safe: no seed data. */

/** True for `local-<event>--<player>` deck ids. */
export function isImportedDeckId(deckId: string): boolean {
  const parsed = parseDeckId(deckId);
  return parsed?.kind === "tournament" && parsed.tournamentId.startsWith(IMPORTED_PREFIX);
}

/**
 * The deck for `deckId` among this browser's imported events (sanitized by the imports store, the
 * same data the deck directory lists), built exactly like seed tournament decks; null when the
 * event or the player's list is missing or the event still cannot be built.
 */
export function findImportedDeck(tournaments: readonly Tournament[], deckId: string): DeckDetail | null {
  const parsed = parseDeckId(deckId);
  if (parsed?.kind !== "tournament") return null;
  const tournament = tournaments.find((t) => t.id === parsed.tournamentId);
  if (!tournament) return null;
  try {
    return buildTournamentDecks([tournament]).find((deck) => deck.id === deckId) ?? null;
  } catch {
    return null;
  }
}
