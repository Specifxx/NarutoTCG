import Link from "next/link";
import { DeckCard } from "@/components/decks/deck-card";
import { EmptyState } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import type { DeckSummary } from "@/lib/decks/types";
import type { TierId } from "@/lib/meta/types";
import { ArrowRightIcon } from "./icons";
import { MORE_LINK, MORE_LINK_SM } from "./styles";

function DeckGroup({
  id,
  label,
  more,
  decks,
  tiers,
  empty,
}: {
  id: string;
  label: string;
  more: { href: string; label: string };
  decks: DeckSummary[];
  tiers: Record<string, TierId>;
  empty: string;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p id={id} className="text-sm font-semibold text-ash-100">
          {label}
        </p>
        <Link href={more.href} className={MORE_LINK_SM}>
          {more.label}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      {decks.length > 0 ? (
        <ul aria-labelledby={id} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <li key={deck.id}>
              <DeckCard deck={deck} tier={tiers[deck.archetypeId]} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={empty} />
      )}
    </div>
  );
}

/** Newest event-winning lists and the most upvoted community builds. */
export function FeaturedDecks({
  winners,
  community,
  tiers,
}: {
  winners: DeckSummary[];
  community: DeckSummary[];
  /** Seed tier per archetype id, shown on each card. */
  tiers: Record<string, TierId>;
}) {
  return (
    <Section
      id="featured-decks"
      title="Featured decks"
      description="Winning lists from the latest events and the community's most upvoted builds."
      actions={
        <Link href="/decks" className={MORE_LINK}>
          Browse all decks
          <ArrowRightIcon />
        </Link>
      }
    >
      <div className="flex flex-col gap-8">
        <DeckGroup
          id="featured-winners"
          label="Latest event winners"
          more={{ href: "/decks?placement=winner", label: "All winning lists" }}
          decks={winners}
          tiers={tiers}
          empty="No winning lists published yet"
        />
        <DeckGroup
          id="featured-community"
          label="Top-voted community builds"
          more={{ href: "/decks?source=community&sort=votes", label: "More community builds" }}
          decks={community}
          tiers={tiers}
          empty="No community builds yet"
        />
      </div>
    </Section>
  );
}
