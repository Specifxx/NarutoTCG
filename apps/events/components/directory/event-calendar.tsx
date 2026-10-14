"use client";

import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { EventCard } from "@/components/event-card";
import { EVENT_TYPES, eventTypeMeta } from "@/lib/event-meta";
import { isPast, type EventSummary } from "@/lib/event-summary";
import type { EventFilters, FilteredEvent } from "@/lib/filters";
import { cx, pluralize } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { addDaysToKey } from "@/lib/time";
import { button } from "@/lib/styles";
import { useNow } from "@/lib/use-now";
import {
  WEEK_COLUMNS,
  addMonths,
  daysInMonth,
  eachDay,
  firstDayOfMonth,
  localTodayKey,
  longDayLabel,
  monthGrid,
  monthKeyOf,
  monthLabel,
  weekdayOf,
} from "./date-keys";
import type { SetFilters } from "./shared";

const MAX_PILLS = 3;

/** Same day-of-month `delta` months away, clamped to the target month's length. */
function shiftMonth(day: string, delta: number): string {
  const month = addMonths(monthKeyOf(day), delta);
  const dom = Math.min(Number(day.slice(8, 10)), daysInMonth(month));
  return `${month}-${String(dom).padStart(2, "0")}`;
}

/** Month shown when the URL doesn't pin one: the first upcoming match, else the first match, else "now" (UTC). */
function defaultMonth(results: FilteredEvent[], now: Date): string {
  let firstUpcoming: string | null = null;
  let first: string | null = null;
  for (const { event } of results) {
    const day = event.display.localDate;
    if (!first || day < first) first = day;
    if (!isPast(event, now) && (!firstUpcoming || day < firstUpcoming)) firstUpcoming = day;
  }
  const day = firstUpcoming ?? first;
  return day ? monthKeyOf(day) : now.toISOString().slice(0, 7);
}

/**
 * Month grid (Monday-first) of the filtered events, using each event's
 * venue-local dates. Multi-day events appear on every day they cover.
 *
 * Keyboard: the grid has a single tab stop; arrows move by day/week, Home/End to
 * the week's edges, PageUp/PageDown by month (Shift for a year). Selection
 * follows focus and lists that day's events below the grid.
 */
