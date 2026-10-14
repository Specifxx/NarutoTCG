import type { DeckSummary } from "@/lib/decks/types";
import { EVENT_TIER_ORDER } from "@/lib/format";

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export interface FeaturedDecks<T extends DeckSummary> {
  winners: T[];
  community: T[];
}

/**
 * Decks for the overview: the winning lists of the `winners` most recent events (one per
 * event; same-day events by prestige, then id) and the `community` most upvoted community
 * builds (ties go to the newest, then the id).
 */
export function pickFeaturedDecks<T extends DeckSummary>(
  decks: readonly T[],
  { winners = 3, community = 3 }: { winners?: number; community?: number } = {},
): FeaturedDecks<T> {
  const prestige = (deck: T) => EVENT_TIER_ORDER.indexOf(deck.tournament!.tier);
  const seenEvents = new Set<string>();
  const winningLists = decks
    .filter((deck) => deck.source === "tournament" && deck.tournament?.placement === 1)
    .sort(
      (a, b) =>
        compareStrings(b.tournament!.date, a.tournament!.date) ||
        prestige(a) - prestige(b) ||
        compareStrings(a.id, b.id),
    )
    .filter((deck) => {
      const eventId = deck.tournament!.id;
      if (seenEvents.has(eventId)) return false;
      seenEvents.add(eventId);
      return true;
    });

  const communityBuilds = decks
    .filter((deck) => deck.source === "community")
    .sort((a, b) => b.votes - a.votes || compareStrings(b.createdAt, a.createdAt) || compareStrings(a.id, b.id));

  return {
    winners: winningLists.slice(0, Math.max(0, winners)),
    community: communityBuilds.slice(0, Math.max(0, community)),
  };
}
