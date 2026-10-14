"use client";

import { ChevronDown, Navigation } from "lucide-react";
import Link from "next/link";
import { memo, useState, type CSSProperties, type FocusEvent } from "react";
import { focusRing } from "@/components/directory/shared";
import { eventTypeMeta } from "@/lib/event-meta";
import type { EventSummary } from "@/lib/event-summary";
import { formatDistance, type DistanceUnit } from "@/lib/geo";
import { cx, pluralize } from "@/lib/format";
import { button } from "@/lib/styles";
import { venueGroupId, type VenueGroup } from "./venue-groups";

const INITIAL_EVENTS = 3;
const VENUE_PAGE = 20;

/**
 * Sidebar results grouped by venue — the accessible equivalent of the map.
 * Hovering or focusing a group highlights its pin; activating the venue
 * heading flies the map to it.
 */
export function VenueList({
  venues,
  eventCount,
  unit,
  hoveredKey,
  selectedKey,
  onHover,
  onSelect,
}: {
  venues: VenueGroup[];
  eventCount: number;
  unit: DistanceUnit;
  hoveredKey: string | null;
  selectedKey: string | null;
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
}) {
  const [limit, setLimit] = useState(VENUE_PAGE);
  // Always render a venue picked on the map so its group can be scrolled to.
  const selectedIndex = selectedKey ? venues.findIndex((v) => v.key === selectedKey) : -1;
  const visible = venues.slice(0, Math.max(limit, selectedIndex + 1));
  const remaining = venues.length - visible.length;

  return (
    <section aria-labelledby="map-results-heading" className="mt-6 border-t border-shadow-700/70 lg:mt-5">
      <div className="z-10 -mx-4 flex items-baseline gap-3 bg-shadow-950/90 px-4 py-3 backdrop-blur lg:sticky lg:top-0 lg:-mx-5 lg:px-5">
        <h2 id="map-results-heading" className="text-sm font-semibold text-white">
          Venues
        </h2>
        <p className="text-xs text-ash-400 tabular-nums">
          {pluralize(venues.length, "venue")} · {pluralize(eventCount, "event")}
        </p>
      </div>

      {venues.length === 0 ? (
        <p className="rounded-xl border border-dashed border-shadow-500/70 bg-shadow-900/50 px-4 py-6 text-center text-sm text-ash-400">
          No events match these filters. Try a wider radius, other dates or fewer filters.
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-2.5 pb-2">
          {visible.map((venue) => (
            <VenueGroupItem
              key={venue.key}
              venue={venue}
              unit={unit}
              hovered={venue.key === hoveredKey}
              selected={venue.key === selectedKey}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))}
        </ol>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setLimit(visible.length + VENUE_PAGE)}
          className={cx(button.secondary, "mb-2 mt-1 w-full")}
        >
          Show {Math.min(remaining, VENUE_PAGE)} more {Math.min(remaining, VENUE_PAGE) === 1 ? "venue" : "venues"}
          <span className="text-xs font-normal text-ash-400">({remaining} left)</span>
        </button>
      )}
    </section>
  );
}

