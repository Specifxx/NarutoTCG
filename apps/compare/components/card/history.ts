import { roundMoney } from "@/lib/market/analytics";
import { CHANGE_WINDOW_DAYS } from "@/lib/market/constants";
import type { ChangeWindow, IsoDay, PriceChange, PricePoint, VendorId } from "@/lib/market/types";
import { MARKET_SERIES_COLOR, VENDOR_ORDER, VENDORS } from "@/lib/market/vendors";

export type SeriesKey = "market" | VendorId;

export interface Series {
  key: SeriesKey;
  name: string;
  color: string;
  strokeWidth: number;
}

/** Fixed per entity: toggling or changing range never repaints a survivor. Market is the headline series. */
export const SERIES: Series[] = [
  { key: "market", name: "Market", color: MARKET_SERIES_COLOR, strokeWidth: 2.5 },
  ...VENDOR_ORDER.map((vendor) => ({
    key: vendor,
    name: VENDORS[vendor].name,
    color: VENDORS[vendor].color,
    strokeWidth: 1.75,
  })),
];

function hasAnyPrice(point: PricePoint): boolean {
  return SERIES.some((s) => point[s.key] != null);
}

/**
 * Points plotted for a range: the window's base day plus the N days after it, so the
 * line spans the same interval as the change figures. Leading days with no prices at
 * all (before a set's release) are dropped so the plot starts where data starts.
 */
export function rangePoints(history: PricePoint[], window: ChangeWindow): PricePoint[] {
  const slice = history.slice(-(CHANGE_WINDOW_DAYS[window] + 1));
  const first = slice.findIndex(hasAnyPrice);
  return first === -1 ? [] : slice.slice(first);
}

export function seriesWithData(points: PricePoint[]): Set<SeriesKey> {
  return new Set(SERIES.filter((s) => points.some((p) => p[s.key] != null)).map((s) => s.key));
}

export interface RangeChange {
  change: PriceChange | null;
  /** Set when history is shorter than the window: the change runs from this day instead. */
  since: IsoDay | null;
}

/**
 * The repository's change for the window when it has one (so the chart agrees with the
 * stat tiles); otherwise first to last market price inside the plotted range.
 */
export function rangeChange(points: PricePoint[], canonical: PriceChange | null): RangeChange {
  if (canonical) return { change: canonical, since: null };
  const priced = points.filter((p): p is PricePoint & { market: number } => p.market != null);
  const first = priced[0];
  const last = priced[priced.length - 1];
  if (!first || !last || first === last || first.market <= 0) return { change: null, since: null };
  return {
    change: {
      from: first.market,
      to: last.market,
      abs: roundMoney(last.market - first.market),
      pct: ((last.market - first.market) / first.market) * 100,
    },
    since: first.date,
  };
}

/** At most `maxTicks` evenly spaced x ticks, anchored on the latest day. */
export function dayTicks(points: PricePoint[], maxTicks: number): IsoDay[] {
  if (points.length === 0) return [];
  const step = Math.max(1, Math.ceil((points.length - 1) / Math.max(1, maxTicks - 1)));
  const ticks: IsoDay[] = [];
  for (let i = points.length - 1; i >= 0; i -= step) ticks.unshift(points[i]!.date);
  return ticks;
}

/**
 * Y extent of the given series over the range, padded 5% each side (never below zero)
 * so lines do not touch the plot edges.
 */
export function valueDomain(points: PricePoint[], keys: SeriesKey[]): [number, number] | null {
  const values = points.flatMap((p) => keys.map((k) => p[k])).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.05 || max * 0.05 || 1;
  return [Math.max(0, min - pad), max + pad];
}

const STEP_FACTORS = [1, 2, 2.5, 5];
const TARGET_TICKS = 5;

function ticksForStep(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let k = Math.ceil(min / step - 1e-9); k * step <= max + 1e-9; k++) ticks.push(roundMoney(k * step));
  return ticks;
}

/** Round y ticks inside the domain: the 1 / 2 / 2.5 / 5 × 10^n step (whole cents only) giving closest to five. */
export function valueTicks([min, max]: [number, number]): number[] {
  const magnitude = 10 ** Math.floor(Math.log10(max - min || 0.01));
  let best: number[] = [];
  for (const scale of [magnitude / 10, magnitude]) {
    for (const factor of STEP_FACTORS) {
      const step = factor * scale;
      const cents = step * 100;
      if (cents < 1 - 1e-9 || Math.abs(cents - Math.round(cents)) > 1e-6) continue;
      const ticks = ticksForStep(min, max, step);
      if (ticks.length >= 2 && Math.abs(ticks.length - TARGET_TICKS) < Math.abs(best.length - TARGET_TICKS)) {
        best = ticks;
      }
    }
  }
  return best;
}

export function latestMarket(points: PricePoint[]): { date: IsoDay; price: number } | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i]!;
    if (point.market != null) return { date: point.date, price: point.market };
  }
  return null;
}
