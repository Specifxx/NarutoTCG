import { Clock, MapPin, Navigation, Ticket } from "lucide-react";
import Link from "next/link";
import { eventTypeMeta } from "@/lib/event-meta";
import type { EventSummary } from "@/lib/event-summary";
import { cx } from "@/lib/format";
import { CapacityMeter } from "./capacity-meter";
import { EventTypeBadge, FormatBadge, StatusBadge } from "./event-badges";

/**
 * Event row used by the directory, store pages and related-event lists.
 * Server-safe (no hooks); the whole card is clickable via a stretched link.
 */
export function EventCard({
  event,
  distanceLabel,
  past = false,
  highlighted = false,
  showVenue = true,
  className,
}: {
  event: EventSummary;
  /** Pre-formatted distance, e.g. "12 mi". */
  distanceLabel?: string | null;
  past?: boolean;
  highlighted?: boolean;
  showVenue?: boolean;
  className?: string;
}) {
  const meta = eventTypeMeta(event.type);
  const cancelled = event.status === "cancelled";

  return (
    <article
      className={cx(
        "group relative flex gap-4 rounded-xl border bg-shadow-900/80 p-4 transition-colors",
        highlighted ? cx("border-transparent ring-2", meta.classes.ring) : "border-shadow-700 hover:border-shadow-500",
        (past || cancelled) && "opacity-70",
        className,
      )}
    >
      <div
        className={cx(
          "flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-lg border py-2 text-center",
          meta.classes.border,
          meta.classes.bg,
        )}
        aria-hidden="true"
      >
        <span className={cx("text-[11px] font-semibold uppercase tracking-wider", meta.classes.text)}>
          {event.display.month}
        </span>
        <span className="text-2xl font-bold leading-none text-white tabular-nums">{event.display.day}</span>
        <span className="mt-0.5 text-[11px] uppercase text-ash-400">{event.display.weekday}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <EventTypeBadge type={event.type} size="sm" />
          <FormatBadge format={event.format} size="sm" />
          <StatusBadge status={event.status} size="sm" />
          {past && !cancelled && (
            <span className="rounded-full border border-shadow-500 px-2 py-0.5 text-[11px] text-ash-400">Ended</span>
          )}
        </div>

        <h3 className="mt-2 text-base font-semibold leading-snug text-white">
          <Link
            href={`/events/${event.id}`}
            className={cx(
              "after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-focus-within:text-chakra-400 hover:text-chakra-400",
              cancelled && "line-through decoration-rose-400/70",
            )}
          >
            {event.title}
          </Link>
        </h3>

        <dl className="mt-2 grid gap-1 text-sm text-ash-400">
          <div className="flex items-start gap-1.5">
            <dt className="sr-only">When</dt>
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dd>
              <span className="sr-only">{event.display.dateSpan}, </span>
              {event.display.timeRange}
            </dd>
          </div>
          {showVenue && (
            <div className="flex items-start gap-1.5">
              <dt className="sr-only">Where</dt>
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dd className="min-w-0">
                <span className="text-ash-200">{event.venue.name}</span>
                <span className="text-ash-400">
                  {" "}
                  · {event.venue.city} <span aria-hidden="true">{event.display.flag}</span>
                </span>
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ash-200">
            <Ticket className="h-3.5 w-3.5 text-ash-400" aria-hidden="true" />
            <span className="sr-only">Entry fee: </span>
            {event.display.fee}
          </span>
          {distanceLabel && (
            <span className="inline-flex items-center gap-1.5 text-sm text-ash-400">
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              {distanceLabel} away
            </span>
          )}
          <CapacityMeter
            registered={event.registeredCount}
            capacity={event.capacity}
            size="sm"
            className="w-full sm:ml-auto sm:w-56"
          />
        </div>
      </div>
    </article>
  );
}
