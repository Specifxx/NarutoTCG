// Pure, client-safe helpers for reveal (spoiler) data. Pages pass in data from
// lib/data.ts; nothing here touches the dataset directly.
import type { CardPrinting, CardSet, ChakraElement, NarutoCard } from "@naruto-tcg/types";
import { compareCollectorNumbers, daysBetween, parseIsoDate, primaryPrinting } from "@/lib/meta";

/** A card counts as "NEW" when revealed within this many days up to today. */
export const NEW_REVEAL_WINDOW_DAYS = 7;

/** Longest stretch of days the reveal timeline draws before it trims older days. */
export const TIMELINE_MAX_DAYS = 42;

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Oct 13" */
export function formatMonthDay(iso: string): string {
  return MONTH_DAY.format(parseIsoDate(iso));
}

/** "Tue, Oct 13" */
export function formatWeekdayMonthDay(iso: string): string {
  return WEEKDAY_MONTH_DAY.format(parseIsoDate(iso));
}

/** ISO date `days` calendar days after `iso` (negative goes back). */
export function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

/** Most recent reveal date across `cards`, if any card has one. */
export function latestRevealDate(cards: readonly NarutoCard[]): string | undefined {
  let latest: string | undefined;
  for (const card of cards) {
    const date = card.reveal?.date;
    if (date !== undefined && (latest === undefined || date > latest)) latest = date;
  }
  return latest;
}

/**
 * True when `date` falls inside the NEW window that ends on `asOf` (inclusive).
 * Pages pass `todayIso()`, so the label expires even when reveals stop coming.
 */
export function isNewReveal(date: string | undefined, asOf: string | undefined): boolean {
  if (date === undefined || asOf === undefined) return false;
  const age = daysBetween(date, asOf);
  return age >= 0 && age < NEW_REVEAL_WINDOW_DAYS;
}

export interface RevealDay {
  /** ISO date shared by every card in the group. */
  date: string;
  cards: NarutoCard[];
}

/**
 * Groups revealed cards by reveal date, newest date first. Cards keep their
 * incoming order within a day (getRevealedCards() sorts by collector number).
 */
export function groupByRevealDate(cards: readonly NarutoCard[]): RevealDay[] {
  const byDate = new Map<string, RevealDay>();
  for (const card of cards) {
    const date = card.reveal?.date;
    if (date === undefined) continue;
    const group = byDate.get(date);
    if (group) group.cards.push(card);
    else byDate.set(date, { date, cards: [card] });
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Keeps whole days, newest first, until adding another day would exceed
 * `limit` cards (the first day is always kept). Bounds the size of the
 * statically rendered feed when the dataset keeps reveals for old sets.
 */
export function limitRevealDays(days: readonly RevealDay[], limit: number): { shown: RevealDay[]; omitted: number } {
  const shown: RevealDay[] = [];
  let count = 0;
  let omitted = 0;
  for (const day of days) {
    if (shown.length === 0 || (omitted === 0 && count + day.cards.length <= limit)) {
      shown.push(day);
      count += day.cards.length;
    } else {
      omitted += day.cards.length;
    }
  }
  return { shown, omitted };
}

export interface DayCount {
  date: string;
  count: number;
}

export interface RevealTimelineData {
  /** One entry per calendar day, oldest first, including days without reveals. */
  days: DayCount[];
  /** Reveals inside the drawn window. */
  total: number;
  /** Highest single-day count inside the window (0 when empty). */
  peak: number;
  /** Most recent day that reached `peak`. */
  peakDate?: string;
  /** True when older days were trimmed to fit `maxDays`. */
  trimmed: boolean;
}

/** Cards revealed per calendar day, ending on the latest reveal. */
export function revealTimeline(cards: readonly NarutoCard[], maxDays = TIMELINE_MAX_DAYS): RevealTimelineData {
  const counts = new Map<string, number>();
  let first: string | undefined;
  let last: string | undefined;
  for (const card of cards) {
    const date = card.reveal?.date;
    if (date === undefined) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
    if (first === undefined || date < first) first = date;
    if (last === undefined || date > last) last = date;
  }
  if (first === undefined || last === undefined) return { days: [], total: 0, peak: 0, trimmed: false };

  const span = daysBetween(first, last) + 1;
  const length = Math.max(1, Math.min(span, maxDays));
  const start = addDaysIso(last, -(length - 1));
  const days: DayCount[] = [];
  let total = 0;
  let peak = 0;
  let peakDate: string | undefined;
  for (let i = 0; i < length; i++) {
    const date = addDaysIso(start, i);
    const count = counts.get(date) ?? 0;
    days.push({ date, count });
    total += count;
    if (count > 0 && count >= peak) {
      peak = count;
      peakDate = date;
    }
  }
  return { days, total, peak, ...(peakDate !== undefined && { peakDate }), trimmed: span > length };
}

/** Minimal shape of a set entry; matches `SetEntry` from lib/data.ts structurally. */
export interface SetEntryLike {
  card: NarutoCard;
  printing: CardPrinting;
  key: string;
}

export interface SetSummary {
  /** Distinct collector numbers known in the dataset for this set. */
  knownNumbers: number;
  /** Every known printing (parallels and alt-arts included). */
  printings: number;
  /** `knownNumbers / set.totalCards`, clamped to 0–1. */
  completion: number;
  /** Most recent reveal date among cards that debut in the set (reprints excluded). */
  latestReveal?: string;
  /** Collection keys for every printing in the set. */
  keys: string[];
}

/**
 * Summarises a set's known contents. For unreleased sets every known collector
 * number has, by definition, been revealed, so `knownNumbers` doubles as the
 * spoiler-season "revealed" count.
 */
export function summarizeSet(set: Pick<CardSet, "totalCards">, entries: readonly SetEntryLike[]): SetSummary {
  const numbers = new Set<string>();
  let latestReveal: string | undefined;
  for (const entry of entries) {
    numbers.add(entry.printing.number);
    // `reveal` is card-level and belongs to the debut set. Compare set ids, not
    // printings, so a debut set's own parallels still count.
    const date = entry.printing.setId === primaryPrinting(entry.card).setId ? entry.card.reveal?.date : undefined;
    if (date !== undefined && (latestReveal === undefined || date > latestReveal)) latestReveal = date;
  }
  const knownNumbers = numbers.size;
  return {
    knownNumbers,
    printings: entries.length,
    completion: set.totalCards > 0 ? Math.min(1, knownNumbers / set.totalCards) : 0,
    ...(latestReveal !== undefined && { latestReveal }),
    keys: entries.map((entry) => entry.key),
  };
}

/** Up to `limit` distinct cards from a set's entries, rarest printing first, for preview art. */
export function showcaseEntries<T extends SetEntryLike>(
  entries: readonly T[],
  rank: (entry: T) => number,
  limit = 3,
): T[] {
  const best = new Map<string, T>();
  for (const entry of entries) {
    const current = best.get(entry.card.id);
    if (!current || rank(entry) > rank(current)) best.set(entry.card.id, entry);
  }
  return [...best.values()]
    .sort((a, b) => rank(b) - rank(a) || compareCollectorNumbers(a.printing.number, b.printing.number))
    .slice(0, limit);
}

/** Serializable filter key for one feed item: its debut set and element. */
export interface FeedKey {
  set: string;
  element: ChakraElement;
}
