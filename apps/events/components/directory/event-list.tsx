"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { EventCard } from "@/components/event-card";
import { isPast } from "@/lib/event-summary";
import { hasLocation, type EventFilters, type FilteredEvent } from "@/lib/filters";
import { pluralize } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { button } from "@/lib/styles";
import { monthKeyOf, monthLabel } from "./date-keys";

const PAGE_SIZE = 24;

interface Group {
  key: string;
  /** Visible heading, or null for the flat distance-sorted list. */
  label: string | null;
  /** Total matching events in this group (including ones not yet revealed). */
  total: number;
  items: { result: FilteredEvent; index: number }[];
}

/**
 * Results as cards, grouped under sticky month headings (or a flat list when
 * sorted by distance), revealed 24 at a time. Remount with a `key` derived from
 * the filters to reset paging when they change.
 */
export function EventList({ results, filters, now }: { results: FilteredEvent[]; filters: EventFilters; now: Date }) {
  const baseId = useId();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);
  const revealFrom = useRef<number | null>(null);
  const byDistance = filters.sort === "distance" && hasLocation(filters);

  const monthTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const { event } of results) {
      const key = monthKeyOf(event.display.localDate);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
    return totals;
  }, [results]);

  const groups = useMemo<Group[]>(() => {
    const visible = results.slice(0, limit);
    if (byDistance) {
      return [
        {
          key: "distance",
          label: null,
          total: results.length,
          items: visible.map((result, index) => ({ result, index })),
        },
      ];
    }
    // Results are in UTC start order but grouped by venue-local month, so near a month boundary
    // events in far-apart time zones can interleave (Oct, Nov, Oct…). Key groups by month in
    // first-seen order so each month gets exactly one section; `index` keeps the result order.
    const out: Group[] = [];
    const byMonth = new Map<string, Group>();
    visible.forEach((result, index) => {
      const key = monthKeyOf(result.event.display.localDate);
      let group = byMonth.get(key);
      if (!group) {
        group = { key, label: monthLabel(key), total: monthTotals.get(key) ?? 0, items: [] };
        byMonth.set(key, group);
        out.push(group);
      }
      group.items.push({ result, index });
    });
    return out;
  }, [results, limit, byDistance, monthTotals]);

  // After "Show more", move focus to the first newly revealed event so keyboard users continue in place.
  useEffect(() => {
    const index = revealFrom.current;
    if (index === null) return;
    revealFrom.current = null;
    listRef.current?.querySelector<HTMLAnchorElement>(`[data-index="${index}"] a`)?.focus();
  }, [limit]);

  const remaining = results.length - limit;

  return (
    <div ref={listRef} className="mt-2">
      {groups.map((group) => {
        const headingId = `${baseId}-${group.key}`;
        return (
          <section key={group.key} aria-labelledby={headingId}>
            {group.label ? (
              <h2
                id={headingId}
                className="sticky top-14 z-10 -mx-2 flex items-baseline justify-between gap-3 bg-shadow-950/90 px-2 pb-2 pt-4 text-sm font-semibold text-white backdrop-blur supports-[backdrop-filter]:bg-shadow-950/75"
              >
                {group.label}
                <span className="text-xs font-normal text-ash-400 tabular-nums">{pluralize(group.total, "event")}</span>
              </h2>
            ) : (
              <h2 id={headingId} className="sr-only">
                Events sorted by distance
              </h2>
            )}
            <ol className="mt-2 grid gap-3 pb-2">
              {group.items.map(({ result, index }) => (
                <li key={result.event.id} data-index={index}>
                  <EventCard
                    event={result.event}
                    distanceLabel={result.distance === null ? null : formatDistance(result.distance, filters.unit)}
                    past={isPast(result.event, now)}
                  />
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {remaining > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              revealFrom.current = limit;
              setLimit((n) => n + PAGE_SIZE);
            }}
            className={button.secondary}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            Show {Math.min(PAGE_SIZE, remaining)} more
          </button>
          <p className="text-xs text-ash-400 tabular-nums">
            Showing {limit.toLocaleString("en-US")} of {results.length.toLocaleString("en-US")}
          </p>
        </div>
      )}
    </div>
  );
}
