import type { EventFilters } from "@/lib/filters";
import type { useEventFilters } from "@/lib/use-event-filters";

export type SetFilters = ReturnType<typeof useEventFilters>["setFilters"];

/** Props shared by every control inside the filter bar. */
export interface FilterControlProps {
  filters: EventFilters;
  setFilters: SetFilters;
}

/** Anchor for the results column; the filter bar scrolls here after "Show N events" on mobile. */
export const DIRECTORY_RESULTS_ID = "event-results";

/** Wrapper around the whole directory (filters + results); quick-filter links scroll here. */
export const DIRECTORY_ANCHOR_ID = "directory";

/** Focus ring recipe matching `lib/styles.ts`, for bespoke controls. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950";

/** Small uppercase group label used for fieldset legends. */
export const groupLabel = "text-[11px] font-semibold uppercase tracking-[0.14em] text-ash-400";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
