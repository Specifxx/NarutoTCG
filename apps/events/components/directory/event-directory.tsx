"use client";

import { useMemo } from "react";
import type { EventSummary } from "@/lib/event-summary";
import { applyEventFilters, serializeEventFilters } from "@/lib/filters";
import { useEventFilters } from "@/lib/use-event-filters";
import { EventCalendar } from "./event-calendar";
import { EventList } from "./event-list";
import { FilterBar } from "./filter-bar";
import { NoResults } from "./no-results";
import { ResultsToolbar } from "./results-toolbar";
import { DIRECTORY_RESULTS_ID } from "./shared";

/**
 * Filterable event directory: filter sidebar plus list or calendar results.
 *
 * Filtering runs against `nowIso` (the request time) rather than the client
 * clock, so the server render and hydration see exactly the same results for
 * any query string.
 */
export function EventDirectory({ events, nowIso }: { events: EventSummary[]; nowIso: string }) {
  const { filters, setFilters, resetFilters, hrefWithFilters } = useEventFilters();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const results = useMemo(() => applyEventFilters(events, filters, now), [events, filters, now]);
  // Paging resets whenever the narrowing filters or sort change (not when switching views).
  const listKey = useMemo(() => serializeEventFilters({ ...filters, view: "list", month: null }), [filters]);

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8">
      <div className="min-w-0 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-5.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]">
        <FilterBar resultCount={results.length} />
      </div>

      <section
        id={DIRECTORY_RESULTS_ID}
        aria-label="Event results"
        tabIndex={-1}
        className="min-w-0 scroll-mt-20 focus:outline-none"
      >
        <ResultsToolbar
          count={results.length}
          filters={filters}
          setFilters={setFilters}
          mapHref={hrefWithFilters("/events/map", { view: "list", month: null })}
        />

        {results.length === 0 ? (
          <>
            <h2 className="sr-only">No results</h2>
            <NoResults filters={filters} setFilters={setFilters} resetFilters={resetFilters} />
          </>
        ) : filters.view === "calendar" ? (
          <EventCalendar results={results} filters={filters} setFilters={setFilters} now={now} />
        ) : (
          <EventList key={listKey} results={results} filters={filters} now={now} />
        )}
      </section>
    </div>
  );
}
