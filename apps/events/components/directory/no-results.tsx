"use client";

import { CalendarPlus, RotateCcw, SearchX, Expand } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { RADIUS_OPTIONS, countActiveFilters, hasLocation, type EventFilters } from "@/lib/filters";
import { button } from "@/lib/styles";
import type { SetFilters } from "./shared";

/** Empty results, with the most useful recovery actions for the current filters. */
export function NoResults({
  filters,
  setFilters,
  resetFilters,
}: {
  filters: EventFilters;
  setFilters: SetFilters;
  resetFilters: () => void;
}) {
  const active = countActiveFilters(filters);

  if (active === 0) {
    return (
      <EmptyState
        icon={CalendarPlus}
        className="mt-6"
        title="No upcoming events yet"
        description="New demo days and tournaments are added every week. Running one? List it for the community."
        action={
          <Link href="/events/submit" className={button.primary}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Submit an event
          </Link>
        }
      />
    );
  }

  const located = hasLocation(filters);
  const widerRadius = located ? RADIUS_OPTIONS.find((r) => r > filters.radius) : undefined;

  return (
    <EmptyState
      icon={SearchX}
      className="mt-6"
      title="No events match your filters"
      description={
        located
          ? "Try a wider radius, a different place or fewer filters."
          : "Try a different search, a wider date range or fewer filters."
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {widerRadius !== undefined && (
            <button type="button" onClick={() => setFilters({ radius: widerRadius })} className={button.secondary}>
              <Expand className="h-4 w-4" aria-hidden="true" />
              Search within {widerRadius.toLocaleString("en-US")} {filters.unit}
            </button>
          )}
          <button type="button" onClick={resetFilters} className={button.primary}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      }
    />
  );
}