const VenueGroupItem = memo(function VenueGroupItem({
  venue,
  unit,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  venue: VenueGroup;
  unit: DistanceUnit;
  hovered: boolean;
  selected: boolean;
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = eventTypeMeta(venue.primaryType);
  const count = venue.events.length;
  const hidden = count - INITIAL_EVENTS;
  const shown = expanded || hidden <= 0 ? venue.events : venue.events.slice(0, INITIAL_EVENTS);
  const listId = `${venueGroupId(venue.key)}-events`;

  function onBlur(event: FocusEvent<HTMLLIElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) onHover(null);
  }

  return (
    <li
      id={venueGroupId(venue.key)}
      onMouseEnter={() => onHover(venue.key)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(venue.key)}
      onBlur={onBlur}
      className={cx(
        "scroll-mt-14 rounded-xl border transition-[border-color,background-color,box-shadow] duration-150",
        selected
          ? "border-chakra-500/70 bg-shadow-900 shadow-[0_0_0_1px_rgb(242_92_0/0.35),0_12px_30px_-14px_rgb(242_92_0/0.45)]"
          : hovered
            ? "border-shadow-500 bg-shadow-900"
            : "border-shadow-700/80 bg-shadow-900/60",
      )}
    >
      <h3>
        <button
          type="button"
          onClick={() => onSelect(venue.key)}
          aria-current={selected || undefined}
          className={cx("group flex w-full items-start gap-3 rounded-xl px-3 pb-2 pt-3 text-left", focusRing)}
        >
          <PinGlyph color={meta.hex} active={hovered || selected} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white transition-colors group-hover:text-chakra-400">
              {venue.name}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ash-400">
              <span>
                {venue.city} <span aria-hidden="true">{venue.flag}</span>
              </span>
              {venue.distance !== null && (
                <span className="inline-flex items-center gap-1 text-ash-200">
                  <Navigation className="h-3 w-3 text-chakra-400" aria-hidden="true" />
                  {formatDistance(venue.distance, unit)}
                  <span className="sr-only"> away</span>
                </span>
              )}
            </span>
          </span>
          <span className="mt-0.5 shrink-0 rounded-full border border-shadow-700 bg-shadow-950/70 px-2 py-0.5 text-[11px] font-semibold text-ash-200 tabular-nums">
            {count}
            <span className="sr-only"> {count === 1 ? "event" : "events"}, show on map</span>
          </span>
        </button>
      </h3>

      <ul id={listId} className="grid grid-cols-1 gap-px px-1.5 pb-1.5">
        {shown.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
          className={cx(
            "mx-1.5 mb-1.5 flex w-[calc(100%-0.75rem)] items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-ash-400 transition-colors hover:bg-shadow-800 hover:text-chakra-400",
            focusRing,
          )}
        >
          {expanded ? "Show fewer" : `Show ${hidden} more`}
          <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      )}
    </li>
  );
});

function EventRow({ event }: { event: EventSummary }) {
  const meta = eventTypeMeta(event.type);
  const cancelled = event.status === "cancelled";

  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        className={cx(
          "group/row flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-shadow-800",
          focusRing,
          cancelled && "opacity-70",
        )}
      >
        <span className={cx("mt-[7px] h-2 w-2 shrink-0 rounded-full", meta.classes.dot)} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-ash-400 tabular-nums">
            {event.display.date} · {event.display.startTime}
            {event.status !== "scheduled" && (
              <span className={cx("ml-1.5 font-semibold", cancelled ? "text-rose-300" : "text-amber-300")}>
                {cancelled ? "Cancelled" : "Postponed"}
              </span>
            )}
          </span>
          <span
            className={cx(
              "line-clamp-2 text-[13px] font-medium leading-snug text-ash-200 transition-colors group-hover/row:text-chakra-400",
              cancelled && "line-through decoration-rose-400/70",
            )}
          >
            {event.title}
          </span>
          <span className="sr-only">, {meta.label}</span>
        </span>
        <span className="mt-px shrink-0 text-xs font-semibold text-ash-200">
          <span className="sr-only">Entry fee: </span>
          {event.display.fee}
        </span>
      </Link>
    </li>
  );
}

/** Small static version of the map pin, so list and map read as one system. */
function PinGlyph({ color, active }: { color: string; active: boolean }) {
  return (
    <svg
      viewBox="0 0 28 36"
      aria-hidden="true"
      className={cx("mt-0.5 h-6 w-[1.15rem] shrink-0 overflow-visible transition-[filter]", active && "drop-shadow-[0_0_6px_var(--pin)]")}
      style={{ "--pin": color } as CSSProperties}
    >
      <path
        d="M14 35.2C14 35.2 2.2 22.6 2.2 13.6a11.8 11.8 0 0 1 23.6 0C25.8 22.6 14 35.2 14 35.2Z"
        fill={color}
        stroke="#07070b"
        strokeWidth="1.4"
      />
      <circle cx="14" cy="13.6" r="5.4" fill="#07070b" />
      <circle cx="14" cy="13.6" r="2.1" fill={color} />
    </svg>
  );
}
