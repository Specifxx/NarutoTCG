import { getSeedComments } from "@/lib/data/comments";
import { getMatchupGuide } from "@/lib/data/guides";
import { getSeedSnapshot, getSeedTier } from "@/lib/data/meta";
import { toSummary } from "@/lib/decks/catalog";
import type { DeckDetail } from "@/lib/decks/types";
import type { TierId } from "@/lib/meta/types";
import { buildMatchupEntries } from "./deck-context";
import type { DeckContext } from "./types";

/**
 * SERVER ONLY: reads the seed meta. Import this from the route, never from a "use client" module
 * or anything a client module imports, or the seed JSON ends up in the browser bundle.
 */

/** Tier, matchup guide entries and seed comments for a seed deck, as plain JSON. */
export function buildSeedDeckContext(deck: DeckDetail): DeckContext {
  const snapshot = getSeedSnapshot();
  return {
    tier: getSeedTier(deck.archetypeId),
    matchups: buildMatchupEntries({
      archetypeId: deck.archetypeId,
      meta: snapshot.meta,
      matrix: snapshot.matrix,
      guideFor: getMatchupGuide,
      extraOpponentIds: Object.keys(deck.matchupNotes ?? {}),
    }),
    minGames: snapshot.matrix.minGames,
    eventCount: snapshot.meta.tournamentCount,
    comments: getSeedComments(toSummary(deck)),
  };
}

/** Seed tier of every archetype in the snapshot, so imported decks can still show their tier. */
export function seedTierMap(): Record<string, TierId> {
  return Object.fromEntries(getSeedSnapshot().stats.map((stats) => [stats.archetypeId, stats.tier]));
}
