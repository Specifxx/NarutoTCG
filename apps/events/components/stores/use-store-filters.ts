"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  DEFAULT_STORE_FILTERS,
  parseStoreFilters,
  serializeStoreFilters,
  type StoreFilters,
} from "./store-filters";

type Patch = Partial<StoreFilters> | ((current: StoreFilters) => Partial<StoreFilters>);

/**
 * URL-backed store locator filters. Writes go through `history.replaceState`,
 * which Next.js mirrors into `useSearchParams` without a server round-trip.
 * Render inside `<Suspense>` so the page stays statically renderable.
 */
export function useStoreFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const filters = useMemo(() => parseStoreFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (patch: Patch) => {
      // Read the live URL so rapid successive patches never overwrite each other.
      const current = parseStoreFilters(new URLSearchParams(window.location.search));
      const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
      if (next.sort === "distance" && (next.lat === null || next.lng === null)) next.sort = "name";
      const qs = serializeStoreFilters(next);
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  /** Clear narrowing filters; keep the distance unit and verified-only default. */
  const resetFilters = useCallback(() => {
    setFilters((current) => ({ ...DEFAULT_STORE_FILTERS, unit: current.unit }));
  }, [setFilters]);

  return { filters, setFilters, resetFilters };
}
