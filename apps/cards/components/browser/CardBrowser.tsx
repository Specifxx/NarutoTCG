"use client";

import type { NarutoCard } from "@naruto-tcg/types";
import { useCallback, useDeferredValue, useId, useMemo, useRef, useState } from "react";
import {
  EMPTY_FILTERS,
  activeFacetCount,
  applyFilters,
  buildSearchIndex,
  clearFacet,
  countFacets,
  matchQuery,
  searchSuggestions,
  toQueryString,
  toggleFacetValue,
  type FacetKey,
} from "@/lib/search";
import { ActiveFilters } from "./ActiveFilters";
import { CardGrid } from "./CardGrid";
import { CardTable } from "./CardTable";
import { EmptyState } from "./EmptyState";
import { FilterDrawer } from "./FilterDrawer";
import { FilterPanel, type BrowserSet, type ToggleFacet } from "./FilterPanel";
import { ResultsToolbar } from "./ResultsToolbar";
import { SearchBar } from "./SearchBar";
import { useDebouncedValue, useProgressiveList } from "./hooks";
import { FilterIcon } from "./icons";
import { useBrowserState } from "./useBrowserState";
import styles from "./browser.module.css";

/** Card data the browser needs; flavor text and artist are left on the server. */
export type BrowserCard = Omit<NarutoCard, "flavor" | "artist">;
export type { BrowserSet };

/** Grid tiles likely above the fold on first paint. */
const EAGER_TILES = 6;

/**
 * Interactive card database: instant search, faceted filters, sort, and
 * grid/list results, all synced to the /cards URL contract.
 */
export function CardBrowser({ cards, sets }: { cards: readonly BrowserCard[]; sets: readonly BrowserSet[] }) {
  const index = useMemo(() => buildSearchIndex(cards, sets), [cards, sets]);
  const setsInOrder = useMemo(() => {
    const byId = new Map(sets.map((set) => [set.id, set]));
    return index.setIds.flatMap((id) => byId.get(id) ?? []);
  }, [index.setIds, sets]);

  const { state, setFilters, setQuery, setSort, setView } = useBrowserState(index.setIds);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Controls update immediately; results render from the deferred copy so
  // typing and toggling never wait on a large re-render.
  const deferred = useDeferredValue(state);
  const stale = deferred !== state;

  const queryResult = useMemo(() => matchQuery(index, deferred.filters.query), [index, deferred.filters.query]);
  const hits = useMemo(
    () => applyFilters(queryResult, deferred.filters, deferred.sort),
    [queryResult, deferred.filters, deferred.sort],
  );
  const counts = useMemo(() => countFacets(index, queryResult, deferred.filters), [index, queryResult, deferred.filters]);
  const suggestions = useMemo(() => searchSuggestions(index, 6), [index]);
  const costOptions = useMemo(
    () => [...new Set([...index.costs, ...state.filters.costs])].sort((a, b) => a - b),
    [index.costs, state.filters.costs],
  );

  const resetKey = `${toQueryString({ filters: deferred.filters, sort: deferred.sort })}|${deferred.view}`;
  const { visible, hasMore, showMore, sentinelRef } = useProgressiveList(resetKey, hits.length);
  const shown = useMemo(() => hits.slice(0, visible), [hits, visible]);

  const onToggle = useCallback<ToggleFacet>(
    (key, value) => setFilters((filters) => toggleFacetValue(filters, key, value, index.setIds)),
    [setFilters, index.setIds],
  );
  const onReset = useCallback((key: FacetKey) => setFilters((filters) => clearFacet(filters, key)), [setFilters]);
  const clearAll = useCallback(() => setFilters(() => EMPTY_FILTERS), [setFilters]);
  const clearFacets = useCallback(() => setFilters((filters) => ({ ...EMPTY_FILTERS, query: filters.query })), [setFilters]);
  const clearQuery = useCallback(() => setQuery(""), [setQuery]);
  const onSuggest = useCallback(
    (query: string) => {
      setFilters(() => ({ ...EMPTY_FILTERS, query }));
      searchRef.current?.focus();
    },
    [setFilters],
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const activeCount = activeFacetCount(state.filters);
  const announcement = useDebouncedValue(`${hits.length.toLocaleString("en-US")} ${hits.length === 1 ? "card" : "cards"} found`, 700);
  const filtersHeadingId = useId();
  const resultsHeadingId = useId();

  const panel = (
    <FilterPanel
      filters={state.filters}
      counts={counts}
      costs={costOptions}
      sets={setsInOrder}
      onToggle={onToggle}
      onReset={onReset}
    />
  );

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 xl:gap-10">
        <aside aria-labelledby={filtersHeadingId} className="hidden lg:block">
          <div
            className={`${styles.scrollArea} ${styles.sidebar} sticky top-28 -mr-3 max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain pb-10 pr-3`}
          >
            <div className="flex h-12 items-center justify-between gap-2">
              <h2
                id={filtersHeadingId}
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-white"
              >
                <FilterIcon className="h-4 w-4 text-chakra-400" />
                Filters
              </h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded px-1.5 py-1 text-xs font-semibold text-chakra-400 underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  Clear all
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        <section aria-labelledby={resultsHeadingId} className="min-w-0">
          <h2 id={resultsHeadingId} className="sr-only">
            Search results
          </h2>
          <SearchBar value={state.filters.query} onChange={setQuery} inputRef={searchRef} />
          <ResultsToolbar
            total={hits.length}
            all={index.entries.length}
            sort={state.sort}
            view={state.view}
            activeCount={activeCount}
            drawerOpen={drawerOpen}
            filtersButtonRef={filtersButtonRef}
            onOpenFilters={openDrawer}
            onSort={setSort}
            onView={setView}
          />
          <div className="mt-3 empty:hidden">
            <ActiveFilters
              filters={state.filters}
              sets={setsInOrder}
              onToggle={onToggle}
              onClearQuery={clearQuery}
              onClearAll={clearAll}
              fallbackFocusRef={searchRef}
            />
          </div>

          <div
            aria-busy={stale}
            // Dim only when results lag noticeably, so fast typing doesn't flicker.
            className={`mt-5 transition-opacity duration-200 motion-reduce:transition-none ${stale ? "opacity-60 delay-150" : "delay-0"}`}
          >
            {hits.length === 0 ? (
              <EmptyState
                query={deferred.filters.query}
                facetCount={activeFacetCount(deferred.filters)}
                datasetEmpty={index.entries.length === 0}
                suggestions={suggestions}
                onClearAll={clearAll}
                onClearFacets={clearFacets}
                onSuggest={onSuggest}
              />
            ) : deferred.view === "grid" ? (
              <CardGrid hits={shown} tokens={queryResult.tokens} eagerCount={EAGER_TILES} />
            ) : (
              <CardTable hits={shown} tokens={queryResult.tokens} total={hits.length} eagerCount={0} />
            )}
          </div>

          {hasMore && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
              <button
                type="button"
                onClick={showMore}
                className="h-11 rounded-full border border-shadow-500 bg-shadow-900 px-6 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
              >
                Show more cards
              </button>
              <p className="text-xs tabular-nums text-ash-400">
                Showing {visible.toLocaleString("en-US")} of {hits.length.toLocaleString("en-US")}
              </p>
            </div>
          )}

          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </p>
        </section>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        returnFocusRef={filtersButtonRef}
        resultCount={hits.length}
        activeCount={activeCount}
        onClearAll={clearAll}
      >
        {panel}
      </FilterDrawer>
    </>
  );
}
