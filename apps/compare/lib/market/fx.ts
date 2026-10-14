import { roundMoney } from "./analytics";
import { DEFAULT_EUR_USD } from "./constants";
import type { CurrencyCode, PriceStats } from "./types";

/** Multiplier that converts one unit of each currency to USD. */
export type FxRates = Record<CurrencyCode, number>;

type Env = Record<string, string | undefined>;

export function getFxRates(env: Env = process.env, override?: Partial<FxRates>): FxRates {
  const configured = Number(env.FX_EUR_USD);
  const eur = override?.EUR ?? (Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_EUR_USD);
  return { USD: 1, EUR: eur };
}

export function toUsd(amount: number, currency: CurrencyCode, rates: FxRates): number {
  return roundMoney(amount * rates[currency]);
}

export function statsToUsd(stats: PriceStats, currency: CurrencyCode, rates: FxRates): PriceStats {
  const convert = (v: number | null) => (v == null ? null : toUsd(v, currency, rates));
  return { low: convert(stats.low), mid: convert(stats.mid), high: convert(stats.high), market: convert(stats.market) };
}
