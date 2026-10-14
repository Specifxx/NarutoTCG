import type { Tournament } from "@naruto-tcg/types";
import { importedDeckSummaries } from "@/components/directory/decks";
import { sanitizeImportedEvents } from "@/components/directory/imported-events";
import { buildPlayerProfiles, type PlayerProfile } from "@/lib/players/profiles";

/**
 * The profile of a player who appears only in events imported in this browser, built exactly
 * like seed profiles (no authors) from the sanitized events they played. Null when no imported
 * event lists the handle or the events cannot be read. Client-safe: no seed data.
 */
export function importedPlayerProfile(tournaments: readonly Tournament[], handle: string): PlayerProfile | null {
  if (!handle) return null;
  const events = sanitizeImportedEvents(tournaments).filter((tournament) => tournament.players.some((player) => player.id === handle));
  if (events.length === 0) return null;
  try {
    const decks = importedDeckSummaries(events).filter((deck) => deck.author.handle === handle);
    return buildPlayerProfiles(events, decks, []).get(handle) ?? null;
  } catch {
    return null;
  }
}
