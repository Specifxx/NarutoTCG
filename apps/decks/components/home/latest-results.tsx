import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { ArchetypeBadge, ArchetypeDot, EmptyState, EventTierBadge } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import { getArchetype } from "@/lib/data/archetypes";
import { formatDate, pluralize } from "@/lib/format";
import { placementLabel } from "@/lib/tournament/standings";
import type { LatestResult } from "./events";
import { ArrowRightIcon, TrophyIcon } from "./icons";
import { FOCUS_RING, MINI_LABEL, MORE_LINK, PANEL, TEXT_LINK } from "./styles";

const archetypeName = (id: string) => getArchetype(id)?.name ?? id;

function EventCard({ event }: { event: LatestResult }) {
  const cut = event.topCut.length;
  return (
    <li className={cx(PANEL, "flex flex-col gap-3 p-4")}>
      <div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash-400">
          <EventTierBadge tier={event.tier} short />
          <time dateTime={event.date} className="font-medium text-ash-200 tabular-nums">
            {formatDate(event.date)}
          </time>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{pluralize(event.players, "player")}</span>
        </p>
        <h3 className="mt-2 text-base leading-snug font-semibold text-white">
          <Link href={`/tournaments/${encodeURIComponent(event.id)}`} className={TEXT_LINK}>
            {event.name}
          </Link>
        </h3>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className={MINI_LABEL}>Winner</p>
          {event.winner ? (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                <TrophyIcon className="h-3.5 w-3.5 text-chakra-400" />
                <Link
                  href={`/players/${encodeURIComponent(event.winner.id)}`}
                  className={cx("truncate font-semibold text-ash-100", TEXT_LINK)}
                >
                  {event.winner.name}
                </Link>
              </span>
              <ArchetypeBadge archetypeId={event.winner.archetypeId} short size="sm" />
              {event.winner.deckId && (
                <Link
                  href={`/deck/${encodeURIComponent(event.winner.deckId)}`}
                  className={cx("rounded-sm text-xs font-semibold text-chakra-400 hover:text-chakra-300", FOCUS_RING)}
                >
                  Winning list<span className="sr-only">: {event.winner.name}, {event.name}</span>
                </Link>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-ash-500">No results yet</p>
          )}
        </div>

        {cut > 0 && (
          <div className="min-w-0">
            <p className={MINI_LABEL}>{`Top ${cut}`}</p>
            <ul aria-label={`Top ${cut} archetypes, champion first`} className="mt-1.5 flex max-w-full flex-wrap gap-1">
              {event.topCut.map((player) => {
                const title = `${placementLabel(player.placement, event.topCutSize)}: ${player.name}, ${archetypeName(player.archetypeId)}`;
                return (
                  <li key={player.placement} title={title} className="flex p-0.5">
                    <ArchetypeDot archetypeId={player.archetypeId} className="h-3 w-3" />
                    <span className="sr-only">{title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

/** The newest events with winner, winning archetype and top cut archetypes. */
export function LatestResults({ events }: { events: LatestResult[] }) {
  return (
    <Section
      id="latest-results"
      title="Latest results"
      description="The newest events in the demo dataset."
      actions={
        <Link href="/tournaments" className={MORE_LINK}>
          All tournaments
          <ArrowRightIcon />
        </Link>
      }
    >
      {events.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ol>
      ) : (
        <EmptyState title="No events yet">
          <Link href="/tournaments/import" className={TEXT_LINK}>
            Import the first results
          </Link>
        </EmptyState>
      )}
    </Section>
  );
}
