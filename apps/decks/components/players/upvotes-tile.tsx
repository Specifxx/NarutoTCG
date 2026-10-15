"use client";

import { StatTile } from "@/components/ui/stat-tile";
import { formatNumber } from "@/lib/format";
import { deckVotesStore } from "@/lib/storage/community";
import { useLocalStore } from "@/lib/storage/local-store";

/** Seed upvotes plus this browser's votes (+1 / -1 by deck id) across `decks`. */
export function totalUpvotes(decks: ReadonlyArray<{ id: string; votes: number }>, localVotes: Readonly<Record<string, number>>): number {
  return decks.reduce((sum, deck) => sum + deck.votes + (Object.hasOwn(localVotes, deck.id) ? (localVotes[deck.id] ?? 0) : 0), 0);
}

/**
 * The author's "Upvotes" tile. Like the deck cards below it, the total includes this browser's
 * votes (seed votes only on the server and the first render), so tile and cards agree.
 */
export function UpvotesTile({ decks }: { decks: ReadonlyArray<{ id: string; votes: number }> }) {
  const [localVotes] = useLocalStore(deckVotesStore);
  return <StatTile label="Upvotes" value={formatNumber(totalUpvotes(decks, localVotes))} detail="Across published decks" />;
}
