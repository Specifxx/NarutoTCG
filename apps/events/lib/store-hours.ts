import type { OpeningWindow, Weekday, WeeklyHours } from "@naruto-tcg/types";
import { getZonedParts } from "./time";

/**
 * Opening-hours helpers for store pages (pure, no Intl time-zone formatting).
 *
 * Hours are authored as venue-local "HH:mm" windows per weekday ("24:00" may close
 * a day). Clock labels are built by hand rather than with Intl so server and
 * browser output is byte-identical, and so 24-hour locales stay 24-hour
 * (Intl's en-AU default is a 12-hour clock).
 */

/** Display order for tables: Monday first. */
export const WEEK_ORDER: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEKDAY_LABEL: Record<Weekday, { short: string; long: string }> = {
  mon: { short: "Mon", long: "Monday" },
  tue: { short: "Tue", long: "Tuesday" },
  wed: { short: "Wed", long: "Wednesday" },
  thu: { short: "Thu", long: "Thursday" },
  fri: { short: "Fri", long: "Friday" },
  sat: { short: "Sat", long: "Saturday" },
  sun: { short: "Sun", long: "Sunday" },
};

const DAY_MINUTES = 1440;
const WEEK_MINUTES = 7 * DAY_MINUTES;
/** Closing or opening within this many minutes counts as "soon". */
const SOON_MINUTES = 60;

/** Minutes since local midnight for "HH:mm" ("24:00" → 1440). */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Locales that conventionally read a 12-hour clock; everything else gets 24-hour. */
const TWELVE_HOUR_REGIONS = new Set(["US", "CA", "PH", "IN", "PK", "EG", "SA"]);

export function uses12HourClock(locale: string): boolean {
  const parts = locale.split("-");
  const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
  return region === "" ? locale.toLowerCase() === "en" : TWELVE_HOUR_REGIONS.has(region);
}

/**
 * Format a local "HH:mm" clock time: "9:00 PM" (12h) or "21:00" (24h).
 * "24:00" renders as "midnight" on 12-hour clocks and stays "24:00" on 24-hour ones.
 */
