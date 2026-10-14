"use client";

import { CalendarDays, List, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { hasLocation, type EventFilters } from "@/lib/filters";
import { cx } from "@/lib/format";
import { field } from "@/lib/styles";
import { originLabel } from "./location-filter";
import { focusRing, type SetFilters } from "./shared";

const VIEWS = [
  { view: "list", label: "List", icon: List },
  { view: "calendar", label: "Calendar", icon: CalendarDays },
] as const;

/** Result count (live region), sort order, list/calendar toggle and a link to the map with the same filters. */
export function ResultsToolbar({
  count,
  filters,
  setFilters,
  mapHref,
}: {
  count: number;
  filters: EventFilters;
  setFilters: SetFilters;
  mapHref: string;
}) {
  const sortId = useId();
  const located = hasLocation(filters);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-shadow-700 pb-4 sm:flex sm:flex-wrap">
      <p aria-live="polite" aria-atomic="true" className="min-w-0 text-sm text-ash-400 sm:flex-1">
        <span className="text-lg font-semibold text-white tabular-nums">{count.toLocaleString("en-US")}</span>{" "}
        {count === 1 ? "event" : "events"}
        {located && (
          <span>
            {" "}
            within <span className="tabular-nums">{filters.radius.toLocaleString("en-US")}</span> {filters.unit} of{" "}
            <span className="text-ash-200">{originLabel(filters.near)}</span>
          </span>
        )}
      </p>

      {filters.view === "list" && (
        <div className="w-40">
          <label htmlFor={sortId} className="sr-only">
            Sort events
          </label>
          <select
            id={sortId}
            value={located ? filters.sort : "date"}
            onChange={(e) => setFilters({ sort: e.target.value === "distance" ? "distance" : "date" })}
            className={field.select}
          >
            <option value="date">Soonest first</option>
            <option value="distance" disabled={!located}>
              {located ? "Nearest first" : "Nearest first (set a location)"}
            </option>
          </select>
        </div>
      )}

      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        <div
          role="group"
          aria-label="View as"
          className="inline-flex rounded-md border border-shadow-700 bg-shadow-900 p-0.5"
        >
          {VIEWS.map(({ view, label, icon: Icon }) => {
            const active = filters.view === view;
            return (
              <button
                key={view}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters({ view })}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  focusRing,
                  active ? "bg-shadow-700 text-white" : "text-ash-400 hover:text-ash-200",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <Link
          href={mapHref}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-md border border-shadow-700 bg-shadow-900 px-3 py-2 text-sm font-medium text-ash-200 transition-colors hover:border-chakra-500 hover:text-chakra-400",
            focusRing,
          )}
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          Map
        </Link>
      </div>
    </div>
  );
}
