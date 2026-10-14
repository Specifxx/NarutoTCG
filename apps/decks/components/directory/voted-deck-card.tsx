"use client";

import { DeckCard } from "@/components/decks/deck-card";
import type { DeckSummary } from "@/lib/decks/types";
import type { TierId } from "@/lib/meta/types";
import { useDeckVote } from "@/lib/storage/community";

/** DeckCard whose count includes this browser's vote (seed count on the server and first render). */
export function VotedDeckCard({
  deck,
  tier,
  headingLevel,
}: {
  deck: DeckSummary;
  tier?: TierId;
  headingLevel?: 2 | 3 | 4;
}) {
  const [vote] = useDeckVote(deck.id);
  return <DeckCard deck={deck} tier={tier} votes={deck.votes + vote} headingLevel={headingLevel} />;
}
