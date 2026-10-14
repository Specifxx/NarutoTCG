import { addDaysToKey } from "@/lib/time";

/**
 * Pure helpers for calendar date keys ("YYYY-MM-DD") and month keys ("YYYY-MM").
 *
 * Labels are built from fixed English name tables instead of Intl so the server
 * and every browser render byte-identical strings (no ICU differences, no
 * dependency on the viewer's time zone).
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Column headers for a Monday-first week. */
export const WEEK_COLUMNS = [
  { short: "Mon", narrow: "M", long: "Monday" },
  { short: "Tue", narrow: "T", long: "Tuesday" },
  { short: "Wed", narrow: "W", long: "Wednesday" },
  { short: "Thu", narrow: "T", long: "Thursday" },
  { short: "Fri", narrow: "F", long: "Friday" },
  { short: "Sat", narrow: "S", long: "Saturday" },
  { short: "Sun", narrow: "S", long: "Sunday" },
] as const;

function parts(key: string): { year: number; month: number; day: number } {
  const [year, month, day = 1] = key.split("-").map(Number);
  return { year, month, day };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key: string): number {
  const { year, month, day } = parts(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function daysInMonth(monthKey: string): number {
  const { year, month } = parts(monthKey);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthKeyOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function addMonths(monthKey: string, delta: number): string {
  const { year, month } = parts(monthKey);
  const t = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`;
}

export function firstDayOfMonth(monthKey: string): string {
  return `${monthKey}-01`;
}

export function lastDayOfMonth(monthKey: string): string {
  return `${monthKey}-${pad(daysInMonth(monthKey))}`;
}

/** The viewer's local calendar date. Call from effects or event handlers only. */
export function localTodayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "November 2026". */
export function monthLabel(monthKey: string): string {
  const { year, month } = parts(monthKey);
  return `${MONTHS[month - 1]} ${year}`;
}

/** "Saturday 21 November 2026". */
export function longDayLabel(dayKey: string): string {
  const { year, month, day } = parts(dayKey);
  return `${WEEKDAY_NAMES[weekdayOf(dayKey)]} ${day} ${MONTHS[month - 1]} ${year}`;
}

/** "Sat, Nov 21" (optionally with ", 2026"). */
export function shortDayLabel(dayKey: string, withYear = false): string {
  const { year, month, day } = parts(dayKey);
  const base = `${WEEKDAY_NAMES[weekdayOf(dayKey)].slice(0, 3)}, ${MONTHS[month - 1].slice(0, 3)} ${day}`;
  return withYear ? `${base}, ${year}` : base;
}

/**
 * Human label for an inclusive venue-local date range. An inverted range (transient
 * while one bound is being edited) is labelled swapped, the way filtering treats it.
 */
export function rangeLabel(from: string | null, to: string | null): string {
  if (from && to && from > to) [from, to] = [to, from];
  if (from && to) {
    if (from === to) return shortDayLabel(from, true);
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${shortDayLabel(from, !sameYear)} – ${shortDayLabel(to, true)}`;
  }
  if (from) return `From ${shortDayLabel(from, true)}`;
  if (to) return `Until ${shortDayLabel(to, true)}`;
  return "Any time";
}

/**
 * Monday-first weeks covering a month, padded with days from the adjacent
 * months so every row has seven cells.
 */
export function monthGrid(monthKey: string): string[][] {
  const first = firstDayOfMonth(monthKey);
  const leading = (weekdayOf(first) + 6) % 7;
  const total = Math.ceil((leading + daysInMonth(monthKey)) / 7) * 7;
  const start = addDaysToKey(first, -leading);
  const weeks: string[][] = [];
  for (let i = 0; i < total; i += 7) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDaysToKey(start, i + d)));
  }
  return weeks;
}

/** Every date key from `from` to `to` inclusive, capped so malformed spans can't run away. */
export function eachDay(from: string, to: string, max = 62): string[] {
  const out: string[] = [];
  for (let key = from; key <= to && out.length < max; key = addDaysToKey(key, 1)) out.push(key);
  return out;
}
