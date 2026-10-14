import type { EventLocation, EventTier } from "@naruto-tcg/types";

export { TIER_LABELS as EVENT_TIER_LABEL } from "@/lib/meta/config";

// Fixed locale and UTC so server and client render identical strings (no hydration drift).
const DATE = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
const SHORT_DATE = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const NUMBER = new Intl.NumberFormat("en-US");

export const EVENT_TIER_SHORT: Record<EventTier, string> = {
  "store-championship": "Store",
  "online-open": "Online",
  "regional-championship": "Regional",
  "national-championship": "Nationals",
};

/** Event tiers from most to least prestigious. */
export const EVENT_TIER_ORDER: readonly EventTier[] = [
  "national-championship",
  "regional-championship",
  "online-open",
  "store-championship",
];

function toDate(iso: string): Date | null {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "May 30, 2026" */
export function formatDate(iso: string): string {
  const date = toDate(iso);
  return date ? DATE.format(date) : iso;
}

/** "May 30" */
export function formatShortDate(iso: string): string {
  const date = toDate(iso);
  return date ? SHORT_DATE.format(date) : iso;
}

/** 0.5234 → "52.3%"; null/undefined/NaN → "—". */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** Signed percentage-point delta: 0.021 → "+2.1 pts". */
export function formatPointDelta(delta: number, digits = 1): string {
  const points = delta * 100;
  const rounded = Number(points.toFixed(digits));
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : "±"}${Math.abs(rounded).toFixed(digits)} pts`;
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

export function formatLocation(location: EventLocation): string {
  if (location.online) return "Online";
  return [location.city, location.region, location.country].filter(Boolean).join(", ") || "—";
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
