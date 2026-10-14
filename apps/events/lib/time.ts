import type { Region, Weekday } from "@naruto-tcg/types";

/**
 * Time-zone aware helpers built on Intl only (no date library).
 *
 * Venue times are authored as local wall-clock strings ("2026-10-24T11:00") plus an
 * IANA zone and converted to UTC instants here. Rendering always passes the venue's
 * zone explicitly, so output is deterministic regardless of the machine's zone.
 */

const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: Weekday;
}

/** Wall-clock components of an instant in the given zone. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const out: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    // Some engines still report midnight as "24" even with h23.
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: out.weekday.slice(0, 3).toLowerCase() as Weekday,
  };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds (e.g. -7h for PDT). */
export function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isLocalDateTime(value: string): boolean {
  const m = LOCAL_DATETIME.exec(value);
  if (!m) return false;
  const [, y, mo, d, h, mi] = m.map(Number);
  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d && h < 24 && mi < 60;
}

export function isLocalDate(value: string): boolean {
  const m = LOCAL_DATE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

/**
 * Convert a venue-local wall-clock time ("YYYY-MM-DDTHH:mm") to a UTC instant.
 * Times inside a DST gap or overlap resolve to an adjacent valid instant.
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const m = LOCAL_DATETIME.exec(local);
  if (!m) throw new Error(`Expected local date-time "YYYY-MM-DDTHH:mm", got "${local}"`);
  const [, y, mo, d, h, mi] = m.map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const firstGuess = wall - zoneOffsetMs(new Date(wall), timeZone);
  const offset = zoneOffsetMs(new Date(firstGuess), timeZone);
  return new Date(wall - offset);
}

/** Calendar date ("YYYY-MM-DD") of an instant as seen in `timeZone`. */
export function localDateKey(instant: string | Date, timeZone: string): string {
  const p = getZonedParts(typeof instant === "string" ? new Date(instant) : instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "HH:mm" wall-clock time of an instant in `timeZone`. */
export function localTimeKey(instant: string | Date, timeZone: string): string {
  const p = getZonedParts(typeof instant === "string" ? new Date(instant) : instant, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Add whole days to a "YYYY-MM-DD" key. */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Display locale for a region; keeps 12h clocks for North America and 24h for Europe. */
export function localeForRegion(region: Region): string {
  switch (region) {
    case "north-america":
      return "en-US";
    case "oceania":
      return "en-AU";
    default:
      return "en-GB";
  }
}

/**
 * Intl output differs between ICU versions in whitespace only (narrow no-break spaces
 * before AM/PM, thin spaces around range dashes). Normalise so server- and
 * browser-rendered strings match.
 */
export function normalizeSpaces(value: string): string {
  return value.replace(/[   ]/g, " ");
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function dtf(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, f);
  }
  return f;
}

export function formatDate(
  instant: string | Date,
  timeZone: string,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" },
): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return normalizeSpaces(dtf(locale, { ...options, timeZone }).format(date));
}

export function formatTime(instant: string | Date, timeZone: string, locale = "en-US", withZone = false): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return normalizeSpaces(
    dtf(locale, { hour: "numeric", minute: "2-digit", timeZone, ...(withZone ? { timeZoneName: "short" } : {}) }).format(
      date,
    ),
  );
}

/** Short zone name such as "PDT", "CEST" or "AEDT" (falls back to "GMT+11" style). */
export function zoneAbbreviation(instant: string | Date, timeZone: string, locale = "en-US"): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const part = dtf(locale, { timeZone, timeZoneName: "short", hour: "numeric" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/**
 * Human range for an event, e.g. "11:00 AM – 5:00 PM PDT" for a single day or
 * "Fri, Oct 23, 10:00 AM – Sun, Oct 25, 6:00 PM PDT" when it spans days.
 */
export function formatTimeRange(startsAt: string, endsAt: string, timeZone: string, locale = "en-US"): string {
  const sameDay = localDateKey(startsAt, timeZone) === localDateKey(endsAt, timeZone);
  const zone = zoneAbbreviation(endsAt, timeZone, locale);
  if (sameDay) {
    return `${formatTime(startsAt, timeZone, locale)} – ${formatTime(endsAt, timeZone, locale)} ${zone}`;
  }
  const dayOpts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return `${formatDate(startsAt, timeZone, locale, dayOpts)}, ${formatTime(startsAt, timeZone, locale)} – ${formatDate(
    endsAt,
    timeZone,
    locale,
    dayOpts,
  )}, ${formatTime(endsAt, timeZone, locale)} ${zone}`;
}

/** Date label covering multi-day events, e.g. "Sat, Oct 24, 2026" or "Fri, Oct 23 – Sun, Oct 25, 2026". */
export function formatDateSpan(startsAt: string, endsAt: string, timeZone: string, locale = "en-US"): string {
  const startKey = localDateKey(startsAt, timeZone);
  const endKey = localDateKey(endsAt, timeZone);
  if (startKey === endKey) return formatDate(startsAt, timeZone, locale);
  const sameYear = startKey.slice(0, 4) === endKey.slice(0, 4);
  const startLabel = formatDate(startsAt, timeZone, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${startLabel} – ${formatDate(endsAt, timeZone, locale)}`;
}

/** Remaining time split into units, clamped at zero. */
export function splitDuration(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Compact relative label: "in 3 days", "in 5 hours", "2 days ago", "now". */
export function formatRelative(target: Date | string, now: Date): string {
  const t = typeof target === "string" ? new Date(target) : target;
  const diff = t.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 86_400_000],
    ["month", 30 * 86_400_000],
    ["week", 7 * 86_400_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, size] of units) {
    if (abs >= size) return rtf.format(Math.round(diff / size), unit);
  }
  return "now";
}
