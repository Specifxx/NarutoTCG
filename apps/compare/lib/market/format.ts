import type { CurrencyCode, IsoDay } from "./types";

const LOCALE = "en-US";
const moneyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

function moneyFormatter(currency: CurrencyCode): Intl.NumberFormat {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    moneyFormatters.set(currency, formatter);
  }
  return formatter;
}

export const EMPTY = "—";

export function formatMoney(amount: number | null | undefined, currency: CurrencyCode = "USD"): string {
  return amount == null || !Number.isFinite(amount) ? EMPTY : moneyFormatter(currency).format(amount);
}

export function formatUsd(amount: number | null | undefined): string {
  return formatMoney(amount, "USD");
}

/** Signed money delta, e.g. "+$1.20" / "−$0.40". */
export function formatSignedUsd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return EMPTY;
  if (amount === 0) return formatUsd(0);
  return `${amount > 0 ? "+" : "−"}${formatUsd(Math.abs(amount))}`;
}

/** Signed percent with one decimal, e.g. "+12.4%" / "−3.0%". Values under 0.05% read as "0.0%". */
export function formatPct(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return EMPTY;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return "0.0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}%`;
}

const dayFormatter = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: "UTC" });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

/** "Oct 14, 2026" */
export function formatDay(day: IsoDay | null | undefined): string {
  return day ? dayFormatter.format(new Date(`${day}T00:00:00Z`)) : EMPTY;
}

/** "Oct 14" */
export function formatShortDay(day: IsoDay): string {
  return shortDayFormatter.format(new Date(`${day}T00:00:00Z`));
}

/** "Oct 14, 3:05 PM UTC" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? EMPTY : dateTimeFormatter.format(date);
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return EMPTY;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return EMPTY;
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function formatCount(n: number): string {
  return n.toLocaleString(LOCALE);
}
