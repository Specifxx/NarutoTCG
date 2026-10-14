import Link from "next/link";
import { getCard } from "@/lib/data/cards";
import type { DeckSummary } from "@/lib/decks/types";
import { formatDate } from "@/lib/format";
import type { TierId } from "@/lib/meta/types";
import { ArchetypeBadge, EventTierBadge, PlacementTag, TierBadge, WinRateBadge } from "@/components/ui/badges";

function UpvoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M10 4 16 12H4L10 4Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Directory card for a deck. Pure and server-safe; pass `votes` to show a count that already
 * includes this browser's vote.
 */
export function DeckCard({ deck, tier, votes }: { deck: DeckSummary; tier?: TierId; votes?: number }) {
  const voteCount = votes ?? deck.votes;
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-lg border border-shadow-700 bg-shadow-900 p-4 transition hover:border-shadow-500">
      <div className="flex items-center justify-between gap-2">
        <ArchetypeBadge archetypeId={deck.archetypeId} short className="text-xs" />
        {tier && <TierBadge tier={tier} size="sm" />}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-white">
          <Link href={`/deck/${encodeURIComponent(deck.id)}`} className="after:absolute after:inset-0 hover:text-chakra-400">
            {deck.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-ash-400">
          by{" "}
          <Link
            href={`/players/${encodeURIComponent(deck.author.handle)}`}
            className="relative z-10 font-medium text-ash-200 hover:text-chakra-400"
          >
            {deck.author.name}
          </Link>{" "}
          · {formatDate(deck.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {deck.tournament ? (
          <>
            <PlacementTag placement={deck.tournament.placement} topCutSize={deck.tournament.topCutSize} />
            <EventTierBadge tier={deck.tournament.tier} short />
          </>
        ) : (
          <span className="rounded-md border border-shadow-600 px-2 py-0.5 text-xs font-semibold text-ash-300">Community</span>
        )}
        <WinRateBadge
          winRate={deck.winRate}
          record={deck.record}
          label={deck.winRateSource === "event" ? "Event" : "Playtest"}
        />
      </div>
      {deck.tournament && <p className="-mt-1 truncate text-xs text-ash-400">{deck.tournament.name}</p>}
      <ul className="flex flex-wrap gap-1" aria-label="Key cards">
        {deck.keyCardIds.map((id) => (
          <li key={id} className="max-w-full truncate rounded bg-shadow-800 px-1.5 py-0.5 text-[11px] text-ash-300">
            {getCard(id)?.name ?? id}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-ash-400">
        <span className="flex flex-wrap gap-1">
          {deck.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-shadow-600 px-2 py-0.5">
              {tag}
            </span>
          ))}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-semibold text-ash-200" title={`${voteCount} upvotes`}>
          <UpvoteIcon className="h-3.5 w-3.5 text-chakra-400" />
          <span className="tabular-nums">{voteCount}</span>
          <span className="sr-only">upvotes</span>
        </span>
      </div>
    </article>
  );
}
