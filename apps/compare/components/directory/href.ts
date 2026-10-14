import { directoryHref, parseChangeWindow, parseMarketQuery, type SearchParamsRecord } from "@/lib/market/query";
import type { ChangeWindow, MarketQuery } from "@/lib/market/types";

/** Windows offered by the movers switch. The default is left out of URLs. */
export const MOVER_WINDOWS = ["7d", "30d"] as const satisfies readonly ChangeWindow[];
export type MoversWindow = (typeof MOVER_WINDOWS)[number];
export const DEFAULT_MOVERS_WINDOW: MoversWindow = "7d";

export const MOVERS_WINDOW_LABEL: Record<MoversWindow, { short: string; long: string; span: string }> = {
  "7d": { short: "7D", long: "7-day", span: "7 days" },
  "30d": { short: "30D", long: "30-day", span: "30 days" },
};

function isMoversWindow(window: ChangeWindow): window is MoversWindow {
  return (MOVER_WINDOWS as readonly ChangeWindow[]).includes(window);
}

/** `?movers=` value, falling back to the default for anything the switch does not offer. */
export function parseMoversWindow(value: string | string[] | undefined): MoversWindow {
  const window = parseChangeWindow(value, DEFAULT_MOVERS_WINDOW);
  return isMoversWindow(window) ? window : DEFAULT_MOVERS_WINDOW;
}

/** Extra URL params for the movers window (none for the default). */
export function moversParam(movers: MoversWindow): Record<string, string | undefined> {
  return { movers: movers === DEFAULT_MOVERS_WINDOW ? undefined : movers };
}

/** Directory URL for a query plus movers window: the page's single source of truth. */
export function homeHref(query: MarketQuery, movers: MoversWindow): string {
  return directoryHref(query, moversParam(movers));
}

/** The directory state a URL search string describes, parsed exactly as the page parses `searchParams`. */
export function parseDirectorySearch(search: string): { query: MarketQuery; movers: MoversWindow } {
  const params: SearchParamsRecord = {};
  for (const [key, value] of new URLSearchParams(search)) {
    const seen = params[key];
    params[key] = seen === undefined ? value : [...(Array.isArray(seen) ? seen : [seen]), value];
  }
  return { query: parseMarketQuery(params), movers: parseMoversWindow(params.movers) };
}

export function hasActiveFilters(query: MarketQuery): boolean {
  return Boolean(query.q || query.sets?.length || query.rarities?.length || query.finishes?.length);
}

/** Query patch that removes the search and every filter (sort is kept). */
export const CLEAR_FILTERS: Partial<MarketQuery> = {
  q: undefined,
  sets: [],
  rarities: [],
  finishes: [],
  page: 1,
};
