import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { ArchetypeBadge, ArchetypeDot, EventTierBadge } from "@/components/ui/badges";
import { formatDate, formatLocation, formatNumber } from "@/lib/format";
import { placementLabel } from "@/lib/tournament/standings";
import { archetypeName } from "./archetype-name";
import { eventHref, FOCUS_RING, playerHref } from "./styles";
import { structureLabel, type TournamentSummary } from "./summary";

/** Column template shared by the header and every row from `lg` up; below that rows are cards. */
const GRID = "lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_8.5rem_minmax(0,12rem)_9.5rem] lg:items-center lg:gap-4";

export function EventListHeader() {
  return (
    <div
      aria-hidden="true"
      className={cx("hidden bg-shadow-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ash-400", GRID)}
    >
      <span>Date</span>
      <span>Event</span>
      <span className="text-right">Players</span>
      <span>Structure</span>
      <span>Winner</span>
      <span>Top cut</span>
    </div>
  );
}

export function ImportedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-chakra-600 px-2 py-0.5 text-[11px] font-semibold text-chakra-300">
      Imported · this browser
    </span>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M5 2h10v2h3v2.5A3.5 3.5 0 0 1 14.6 10a5 5 0 0 1-3.6 3V15h3v3H6v-3h3v-2a5 5 0 0 1-3.6-3A3.5 3.5 0 0 1 2 6.5V4h3V2Zm0 4H4v.5c0 .8.4 1.4 1 1.7V6Zm10 0v2.2c.6-.3 1-.9 1-1.7V6h-1Z"
      />
    </svg>
  );
}

/** Small label shown above a value on the mobile card; screen-reader only in the desktop grid. */
function CellLabel({ children }: { children: string }) {
  return <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-ash-500 lg:sr-only">{children}</span>;
}

/** One event in the directory: a card on mobile, a dense grid row from `lg` up. The name links the whole row. */
export function EventRow({ event }: { event: TournamentSummary }) {
  const cutSize = event.topCutArchetypeIds.length;
  return (
    <li
      className={cx(
        "relative flex flex-col gap-3 rounded-lg border border-shadow-700 bg-shadow-900 p-4 transition hover:border-shadow-500",
        "lg:gap-4 lg:rounded-none lg:border-0 lg:border-t lg:border-shadow-700 lg:px-4 lg:py-3 lg:first:border-t-0 lg:hover:bg-shadow-800/60",
        GRID,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start lg:gap-1">
        <time dateTime={event.date} className="text-sm font-medium tabular-nums text-ash-200">
          {formatDate(event.date)}
        </time>
        <EventTierBadge tier={event.tier} short />
      </div>

      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-snug text-white">
          <Link href={eventHref(event.id)} className={cx("rounded-sm after:absolute after:inset-0 hover:text-chakra-400", FOCUS_RING)}>
            {event.name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash-400">
          {event.source === "import" && <ImportedBadge />}
          <span>{formatLocation(event.location)}</span>
          <span aria-hidden="true">·</span>
          <span>{event.organizer}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-3 lg:contents">
        <div className="text-sm lg:text-right">
          <CellLabel>Players</CellLabel>
          <span className="font-semibold tabular-nums text-white">{formatNumber(event.players)}</span>
        </div>
        <div className="text-sm text-ash-300">
          <CellLabel>Structure</CellLabel>
          {structureLabel(event.swissRounds, event.topCutSize)}
          <span className="block text-xs text-ash-500">{event.format}</span>
        </div>
      </div>

      <div className="min-w-0">
        <CellLabel>Winner</CellLabel>
        {event.winner ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5 text-sm">
              <TrophyIcon className="h-3.5 w-3.5 shrink-0 text-chakra-400" />
              <Link
                href={playerHref(event.winner.id)}
                className={cx("relative z-10 truncate font-medium text-ash-100", "rounded-sm hover:text-chakra-400", FOCUS_RING)}
              >
                {event.winner.name}
              </Link>
            </span>
            <ArchetypeBadge archetypeId={event.winner.archetypeId} short />
          </div>
        ) : (
          <span className="text-sm text-ash-500">No results yet</span>
        )}
      </div>

      <div className="min-w-0">
        {cutSize > 0 && (
          <>
            <CellLabel>{`Top ${cutSize}`}</CellLabel>
            <ul aria-label={`Top ${cutSize} archetypes`} className="relative z-10 flex w-fit max-w-full flex-wrap gap-1">
              {event.topCutArchetypeIds.map((archetypeId, index) => {
                const title = `${placementLabel(index + 1, event.topCutSize)}: ${archetypeName(archetypeId)}`;
                return (
                  <li key={index} title={title} className="flex p-px">
                    <ArchetypeDot archetypeId={archetypeId} />
                    <span className="sr-only">{title}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}
