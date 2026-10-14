"use client";

// Client-side filtering for the server-rendered reveal feed. The feed markup is
// streamed from the server in full; these wrappers only toggle `hidden` on
// items and day groups, so the page works (unfiltered) without JavaScript.
import type { ChakraElement } from "@naruto-tcg/types";
import { createContext, useContext, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ElementIcon } from "@/components/ElementIcon";
import { CHAKRA_ELEMENTS, ELEMENT_META } from "@/lib/meta";
import type { FeedKey } from "./reveals";

interface FeedFilter {
  set: string | null;
  element: ChakraElement | null;
}

const NO_FILTER: FeedFilter = { set: null, element: null };

interface FeedContextValue {
  filter: FeedFilter;
  setFilter: (next: FeedFilter) => void;
  matches: (key: FeedKey) => boolean;
  index: readonly FeedKey[];
  visibleCount: number;
  /** The Set select: where focus goes when a reset button hides itself. */
  filterFocusRef: RefObject<HTMLSelectElement | null>;
}

const FeedContext = createContext<FeedContextValue | null>(null);

function useFeed(): FeedContextValue {
  const value = useContext(FeedContext);
  if (!value) throw new Error("Reveal feed components must be rendered inside <RevealFeedProvider>");
  return value;
}

function keyMatches(filter: FeedFilter, key: FeedKey): boolean {
  return (filter.set === null || key.set === filter.set) && (filter.element === null || key.element === filter.element);
}

