"use client";

import type { WeeklyHours } from "@naruto-tcg/types";
import { Clock } from "lucide-react";
import { cx } from "@/lib/format";
import { formatClock, nextOpeningChange, type OpenStatus } from "@/lib/store-hours";
import { getZonedParts, zoneAbbreviation } from "@/lib/time";
import { useNow } from "@/lib/use-now";

interface HoursSource {
  hours: WeeklyHours;
  timeZone: string;
  /** Store display locale (12h vs 24h clock). */
  locale: string;
}

function tone(status: OpenStatus): { pill: string; text: string; dot: string } {
  if (status.state === "unknown") {
    return { pill: "border-shadow-500 bg-shadow-800", text: "text-ash-400", dot: "bg-ash-400" };
  }
  if (status.open && status.soon) {
    return { pill: "border-amber-400/50 bg-amber-500/10", text: "text-amber-300", dot: "bg-amber-400" };
  }
  if (status.open) {
    return { pill: "border-emerald-400/40 bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-400" };
  }
  return { pill: "border-rose-400/40 bg-rose-500/10", text: "text-rose-300", dot: "bg-rose-400" };
}

/** Short headline for compact pills: "Open now", "Closes soon", "Opens soon", "Closed". */
function pillText(status: OpenStatus): string {
  if (status.open) return status.soon ? "Closes soon" : status.headline;
  if (status.state === "closed" && status.soon) return "Opens soon";
  return status.state === "unknown" ? "Hours n/a" : "Closed";
}

/**
 * Compact open/closed pill for store cards. Depends on the viewer's clock, so it
 * renders a neutral placeholder on the server and first client render.
 */
export function StoreOpenPill({ hours, timeZone, locale, className }: HoursSource & { className?: string }) {
  const now = useNow(60_000);
  const base = "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold whitespace-nowrap";

  if (!now) {
    return (
      <span className={cx(base, "border-shadow-700 bg-shadow-800/60 text-ash-400", className)} aria-hidden="true">
        <Clock className="h-3 w-3" />
        Hours
      </span>
    );
  }

  const status = nextOpeningChange(hours, timeZone, now, locale);
  const colours = tone(status);
  return (
    <span className={cx(base, colours.pill, colours.text, className)} title={status.label}>
      <span className={cx("h-1.5 w-1.5 rounded-full", colours.dot)} aria-hidden="true" />
      <span aria-hidden="true">{pillText(status)}</span>
      <span className="sr-only">{status.label}</span>
    </span>
  );
}

/**
 * Live status line for the store page: "Open now · closes 9:00 PM" plus the
 * store's current local time, refreshed every 30 seconds.
 */
export function StoreLiveStatus({
  hours,
  timeZone,
  locale,
  city,
  className,
}: HoursSource & { city: string; className?: string }) {
  const now = useNow(30_000);

  if (!now) {
    return (
      <div className={cx("flex min-h-12 items-center gap-3", className)} aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-shadow-700" />
        <span className="h-4 w-48 max-w-full animate-pulse rounded bg-shadow-800" />
      </div>
    );
  }

  const status = nextOpeningChange(hours, timeZone, now, locale);
  const colours = tone(status);
  const parts = getZonedParts(now, timeZone);
  const clock = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;

  return (
    <div className={cx("flex min-h-12 items-start gap-3", className)}>
      <span className="relative mt-1.5 flex h-3 w-3 shrink-0" aria-hidden="true">
        {status.open && (
          <span className={cx("absolute inset-0 animate-ping rounded-full opacity-60", colours.dot)} />
        )}
        <span className={cx("relative h-3 w-3 rounded-full", colours.dot)} />
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold text-white">
          <span className={colours.text}>{status.headline}</span>
          {status.detail && <span className="font-normal text-ash-200"> · {status.detail}</span>}
        </p>
        <p className="mt-0.5 text-sm text-ash-400">
          Local time in {city}:{" "}
          <time className="tabular-nums text-ash-200" dateTime={now.toISOString()}>
            {formatClock(clock, locale)} {zoneAbbreviation(now, timeZone, locale)}
          </time>
        </p>
      </div>
    </div>
  );
}
