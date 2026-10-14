"use client";

import { CalendarPlus, RotateCcw, Scan, SearchX } from "lucide-react";
import Link from "next/link";
import { focusRing } from "@/components/directory/shared";
import { cx } from "@/lib/format";
import { button } from "@/lib/styles";

/** Inner shadow and edge fades that frame the map like an old scroll. Purely decorative. */
export function MapVignette() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[450]">
      <div className="absolute inset-0 shadow-[inset_0_0_70px_14px_rgb(7_7_11/0.85)]" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-shadow-950/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-shadow-950/60 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-chakra-500/25 to-transparent" />
    </div>
  );
}

export function FitResultsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Zoom the map to show every result"
      className={cx(
        "pointer-events-auto absolute left-3 top-3 z-[1000] inline-flex h-9 items-center gap-2 rounded-lg border border-shadow-700/80 bg-shadow-950/80 px-3 text-xs font-semibold text-ash-200 shadow-xl shadow-black/50 backdrop-blur-md transition-colors hover:border-chakra-500/60 hover:text-chakra-400",
        focusRing,
      )}
    >
      <Scan className="h-4 w-4 text-chakra-400" aria-hidden="true" />
      Fit results
    </button>
  );
}

/** Shown over the map when no venue matches; mirrors the directory's recovery actions. */
export function EmptyMapOverlay({ hasActiveFilters, onReset }: { hasActiveFilters: boolean; onReset: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-xs rounded-2xl border border-shadow-700/80 bg-shadow-950/85 p-5 text-center shadow-2xl shadow-black/70 backdrop-blur-md">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-chakra-500/30 bg-chakra-500/10 text-chakra-400">
          {hasActiveFilters ? (
            <SearchX className="h-5 w-5" aria-hidden="true" />
          ) : (
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <p className="mt-3 text-sm font-semibold text-white">
          {hasActiveFilters ? "No events match these filters" : "No upcoming events on the map yet"}
        </p>
        <p className="mt-1 text-xs text-ash-400">
          {hasActiveFilters
            ? "Try a wider radius, other dates or fewer event types."
            : "New demo days and tournaments are added every week."}
        </p>
        <div className="mt-4">
          {hasActiveFilters ? (
            <button type="button" onClick={onReset} className={cx(button.primary, "w-full")}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          ) : (
            <Link href="/events/submit" className={cx(button.primary, "w-full")}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Submit an event
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
