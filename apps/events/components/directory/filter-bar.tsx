"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useId, useRef, useState } from "react";
import { countActiveFilters } from "@/lib/filters";
import { cx, pluralize } from "@/lib/format";
import { button, surface } from "@/lib/styles";
import { useEventFilters } from "@/lib/use-event-filters";
import { ActiveFilters } from "./active-filters";
import { DateRangeFilter } from "./date-range-filter";
import { LocationFilter } from "./location-filter";
import { MoreFilters } from "./more-filters";
import { SearchField } from "./search-field";
import { DIRECTORY_RESULTS_ID, focusRing, prefersReducedMotion } from "./shared";
import { TypeFilter } from "./type-filter";

/**
 * Event filters backed by the URL (`useEventFilters`), shared by the directory
 * and the map.
 *
 * - `full`: a card for the directory sidebar. Below `lg` everything except search
 *   and the active-filter chips folds into a disclosure so results stay close.
 * - `compact`: borderless, always-expanded vertical stack for narrow (~340px)
 *   sidebars; announces the result count itself.
 */
export function FilterBar({ variant = "full", resultCount }: { variant?: "full" | "compact"; resultCount?: number }) {
  const { filters, setFilters, resetFilters } = useEventFilters();
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const panelId = `${baseId}-panel`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const compact = variant === "compact";
  const activeCount = countActiveFilters(filters);
  const controls = { filters, setFilters };

  function clearAll() {
    resetFilters();
    headingRef.current?.focus();
  }

  function showResults() {
    setMobileOpen(false);
    const results = document.getElementById(DIRECTORY_RESULTS_ID);
    results?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    results?.focus({ preventScroll: true });
  }

  return (
    <div
      role="search"
      aria-labelledby={headingId}
      className={cx("flex flex-col", compact ? "gap-4" : cx(surface.card, "gap-4 p-4 sm:p-5"))}
    >
      <div className="flex min-h-7 items-center gap-3">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="flex items-center gap-2 text-sm font-semibold text-white focus:outline-none"
        >
          <SlidersHorizontal className="h-4 w-4 text-chakra-400" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-chakra-500 px-1.5 py-px text-[11px] font-bold text-shadow-950 tabular-nums">
              {activeCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </h2>
        {compact && resultCount !== undefined && (
          <p aria-live="polite" aria-atomic="true" className="text-xs text-ash-400 tabular-nums">
            {pluralize(resultCount, "event")}
          </p>
        )}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className={cx(
              "ml-auto rounded px-1.5 py-1 text-xs font-medium text-ash-400 underline-offset-4 transition-colors hover:text-chakra-400 hover:underline",
              focusRing,
            )}
          >
            Clear all
          </button>
        )}
      </div>

      <SearchField {...controls} />

      {!compact && (
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          onClick={() => setMobileOpen((v) => !v)}
          className={cx(
            "flex w-full items-center justify-between gap-2 rounded-md border border-shadow-500 bg-shadow-800 px-4 py-2 text-sm font-semibold text-ash-200 transition-colors hover:border-chakra-400 hover:text-chakra-400 lg:hidden",
            focusRing,
          )}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {mobileOpen ? "Hide filters" : "Type, location & dates"}
          </span>
          <ChevronDown className={cx("h-4 w-4 transition-transform", mobileOpen && "rotate-180")} aria-hidden="true" />
        </button>
      )}

      <ActiveFilters {...controls} onEmpty={() => headingRef.current?.focus()} />

      <div
        id={panelId}
        className={cx(
          "flex flex-col gap-5 [&>*+*]:border-t [&>*+*]:border-shadow-700/70 [&>*+*]:pt-5",
          !compact && !mobileOpen && "max-lg:hidden",
        )}
      >
        {/* Wrappers carry the dividers: a border on the fieldset itself would run through its legend. */}
        <div>
          <TypeFilter {...controls} />
        </div>
        <div>
          <LocationFilter {...controls} />
        </div>
        <div>
          <DateRangeFilter {...controls} />
        </div>
        <div>
          <MoreFilters {...controls} />
        </div>
      </div>

      {!compact && mobileOpen && (
        <button type="button" onClick={showResults} className={cx(button.primary, "w-full lg:hidden")}>
          {resultCount === undefined ? "Show events" : `Show ${pluralize(resultCount, "event")}`}
        </button>
      )}
    </div>
  );
}
