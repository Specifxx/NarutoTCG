import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArchetypeBadge, EventTierBadge, PlacementTag, TierBadge, WinRateBadge } from "@/components/ui/badges";
import type { DeckDetail } from "@/lib/decks/types";
import { formatDate, pluralize } from "@/lib/format";
import { TIER_META } from "@/lib/meta/config";
import type { TierId } from "@/lib/meta/types";
import { DECK_KIND_LABEL, DECK_KIND_NOTE, authorRole, deckKind } from "./deck-meta";
import { DeckVote } from "./deck-vote";
import { FOCUS_RING, TEXT_LINK, eventHref, playerHref } from "./styles";

/** Deck name, archetype and tier, pilot or author, event result, win rate, votes and the actions row. */
export function DeckHeader({ deck, tier, actions }: { deck: DeckDetail; tier: TierId | null; actions: ReactNode }) {
  const kind = deckKind(deck);
  const event = deck.tournament;
  // Imported pilots have no profile page; seed pilots and authors do.
  const author =
    kind === "imported" ? (
      <span className="font-medium text-ash-100">{deck.author.name}</span>
    ) : (
      <Link href={playerHref(deck.author.handle)} className={TEXT_LINK}>
        {deck.author.name}
      </Link>
    );

  return (
    <header className="flex flex-col gap-5 border-b border-shadow-700 pb-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
          <li>
            <Link href="/decks" className={cx("rounded-sm text-chakra-400 hover:text-chakra-300", FOCUS_RING)}>
              Decks
            </Link>
          </li>
          <li aria-hidden="true" className="text-shadow-500">
            /
          </li>
          <li className="text-ash-400">
            {DECK_KIND_LABEL[kind]}
          </li>
        </ol>
      </nav>

      <div className="flex items-start gap-3 sm:gap-4">
        <DeckVote deckId={deck.id} seedVotes={deck.votes} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h1 className="break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">{deck.name}</h1>
            <p className="mt-2 text-sm text-ash-400">
              {authorRole(deck)} {author} · <time dateTime={deck.createdAt}>{formatDate(deck.createdAt)}</time>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex min-w-0 items-center gap-2">
              <ArchetypeBadge archetypeId={deck.archetypeId} href />
              {tier && (
                <span className="inline-flex items-center gap-1.5" title={TIER_META[tier].blurb}>
                  <TierBadge tier={tier} size="sm" />
                  <span className="text-xs text-ash-400">{tier === "unranked" ? "Unranked" : "tier"}</span>
                </span>
              )}
            </span>
            <WinRateBadge winRate={deck.winRate} record={deck.record} label={deck.winRateSource === "event" ? "Event" : "Playtest"} />
          </div>

          {event && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
              <PlacementTag placement={event.placement} topCutSize={event.topCutSize} />
              <span className="text-ash-400">of {pluralize(event.playerCount, "player")} at</span>
              <Link href={eventHref(event.id)} className={cx(TEXT_LINK, "min-w-0 break-words")}>
                {event.name}
              </Link>
              <EventTierBadge tier={event.tier} short />
            </div>
          )}

          {kind === "community" && deck.tags.length > 0 && (
            <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
              {deck.tags.map((tag) => (
                <li key={tag} className="rounded-full border border-shadow-600 px-2 py-0.5 text-xs text-ash-300">
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-ash-500">
            {DECK_KIND_NOTE[kind]} · votes and comments you add are saved in this browser only
          </p>
        </div>
      </div>

      {actions}
    </header>
  );
}
