"use client";

import { Globe } from "lucide-react";
import { cx } from "@/lib/format";
import { formatDate, formatTime, zoneAbbreviation, zoneOffsetMs } from "@/lib/time";
import { useNow } from "@/lib/use-now";

function viewerZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function viewerLocale(): string {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(navigator.language).length ? navigator.language : "en-US";
  } catch {
    return "en-US";
  }
}

/**
 * "Your local time: Sun, Nov 22 · 2:00 AM GMT+8". Depends on the viewer's zone and
 * locale, so it renders a skeleton until mounted.
 */
export function ViewerLocalTime({
  startsAt,
  timeZone,
  className,
}: {
  startsAt: string;
  /** The milestone's own zone, to note when the viewer shares its clock. */
  timeZone: string;
  className?: string;
}) {
  // Only used as a "mounted" signal; a slow tick keeps it cheap.
  const mounted = useNow(60_000) !== null;

  let label: string | null = null;
  let sameClock = false;
  if (mounted) {
    const zone = viewerZone();
    const locale = viewerLocale();
    const date = formatDate(startsAt, zone, locale, { weekday: "short", month: "short", day: "numeric" });
    label = `${date} · ${formatTime(startsAt, zone, locale)} ${zoneAbbreviation(startsAt, zone, locale)}`;
    const instant = new Date(startsAt);
    sameClock = zoneOffsetMs(instant, zone) === zoneOffsetMs(instant, timeZone);
  }

  return (
    <p className={cx("flex items-start gap-2 text-xs leading-5 text-ash-400", className)}>
      <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        Your local time:{" "}
        {label ? (
          <>
            <span className="font-medium text-ash-200">{label}</span>
            {sameClock && <span> (same as venue)</span>}
          </>
        ) : (
          <span aria-hidden="true" className="inline-block h-3 w-32 animate-pulse rounded bg-shadow-700/70 align-middle" />
        )}
      </span>
    </p>
  );
}
