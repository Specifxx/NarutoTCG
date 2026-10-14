"use client";

import type { NarutoCard } from "@naruto-tcg/types";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DEFAULT_STATE,
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
import { useAnnouncement, useProgressiveList } from "./hooks";
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
export function CardBrowser({
  cards,
  sets,
  newIds,
}: {
  cards: readonly BrowserCard[];
  sets: readonly BrowserSet[];
  /** IDs of recently revealed cards, computed on the server against today. */
  newIds: readonly string[];
}) {
  const index = useMemo(() => buildSearchIndex(cards, sets), [cards, sets]);
  const setsInOrder = useMemo(() => {
    const byId = new Map(sets.map((set) => [set.id, set]));
    return index.setIds.flatMap((id) => byId.get(id) ?? []);
  }, [index.setIds, sets]);
  const newSet = useMemo(() => new Set(newIds), [newIds]);

  const { state, hydrated, setFilters, setQuery, setSort, setView } = useBrowserState(index.setIds);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Controls update immediately; results render from the deferred copy so
  // typing and toggling never wait on a large re-render. The URL state applied
  // on mount is the exception: deferring it would paint the default results
  // (and start loading their art) before the real ones.
  const deferredState = useDeferredValue(state);
  const deferred = hydrated && deferredState === DEFAULT_STATE ? state : deferredState;
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
  // Buttons that disappear once used hand focus to the search input. Not part
  // of clearAll itself: the filter drawer uses that and keeps its own focus.
  const clearAllAndFocus = useCallback(() => {
    clearAll();
    searchRef.current?.focus();
  }, [clearAll]);
  const clearFacetsAndFocus = useCallback(() => {
    clearFacets();
    searchRef.current?.focus();
  }, [clearFacets]);
  const onSuggest = useCallback(
    (query: string) => {
      setFilters(() => ({ ...EMPTY_FILTERS, query }));
      searchRef.current?.focus();
    },
    [setFilters],
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // "Show more" disappears with the last page; focus then moves to the first new result.
  const pendingFocus = useRef<number | null>(null);
  const onShowMore = () => {
    pendingFocus.current = visible;
    showMore();
  };
  useEffect(() => {
    const first = pendingFocus.current;
    if (first === null) return;
    pendingFocus.current = null;
    // One card link per tile or row, so the link at `first` starts the new page.
    if (!hasMore) resultsRef.current?.querySelectorAll<HTMLElement>('a[href^="/card/"]')[first]?.focus();
  }, [visible, hasMore]);

  const activeCount = activeFacetCount(state.filters);
  const announcement = useAnnouncement(
    `${hits.length.toLocaleString("en-US")} ${hits.length === 1 ? "card" : "cards"} found`,
    hydrated,
    700,
  );
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
                  onClick={clearAllAndFocus}
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
            ref={resultsRef}
            aria-busy={stale}
            // Dim only when results lag noticeably, so fast typing doesn't flicker.
            className={`${styles.pending} ${styles.pendingResults} mt-5 transition-opacity duration-200 motion-reduce:transition-none ${stale ? "opacity-60 delay-150" : "delay-0"}`}
          >
            {hits.length === 0 ? (
              <EmptyState
                query={deferred.filters.query}
                facetCount={activeFacetCount(deferred.filters)}
                datasetEmpty={index.entries.length === 0}
                suggestions={suggestions}
                onClearAll={clearAllAndFocus}
                onClearFacets={clearFacetsAndFocus}
                onSuggest={onSuggest}
              />
            ) : deferred.view === "grid" ? (
              <CardGrid hits={shown} tokens={queryResult.tokens} eagerCount={EAGER_TILES} newIds={newSet} />
            ) : (
              <CardTable hits={shown} tokens={queryResult.tokens} total={hits.length} eagerCount={0} />
            )}
          </div>

          {hasMore && (
            <div className={`${styles.pending} mt-10 flex flex-col items-center gap-3`}>
              <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
              <button
                type="button"
                onClick={onShowMore}
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
