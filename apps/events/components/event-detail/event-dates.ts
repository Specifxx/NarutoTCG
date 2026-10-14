import type { TcgEvent } from "@naruto-tcg/types";
import {
  formatDate,
  formatDateSpan,
  formatTime,
  formatTimeRange,
  getZonedParts,
  localDateKey,
  localeForRegion,
  zoneAbbreviation,
  zoneOffsetMs,
} from "@/lib/time";

/** Venue-local labels for the event page. Server-only by convention: never format these on the client. */
export interface EventDateLabels {
  /** "Sat, Nov 14, 2026" or "Fri, Oct 23 – Sun, Oct 25, 2026". */
  dateSpan: string;
  /** "11:00 AM – 7:00 PM GMT" (multi-day ranges include the dates). */
  timeRange: string;
  /** Hero time line: same as `timeRange` for single-day events, "10:00 AM Sat – 6:00 PM Sun PST" otherwise. */
  timeLine: string;
  /** "Thursday" — used to describe weekly series. */
  weekdayLong: string;
  /** "Thu, Oct 1, 10:00 BST" — when registration opens, if scheduled. */
  opens?: string;
  /** When registration closes (defaults to the start time). */
  closes: string;
}

export function eventDateLabels(event: TcgEvent): EventDateLabels {
  const locale = localeForRegion(event.region);
  const tz = event.timeZone;
  const moment = (iso: string) =>
    `${formatDate(iso, tz, locale, { weekday: "short", month: "short", day: "numeric" })}, ${formatTime(iso, tz, locale, true)}`;
  const timeRange = formatTimeRange(event.startsAt, event.endsAt, tz, locale);
  const multiDay = localDateKey(event.startsAt, tz) !== localDateKey(event.endsAt, tz);
  const clock = (iso: string) => `${formatTime(iso, tz, locale)} ${formatDate(iso, tz, locale, { weekday: "short" })}`;
  return {
    dateSpan: formatDateSpan(event.startsAt, event.endsAt, tz, locale),
    timeRange,
    timeLine: multiDay
      ? `${clock(event.startsAt)} – ${clock(event.endsAt)} ${zoneAbbreviation(event.endsAt, tz, locale)}`
      : timeRange,
    weekdayLong: formatDate(event.startsAt, tz, "en-US", { weekday: "long" }),
    ...(event.registration.opensAt ? { opens: moment(event.registration.opensAt) } : {}),
    closes: moment(event.registration.closesAt ?? event.startsAt),
  };
}

/** ISO 8601 with the venue's UTC offset, e.g. "2026-11-14T11:00:00+00:00" (preferred by schema.org consumers). */
export function isoWithOffset(instant: string, timeZone: string): string {
  const date = new Date(instant);
  const p = getZonedParts(date, timeZone);
  const offsetMinutes = Math.round(zoneOffsetMs(date, timeZone) / 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
