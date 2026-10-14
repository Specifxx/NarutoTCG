"use client";

// Browser state (filters, sort, view) synced with the /cards URL contract.
//
// The server renders the unfiltered default so the static HTML always matches
// the first client render. After mount the URL (and the stored view
// preference) is applied, and later changes are written back with
// history.replaceState — no navigation, no new history entries.
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_STATE,
  URL_PARAMS,
  URL_PARAM_KEYS,
  VIEW_MODES,
  stateFromSearchParams,
  toQueryString,
  type BrowserState,
  type CardFilters,
  type SortKey,
  type ViewMode,
} from "@/lib/search";

const VIEW_STORAGE_KEY = "naruto-tcg:cards:view";
/** Debounce for URL writes so typing doesn't spam history.replaceState. */
const URL_WRITE_DELAY_MS = 300;

function readStoredView(): ViewMode | null {
  try {
    const value = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEW_MODES.find((mode) => mode === value) ?? null;
  } catch {
    return null;
  }
}

function storeView(view: ViewMode): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Storage blocked (private mode): the URL still carries the view.
  }
}

function readLocation(setIds: readonly string[]): BrowserState {
  const params = new URLSearchParams(window.location.search);
  const state = stateFromSearchParams(params, { setIds });
  if (params.has(URL_PARAMS.view)) return state;
  return { ...state, view: readStoredView() ?? state.view };
}

/** Our contract params plus any foreign params (e.g. utm_*) left untouched. */
function buildSearch(state: BrowserState): string {
  const foreign = new URLSearchParams(window.location.search);
  for (const key of URL_PARAM_KEYS) foreign.delete(key);
  const own = toQueryString(state);
  const rest = foreign.toString();
  if (rest === "") return own;
  return own === "" ? `?${rest}` : `${own}&${rest}`;
}

export interface BrowserStateApi {
  state: BrowserState;
  /** True once the URL has been applied (always false during SSR). */
  hydrated: boolean;
  setFilters: (update: (filters: CardFilters) => CardFilters) => void;
  setQuery: (query: string) => void;
  setSort: (sort: SortKey) => void;
  setView: (view: ViewMode) => void;
}

export function useBrowserState(setIds: readonly string[]): BrowserStateApi {
  const [state, setState] = useState<BrowserState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Apply the URL after mount and whenever the user goes back/forward.
  useEffect(() => {
    setState(readLocation(setIds));
    setHydrated(true);
    const onPopState = () => setState(readLocation(setIds));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setIds]);

  // Mirror state into the URL.
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const search = buildSearch(state);
      if (search === window.location.search) return;
      // `null` lets Next.js keep its own history state and sync its router.
      window.history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
    }, URL_WRITE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hydrated, state]);

  const setFilters = useCallback((update: (filters: CardFilters) => CardFilters) => {
    setState((prev) => {
      const filters = update(prev.filters);
      return filters === prev.filters ? prev : { ...prev, filters };
    });
  }, []);

  const setQuery = useCallback(
    (query: string) => setFilters((filters) => (filters.query === query ? filters : { ...filters, query })),
    [setFilters],
  );

  const setSort = useCallback((sort: SortKey) => setState((prev) => (prev.sort === sort ? prev : { ...prev, sort })), []);

  const setView = useCallback((view: ViewMode) => {
    storeView(view);
    setState((prev) => (prev.view === view ? prev : { ...prev, view }));
  }, []);

  return { state, hydrated, setFilters, setQuery, setSort, setView };
}