/** Holds the filter state. `index` lists every feed item's keys in feed order. */
export function RevealFeedProvider({ index, children }: { index: readonly FeedKey[]; children: ReactNode }) {
  const [filter, setFilter] = useState<FeedFilter>(NO_FILTER);
  const filterFocusRef = useRef<HTMLSelectElement>(null);
  const value = useMemo<FeedContextValue>(() => {
    let visibleCount = 0;
    for (const key of index) if (keyMatches(filter, key)) visibleCount++;
    return { filter, setFilter, matches: (key) => keyMatches(filter, key), index, visibleCount, filterFocusRef };
  }, [filter, index]);
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

/** A day group; hides itself when none of its cards match the filter. */
export function FeedGroup({
  keys,
  id,
  labelledBy,
  className,
  children,
}: {
  keys: readonly FeedKey[];
  id: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const { matches } = useFeed();
  const visible = keys.some(matches);
  return (
    <section id={id} aria-labelledby={labelledBy} hidden={!visible} className={className}>
      {children}
    </section>
  );
}

/** Card count for a day header that reflects the active filter. */
export function FeedGroupCount({ keys }: { keys: readonly FeedKey[] }) {
  const { matches, filter } = useFeed();
  const total = keys.length;
  const shown = keys.filter(matches).length;
  const filtered = filter.set !== null || filter.element !== null;
  return (
    <>
      {filtered && shown !== total ? `${shown} of ${total}` : total} {total === 1 ? "card" : "cards"}
    </>
  );
}

/** One feed grid item; hidden when it doesn't match the filter. */
export function FeedItem({ feedKey, className, children }: { feedKey: FeedKey; className?: string; children: ReactNode }) {
  const { matches } = useFeed();
  return (
    <li hidden={!matches(feedKey)} className={className}>
      {children}
    </li>
  );
}

const CHECKED_STYLE: Record<ChakraElement, string> = {
  fire: "peer-checked:border-fire/70 peer-checked:bg-fire/15 peer-checked:text-white",
  water: "peer-checked:border-water/70 peer-checked:bg-water/15 peer-checked:text-white",
  lightning: "peer-checked:border-lightning/70 peer-checked:bg-lightning/15 peer-checked:text-white",
  earth: "peer-checked:border-earth/70 peer-checked:bg-earth/15 peer-checked:text-white",
  wind: "peer-checked:border-wind/70 peer-checked:bg-wind/15 peer-checked:text-white",
};

const CHIP =
  "flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-shadow-700 bg-shadow-900 px-3 py-1.5 text-sm font-medium text-ash-400 transition hover:border-shadow-500 hover:text-ash-200 peer-focus-visible:ring-2 peer-focus-visible:ring-chakra-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-shadow-950 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 peer-disabled:hover:border-shadow-700 peer-disabled:hover:text-ash-400";

export interface FeedSetOption {
  id: string;
  label: string;
}

/** Set + element filters with a live result count. */
export function FeedFilterBar({ sets }: { sets: readonly FeedSetOption[] }) {
  const { filter, setFilter, index, visibleCount, filterFocusRef } = useFeed();
  const uid = useId();
  const selectId = `${uid}-set`;
  const radioName = `${uid}-element`;

  // Faceted counts: each control counts results under the *other* filter.
  const setCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const key of index) {
      if (filter.element !== null && key.element !== filter.element) continue;
      counts.set(key.set, (counts.get(key.set) ?? 0) + 1);
    }
    return counts;
  }, [index, filter.element]);

  const elementCounts = useMemo(() => {
    const counts = new Map<ChakraElement, number>();
    for (const key of index) {
      if (filter.set !== null && key.set !== filter.set) continue;
      counts.set(key.element, (counts.get(key.element) ?? 0) + 1);
    }
    return counts;
  }, [index, filter.set]);

  const elementTotal = useMemo(() => [...elementCounts.values()].reduce((a, b) => a + b, 0), [elementCounts]);
  const setTotal = useMemo(() => [...setCounts.values()].reduce((a, b) => a + b, 0), [setCounts]);
  const active = filter.set !== null || filter.element !== null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-shadow-700 bg-shadow-900/80 p-4 shadow-lg shadow-black/20 lg:flex-row lg:items-end lg:gap-6">
      <div className="flex min-w-0 flex-col gap-1.5 lg:w-64 lg:shrink-0">
        <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-[0.16em] text-ash-400">
          Set
        </label>
        <div className="relative">
          <select
            ref={filterFocusRef}
            id={selectId}
            value={filter.set ?? ""}
            onChange={(event) => setFilter({ ...filter, set: event.target.value === "" ? null : event.target.value })}
            className="w-full cursor-pointer appearance-none rounded-lg border border-shadow-700 bg-shadow-950 py-2 pl-3 pr-9 text-sm text-ash-200 transition hover:border-shadow-500 focus-visible:border-chakra-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <option value="">All sets ({setTotal})</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.label} ({setCounts.get(set.id) ?? 0})
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400"
          >
            <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <fieldset className="min-w-0 flex-1">
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-ash-400">Element</legend>
        <div className="flex flex-wrap gap-1.5">
          <label className="relative">
            <input
              type="radio"
              name={radioName}
              value=""
              checked={filter.element === null}
              onChange={() => setFilter({ ...filter, element: null })}
              className="peer sr-only"
            />
            <span className={`${CHIP} peer-checked:border-chakra-500/70 peer-checked:bg-chakra-500/15 peer-checked:text-white`}>
              All
              <span className="text-xs tabular-nums text-ash-400">{elementTotal}</span>
            </span>
          </label>
          {CHAKRA_ELEMENTS.map((element) => {
            const count = elementCounts.get(element) ?? 0;
            const checked = filter.element === element;
            return (
              <label key={element} className="relative">
                <input
                  type="radio"
                  name={radioName}
                  value={element}
                  checked={checked}
                  disabled={count === 0 && !checked}
                  onChange={() => setFilter({ ...filter, element })}
                  className="peer sr-only"
                />
                <span className={`${CHIP} ${CHECKED_STYLE[element]}`}>
                  <ElementIcon element={element} className="h-3.5 w-3.5" />
                  {ELEMENT_META[element].label}
                  <span className="text-xs tabular-nums text-ash-400">{count}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3 border-t border-shadow-800 pt-3 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
        <p role="status" aria-live="polite" className="text-sm text-ash-400">
          {active ? (
            <>
              Showing <span className="font-semibold text-white">{visibleCount}</span> of {index.length}
            </>
          ) : (
            <>
              <span className="font-semibold text-white">{index.length}</span> revealed {index.length === 1 ? "card" : "cards"}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setFilter(NO_FILTER);
            // The button hides itself once nothing is filtered; keep focus in the filters.
            filterFocusRef.current?.focus();
          }}
          disabled={!active}
          className="rounded-md px-2 py-1 text-sm font-semibold text-chakra-400 transition hover:text-chakra-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 disabled:invisible"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}

/** Shown in place of the feed when the filters exclude every card. */
export function FeedNoMatches() {
  const { visibleCount, index, setFilter, filterFocusRef } = useFeed();
  if (index.length === 0 || visibleCount > 0) return null;
  return (
    <div className="rounded-2xl border border-dashed border-shadow-700 bg-shadow-900/60 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">No reveals match these filters</p>
      <p className="mt-1 text-sm text-ash-400">Try another set or element.</p>
      <button
        type="button"
        onClick={() => {
          setFilter(NO_FILTER);
          filterFocusRef.current?.focus();
        }}
        className="mt-4 rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950"
      >
        Show all reveals
      </button>
    </div>
  );
}