export function EventCalendar({
  results,
  filters,
  setFilters,
  now,
}: {
  results: FilteredEvent[];
  filters: EventFilters;
  setFilters: SetFilters;
  now: Date;
}) {
  const baseId = useId();
  const monthHeadingId = `${baseId}-month`;
  const dayHeadingId = `${baseId}-day`;
  const tableRef = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // Viewer-local "today" is only known after mount; until then nothing is highlighted.
  const clock = useNow(60_000);
  const today = clock ? localTodayKey(clock) : null;

  const { byDay, distances, months } = useMemo(() => {
    const chronological = [...results].sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
    const map = new Map<string, EventSummary[]>();
    const dist = new Map<string, number | null>();
    const monthSet = new Set<string>();
    for (const { event, distance } of chronological) {
      dist.set(event.id, distance);
      for (const day of eachDay(event.display.localDate, event.display.localEndDate)) {
        const list = map.get(day);
        if (list) list.push(event);
        else map.set(day, [event]);
        monthSet.add(monthKeyOf(day));
      }
    }
    return { byDay: map, distances: dist, months: [...monthSet].sort() };
  }, [results]);

  const monthKey = filters.month ?? defaultMonth(results, now);
  const weeks = useMemo(() => monthGrid(monthKey), [monthKey]);

  const firstBusyDay = useMemo(() => {
    for (const week of weeks) for (const day of week) if (monthKeyOf(day) === monthKey && byDay.has(day)) return day;
    return null;
  }, [weeks, monthKey, byDay]);

  const selected = picked && monthKeyOf(picked) === monthKey ? picked : (firstBusyDay ?? firstDayOfMonth(monthKey));
  const selectedEvents = byDay.get(selected) ?? [];
  const monthHasEvents = firstBusyDay !== null;
  const nextBusyMonth = months.find((m) => m > monthKey) ?? null;
  const prevBusyMonth = [...months].reverse().find((m) => m < monthKey) ?? null;

  // Move DOM focus once the grid for the target day's month has rendered.
  useEffect(() => {
    const day = pendingFocus.current;
    if (!day || monthKeyOf(day) !== monthKey) return;
    pendingFocus.current = null;
    tableRef.current?.querySelector<HTMLButtonElement>(`button[data-day="${day}"]`)?.focus();
  });

  function goToMonth(month: string, select?: string) {
    setPicked(select ?? null);
    if (month !== monthKey) setFilters({ month });
  }

  function focusDay(day: string) {
    setPicked(day);
    pendingFocus.current = day;
    const month = monthKeyOf(day);
    if (month !== monthKey) setFilters({ month });
  }

  /** Earliest day with events in `month` (one exists for every month in `months`). */
  function firstBusyDayIn(month: string): string {
    let first: string | null = null;
    for (const day of byDay.keys()) if (monthKeyOf(day) === month && (!first || day < first)) first = day;
    return first ?? firstDayOfMonth(month);
  }

  function goToToday() {
    const key = localTodayKey(new Date());
    goToMonth(monthKeyOf(key), key);
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const day = (event.target as HTMLElement).dataset.day;
    if (!day) return;
    const column = (weekdayOf(day) + 6) % 7;
    let next: string;
    switch (event.key) {
      case "ArrowLeft":
        next = addDaysToKey(day, -1);
        break;
      case "ArrowRight":
        next = addDaysToKey(day, 1);
        break;
      case "ArrowUp":
        next = addDaysToKey(day, -7);
        break;
      case "ArrowDown":
        next = addDaysToKey(day, 7);
        break;
      case "Home":
        next = addDaysToKey(day, -column);
        break;
      case "End":
        next = addDaysToKey(day, 6 - column);
        break;
      case "PageUp":
        next = shiftMonth(day, event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = shiftMonth(day, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    focusDay(next);
  }

  const prevMonth = addMonths(monthKey, -1);
  const nextMonth = addMonths(monthKey, 1);

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900/80">
        <div className="flex items-center justify-between gap-3 border-b border-shadow-700 px-3 py-3 sm:px-4">
          <h2 id={monthHeadingId} aria-live="polite" className="text-base font-semibold text-white sm:text-lg">
            {monthLabel(monthKey)}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToMonth(prevMonth)}
              aria-label={`Previous month, ${monthLabel(prevMonth)}`}
              className={button.icon}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="inline-flex h-9 items-center rounded-md border border-shadow-700 px-3 text-sm font-medium text-ash-200 transition-colors hover:border-chakra-500 hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => goToMonth(nextMonth)}
              aria-label={`Next month, ${monthLabel(nextMonth)}`}
              className={button.icon}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <table
          ref={tableRef}
          role="grid"
          aria-labelledby={monthHeadingId}
          onKeyDown={onGridKeyDown}
          className="w-full table-fixed border-collapse"
        >
          <thead>
            <tr>
              {WEEK_COLUMNS.map((col) => (
                <th
                  key={col.long}
                  scope="col"
                  aria-label={col.long}
                  className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ash-400"
                >
                  <span aria-hidden="true" className="sm:hidden">
                    {col.narrow}
                  </span>
                  <span aria-hidden="true" className="hidden sm:inline">
                    {col.short}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((day) => (
                  <DayCell
                    key={day}
                    day={day}
                    events={byDay.get(day) ?? []}
                    inMonth={monthKeyOf(day) === monthKey}
                    isToday={day === today}
                    isSelected={day === selected}
                    onSelect={() => focusDay(day)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-shadow-700 px-3 py-2.5 text-[11px] text-ash-400 sm:px-4">
          {EVENT_TYPES.map((meta) => (
            <span key={meta.type} className="inline-flex items-center gap-1.5">
              <span className={cx("h-2 w-2 rounded-full", meta.classes.dot)} aria-hidden="true" />
              {meta.shortLabel}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 sm:ml-auto">
            <Info className="h-3 w-3" aria-hidden="true" />
            Venue-local dates
          </span>
        </div>
      </div>

      <section aria-labelledby={dayHeadingId} className="mt-6">
        <h2 id={dayHeadingId} className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-white">
          {longDayLabel(selected)}
          <span className="text-sm font-normal text-ash-400 tabular-nums">
            {selectedEvents.length === 0 ? "No events" : pluralize(selectedEvents.length, "event")}
          </span>
        </h2>

        {selectedEvents.length > 0 ? (
          <ol className="mt-3 grid gap-3">
            {selectedEvents.map((event) => {
              const distance = distances.get(event.id) ?? null;
              return (
                <li key={event.id}>
                  <EventCard
                    event={event}
                    distanceLabel={distance === null ? null : formatDistance(distance, filters.unit)}
                    past={isPast(event, now)}
                  />
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-shadow-500/70 bg-shadow-900/50 px-4 py-6 text-sm text-ash-400">
            <p>
              {monthHasEvents
                ? "Nothing on this day. Pick a highlighted day to see its events."
                : `No matching events in ${monthLabel(monthKey)}.`}
            </p>
            {/* These buttons unmount once the target month shows events, so they move focus onto its first busy day. */}
            {!monthHasEvents && (prevBusyMonth || nextBusyMonth) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {prevBusyMonth && (
                  <button
                    type="button"
                    onClick={() => focusDay(firstBusyDayIn(prevBusyMonth))}
                    className={button.secondary}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {monthLabel(prevBusyMonth)}
                  </button>
                )}
                {nextBusyMonth && (
                  <button
                    type="button"
                    onClick={() => focusDay(firstBusyDayIn(nextBusyMonth))}
                    className={button.secondary}
                  >
                    {monthLabel(nextBusyMonth)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function DayCell({
  day,
  events,
  inMonth,
  isToday,
  isSelected,
  onSelect,
}: {
  day: string;
  events: EventSummary[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const count = events.length;
  const shown = events.slice(0, MAX_PILLS);
  const overflow = count - shown.length;

  return (
    <td
      role="gridcell"
      aria-selected={isSelected}
      className="border-t border-shadow-700/70 p-0 align-top [&:not(:first-child)]:border-l"
    >
      <button
        type="button"
        data-day={day}
        tabIndex={isSelected ? 0 : -1}
        aria-current={isToday ? "date" : undefined}
        aria-label={`${longDayLabel(day)}, ${count === 0 ? "no events" : pluralize(count, "event")}`}
        onClick={onSelect}
        className={cx(
          "flex h-14 w-full flex-col items-center gap-1 px-0.5 py-1 text-left transition-colors sm:h-28 sm:items-stretch sm:p-1.5",
          "focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white",
          isSelected
            ? "bg-chakra-500/10 inset-ring-2 inset-ring-chakra-500/80"
            : inMonth
              ? "hover:bg-shadow-800/80"
              : "bg-shadow-950/40 hover:bg-shadow-800/60",
        )}
      >
        <span
          className={cx(
            "inline-flex h-6 min-w-6 items-center justify-center self-center rounded-full px-1 text-xs tabular-nums sm:self-start",
            // Adjacent-month days are still buttons, so they keep text contrast (≥4.5:1, also on hover)
            // and are told apart by weight and the darker cell instead.
            isToday
              ? "bg-chakra-500 font-semibold text-shadow-950"
              : !inMonth
                ? "font-normal text-ash-400/90"
                : count > 0
                  ? "font-semibold text-white"
                  : "font-semibold text-ash-400",
          )}
        >
          {Number(day.slice(8, 10))}
        </span>

        {count > 0 && (
          <>
            {/* Phones: coloured dots only. */}
            <span className={cx("flex items-center gap-0.5 sm:hidden", !inMonth && "opacity-50")} aria-hidden="true">
              {shown.map((event) => (
                <span
                  key={event.id}
                  className={cx("h-1.5 w-1.5 rounded-full", eventTypeMeta(event.type).classes.dot)}
                />
              ))}
              {overflow > 0 && <span className="text-[9px] leading-none text-ash-400">+</span>}
            </span>

            {/* Larger screens: titled pills. */}
            <span
              className={cx("hidden min-w-0 flex-col gap-0.5 sm:flex", !inMonth && "opacity-80")}
              aria-hidden="true"
            >
              {shown.map((event) => {
                const meta = eventTypeMeta(event.type);
                return (
                  <span
                    key={event.id}
                    className={cx(
                      "block truncate rounded px-1.5 py-px text-[11px] leading-4",
                      meta.classes.bg,
                      meta.classes.text,
                      event.status === "cancelled" && "line-through grayscale",
                    )}
                  >
                    {event.title}
                  </span>
                );
              })}
              {overflow > 0 && <span className="px-1.5 text-[11px] leading-4 text-ash-400">+{overflow} more</span>}
            </span>
          </>
        )}
      </button>
    </td>
  );
}