export function formatClock(hhmm: string, locale: string): string {
  const total = toMinutes(hhmm);
  const minute = String(total % 60).padStart(2, "0");
  if (!uses12HourClock(locale)) {
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${minute}`;
  }
  if (total === DAY_MINUTES) return "midnight";
  const hour = Math.floor(total / 60) % 24;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${suffix}`;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** "12:00 PM – 9:00 PM" (en-US) or "12:00–21:00" (en-GB, en-AU). */
export function formatHoursWindow([open, close]: OpeningWindow, locale: string): string {
  const from = capitalize(formatClock(open, locale));
  const to = capitalize(formatClock(close, locale));
  return uses12HourClock(locale) ? `${from} – ${to}` : `${from}–${to}`;
}

/** Windows for one day sorted by opening time. */
export function sortedWindows(windows: readonly OpeningWindow[]): OpeningWindow[] {
  return [...windows].sort((a, b) => toMinutes(a[0]) - toMinutes(b[0]));
}

export interface HoursRow {
  day: Weekday;
  label: string;
  shortLabel: string;
  /** Formatted windows, e.g. ["11:00–14:00", "16:00–22:00"]; empty when closed. */
  windows: string[];
  closed: boolean;
}

/** Monday→Sunday rows with pre-formatted windows, ready for a table. */
export function weeklyHoursRows(hours: WeeklyHours, locale: string): HoursRow[] {
  return WEEK_ORDER.map((day) => {
    const windows = sortedWindows(hours[day] ?? []).map((w) => formatHoursWindow(w, locale));
    return {
      day,
      label: WEEKDAY_LABEL[day].long,
      shortLabel: WEEKDAY_LABEL[day].short,
      windows,
      closed: windows.length === 0,
    };
  });
}

/** Whether the store is open at `date`, judged on its own wall clock. */
export function isOpenAt(hours: WeeklyHours, timeZone: string, date: Date): boolean {
  const parts = getZonedParts(date, timeZone);
  const minute = parts.hour * 60 + parts.minute;
  return (hours[parts.weekday] ?? []).some(([open, close]) => toMinutes(open) <= minute && minute < toMinutes(close));
}

type Interval = [start: number, end: number];

/**
 * Opening intervals in "minutes since Monday 00:00" covering the previous, current
 * and next week, with touching windows merged — so "fri 18:00–24:00" followed by
 * "sat 00:00–02:00" becomes one late-night session, including across Sunday→Monday.
 */
function mergedIntervals(hours: WeeklyHours): Interval[] {
  const raw: Interval[] = [];
  for (let week = -1; week <= 1; week++) {
    WEEK_ORDER.forEach((day, index) => {
      for (const [open, close] of hours[day] ?? []) {
        const base = week * WEEK_MINUTES + index * DAY_MINUTES;
        raw.push([base + toMinutes(open), base + toMinutes(close)]);
      }
    });
  }
  raw.sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const interval of raw) {
    const last = merged[merged.length - 1];
    if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
    else merged.push([...interval]);
  }
  return merged;
}

export type OpenState = "open" | "closed" | "unknown";

export interface OpenStatus {
  state: OpenState;
  open: boolean;
  /** Closes (when open) or opens (when closed) within the next hour. */
  soon: boolean;
  /** "Open now", "Closed", "Closed today", "Open 24 hours" or "Hours not listed". */
  headline: string;
  /** "closes 9:00 PM", "opens Tue 12:00 PM"; absent when there is nothing to add. */
  detail?: string;
  /** Headline and detail joined: "Open now · closes 9:00 PM". */
  label: string;
  /** Minutes until the state next changes; null when it never does. */
  minutesUntilChange: number | null;
}

function status(
  state: OpenState,
  headline: string,
  detail: string | undefined,
  minutesUntilChange: number | null,
): OpenStatus {
  return {
    state,
    open: state === "open",
    soon: minutesUntilChange !== null && minutesUntilChange <= SOON_MINUTES,
    headline,
    ...(detail ? { detail } : {}),
    label: detail ? `${headline} · ${detail}` : headline,
    minutesUntilChange,
  };
}

/** Day index (Mon = 0) and "HH:mm" for a minute-of-week; midnight ends the previous day as "24:00". */
function clockAt(minuteOfWeek: number, asClosing: boolean): { dayIndex: number; time: string } {
  let dayIndex = Math.floor(minuteOfWeek / DAY_MINUTES);
  let minute = minuteOfWeek - dayIndex * DAY_MINUTES;
  if (asClosing && minute === 0) {
    dayIndex -= 1;
    minute = DAY_MINUTES;
  }
  const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  return { dayIndex, time };
}

/**
 * Current open/closed state and the next change, phrased for a status line:
 * "Open now · closes 9:00 PM", "Closed · opens Tue 12:00 PM",
 * "Closed today · opens Wed 11:00" or "Hours not listed".
 */
export function nextOpeningChange(hours: WeeklyHours, timeZone: string, date: Date, locale: string): OpenStatus {
  const parts = getZonedParts(date, timeZone);
  const todayIndex = WEEK_ORDER.indexOf(parts.weekday);
  const nowMinute = todayIndex * DAY_MINUTES + parts.hour * 60 + parts.minute;
  const intervals = mergedIntervals(hours);

  if (intervals.length === 0) return status("unknown", "Hours not listed", undefined, null);

  const current = intervals.find(([start, end]) => start <= nowMinute && nowMinute < end);
  if (current) {
    if (current[1] - current[0] >= 2 * WEEK_MINUTES) return status("open", "Open 24 hours", undefined, null);
    const close = clockAt(current[1], true);
    const day = close.dayIndex === todayIndex ? "" : `${WEEKDAY_LABEL[WEEK_ORDER[(close.dayIndex + 7) % 7]].short} `;
    const time = close.time === "24:00" ? "midnight" : formatClock(close.time, locale);
    return status("open", "Open now", `closes ${day}${time}`, current[1] - nowMinute);
  }

  const closedAllDay = (hours[parts.weekday] ?? []).length === 0;
  const next = intervals.find(([start]) => start > nowMinute);
  if (!next) return status("closed", closedAllDay ? "Closed today" : "Closed", undefined, null);

  const open = clockAt(next[0], false);
  const day = open.dayIndex === todayIndex ? "" : `${WEEKDAY_LABEL[WEEK_ORDER[(open.dayIndex + 7) % 7]].short} `;
  return status(
    "closed",
    closedAllDay ? "Closed today" : "Closed",
    `opens ${day}${formatClock(open.time, locale)}`,
    next[0] - nowMinute,
  );
}

const SCHEMA_DAY: Record<Weekday, string> = {
  mon: "https://schema.org/Monday",
  tue: "https://schema.org/Tuesday",
  wed: "https://schema.org/Wednesday",
  thu: "https://schema.org/Thursday",
  fri: "https://schema.org/Friday",
  sat: "https://schema.org/Saturday",
  sun: "https://schema.org/Sunday",
};

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

/**
 * schema.org `openingHoursSpecification`, grouping days that share a window.
 * Closed days are omitted; a "24:00" close is written as "23:59" as search engines expect.
 */
export function toSchemaOrgHours(hours: WeeklyHours): OpeningHoursSpecification[] {
  const groups = new Map<string, OpeningHoursSpecification>();
  for (const day of WEEK_ORDER) {
    for (const [open, close] of sortedWindows(hours[day] ?? [])) {
      const closes = close === "24:00" ? "23:59" : close;
      const key = `${open}-${closes}`;
      const group = groups.get(key);
      if (group) group.dayOfWeek.push(SCHEMA_DAY[day]);
      else groups.set(key, { "@type": "OpeningHoursSpecification", dayOfWeek: [SCHEMA_DAY[day]], opens: open, closes });
    }
  }
  return [...groups.values()];
}
