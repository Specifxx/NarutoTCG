"use client";

import { useId, type RefObject } from "react";
import { SORT_KEYS, SORT_LABELS, VIEW_MODES, type SortKey, type ViewMode } from "@/lib/search";
import { ChevronIcon, FilterIcon, GridIcon, ListIcon } from "./icons";
import styles from "./browser.module.css";

const VIEW_LABEL: Record<ViewMode, string> = { grid: "Grid view", list: "List view" };

/** Result count, the mobile "Filters" trigger, sort select, and grid/list toggle. */
export function ResultsToolbar({
  total,
  all,
  sort,
  view,
  activeCount,
  drawerOpen,
  filtersButtonRef,
  onOpenFilters,
  onSort,
  onView,
}: {
  total: number;
  all: number;
  sort: SortKey;
  view: ViewMode;
  activeCount: number;
  drawerOpen: boolean;
  filtersButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenFilters: () => void;
  onSort: (sort: SortKey) => void;
  onView: (view: ViewMode) => void;
}) {
  const sortId = useId();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3 sm:gap-x-3">
      <button
        ref={filtersButtonRef}
        type="button"
        onClick={onOpenFilters}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-shadow-700 bg-shadow-900 px-2.5 text-sm font-semibold sm:px-3 text-ash-200 transition hover:border-chakra-500/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 lg:hidden"
      >
        <FilterIcon className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="min-w-5 rounded-full bg-chakra-500 px-1.5 text-center text-[11px] font-bold leading-5 text-shadow-950">
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        )}
      </button>

      <p className={`${styles.pending} order-last w-full text-sm text-ash-400 sm:order-none sm:w-auto sm:flex-1`}>
        <span className="font-semibold tabular-nums text-white">{total.toLocaleString("en-US")}</span>{" "}
        {total === 1 ? "card" : "cards"}
        {total !== all && <span className="tabular-nums"> of {all.toLocaleString("en-US")}</span>}
      </p>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
        <label htmlFor={sortId} className="sr-only text-xs font-medium text-ash-400 sm:not-sr-only">
          Sort
        </label>
        <div className="relative min-w-0 flex-1 sm:flex-none">
          <select
            id={sortId}
            value={sort}
            onChange={(event) => {
              const next = SORT_KEYS.find((key) => key === event.target.value);
              if (next) onSort(next);
            }}
            className="h-10 w-full cursor-pointer appearance-none truncate rounded-lg border border-shadow-700 bg-shadow-900 pl-3 pr-8 text-sm text-ash-200 transition hover:border-shadow-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 sm:w-auto"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key} className="bg-shadow-900">
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <ChevronIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400" />
        </div>

        <div
          role="group"
          aria-label="Result layout"
          className="inline-flex shrink-0 rounded-lg border border-shadow-700 bg-shadow-900 p-0.5"
        >
          {VIEW_MODES.map((mode) => {
            const active = view === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => onView(mode)}
                title={VIEW_LABEL[mode]}
                className={`grid h-9 w-9 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 ${
                  active ? "bg-shadow-700 text-chakra-400 shadow-sm shadow-black/40" : "text-ash-400 hover:text-white"
                }`}
              >
                {mode === "grid" ? <GridIcon className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
                <span className="sr-only">{VIEW_LABEL[mode]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
