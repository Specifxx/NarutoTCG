"use client";

import { cx } from "@naruto-tcg/ui";
import { formatNumber } from "@/lib/format";
import { useDeckVote } from "@/lib/storage/community";
import { DownIcon, UpIcon } from "./icons";
import { FOCUS_RING } from "./styles";

/** Up/down vote on the deck. The total is the seed count plus this browser's vote. */
export function DeckVote({ deckId, seedVotes }: { deckId: string; seedVotes: number }) {
  const [vote, toggle] = useDeckVote(deckId);
  const total = seedVotes + vote;
  const button = (pressed: boolean) =>
    cx(
      "grid h-8 w-8 place-items-center rounded-md transition",
      FOCUS_RING,
      pressed ? "bg-chakra-500 text-shadow-950" : "text-ash-400 hover:bg-shadow-700 hover:text-white",
    );
  return (
    <div
      role="group"
      aria-label="Deck votes (saved in this browser)"
      title="Votes are saved in this browser only"
      className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg border border-shadow-600 bg-shadow-900 p-1"
    >
      <button type="button" aria-pressed={vote === 1} aria-label="Upvote" onClick={() => toggle(1)} className={button(vote === 1)}>
        <UpIcon />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums text-white" aria-live="polite" aria-atomic="true">
        {formatNumber(total)}
        <span className="sr-only"> votes</span>
      </span>
      <button type="button" aria-pressed={vote === -1} aria-label="Downvote" onClick={() => toggle(-1)} className={button(vote === -1)}>
        <DownIcon />
      </button>
    </div>
  );
}
