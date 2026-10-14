import { AUTHORS } from "@/lib/data/authors";
import { getSeedTournaments } from "@/lib/data/tournaments";
import { buildDeckCatalog, toSummary } from "@/lib/decks/catalog";
import type { DeckDetail, DeckSummary } from "@/lib/decks/types";
import { buildPlayerProfiles, type PlayerProfile } from "@/lib/players/profiles";

/**
 * Server-side access to the seed deck catalog and player profiles, built once per process.
 * Events imported in the browser are layered on by client components, not here.
 */

function memo<T>(build: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= build());
}

const catalog = memo(() => {
  const decks = buildDeckCatalog(getSeedTournaments());
  return { decks, byId: new Map(decks.map((deck) => [deck.id, deck])), summaries: decks.map(toSummary) };
});

const profiles = memo(() => buildPlayerProfiles(getSeedTournaments(), catalog().summaries, AUTHORS));

/** Every seed deck with its list, newest first. */
export function getDeckCatalog(): readonly DeckDetail[] {
  return catalog().decks;
}

/** Directory rows for every seed deck, newest first. */
export function getDeckSummaries(): readonly DeckSummary[] {
  return catalog().summaries;
}

export function getDeck(id: string): DeckDetail | undefined {
  return catalog().byId.get(id);
}

/** Directory rows for one archetype, newest first. */
export function getDecksForArchetype(archetypeId: string): DeckSummary[] {
  return catalog().summaries.filter((deck) => deck.archetypeId === archetypeId);
}

export function getPlayerProfile(handle: string): PlayerProfile | undefined {
  return profiles().get(handle);
}

/** Every player and author handle, sorted; for static params. */
export function getAllPlayerHandles(): string[] {
  return [...profiles().keys()];
}
