"use client";

import type { ReactNode } from "react";
import { formatDate, formatTimeRange, localDateKey, zoneOffsetMs } from "@/lib/time";
import { useHydrated } from "./use-hydrated";

function viewerZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function viewerLocale(): string {
  const candidate = typeof navigator !== "undefined" ? navigator.language : "en-US";
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(candidate).length ? candidate : "en-US";
  } catch {
    return "en-US";
  }
}

/**
 * The event's times converted to the viewer's own time zone and locale. Depends on
 * the browser environment, so it only renders after hydration.
 */
export function ViewerLocalTime({
  startsAt,
  endsAt,
  venueTimeZone,
}: {
  startsAt: string;
  endsAt: string;
  venueTimeZone: string;
}) {
  const hydrated = useHydrated();

  let content: ReactNode;
  if (!hydrated) {
    content = <span className="mt-1 block h-4 w-44 animate-pulse rounded bg-shadow-700/70" aria-hidden="true" />;
  } else {
    const zone = viewerZone();
    const locale = viewerLocale();
    const sameDay = localDateKey(startsAt, zone) === localDateKey(endsAt, zone);
    const range = formatTimeRange(startsAt, endsAt, zone, locale);
    const label = sameDay
      ? `${formatDate(startsAt, zone, locale, { weekday: "short", month: "short", day: "numeric" })}, ${range}`
      : range;
    // Compare UTC offsets rather than zone names: different zones can share a wall clock.
    const sameClock = [startsAt, endsAt].every(
      (iso) => zoneOffsetMs(new Date(iso), zone) === zoneOffsetMs(new Date(iso), venueTimeZone),
    );
    content = (
      <>
        <span className="block text-sm font-medium text-ash-200">{label}</span>
        {sameClock && <span className="block text-xs text-ash-400">Same as the venue&apos;s local time.</span>}
      </>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ash-400">Your local time</p>
      <div className="mt-1">{content}</div>
    </div>
  );
}
