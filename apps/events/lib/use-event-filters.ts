"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_FILTERS, parseEventFilters, serializeEventFilters, type EventFilters } from "./filters";

type Patch = Partial<EventFilters> | ((current: EventFilters) => Partial<EventFilters>);

/**
 * URL-backed filter state for the event directory and map.
 *
 * Updates use `window.history.replaceState`, which Next.js syncs into
 * `useSearchParams` without a server round-trip, so filtering stays instant.
 * Must be rendered inside a `<Suspense>` boundary when the page is statically rendered.
 */
export function useEventFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const filters = useMemo(() => parseEventFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (patch: Patch) => {
      const current = parseEventFilters(new URLSearchParams(window.location.search));
      const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
      const qs = serializeEventFilters(next);
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  /** Clear narrowing filters but keep presentation choices (view, unit, month). */
  const resetFilters = useCallback(() => {
    setFilters((current) => ({
      ...DEFAULT_FILTERS,
      view: current.view,
      unit: current.unit,
      month: current.month,
    }));
  }, [setFilters]);

  /** Build a link to another view (e.g. "/events/map") carrying the current filters. */
  const hrefWithFilters = useCallback(
    (path: string, overrides: Partial<EventFilters> = {}) => {
      const qs = serializeEventFilters({ ...filters, ...overrides });
      return qs ? `${path}?${qs}` : path;
    },
    [filters],
  );

  return { filters, setFilters, resetFilters, hrefWithFilters };
}
