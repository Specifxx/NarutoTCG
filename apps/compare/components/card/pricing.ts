import type { VendorQuote } from "@/lib/market/types";

export interface VendorPriceRange {
  low: number;
  high: number;
  /** Vendors quoting a low or high price. */
  vendors: number;
}

/** Cheapest `usd.low` to dearest `usd.high` across vendors. */
export function vendorPriceRange(quotes: VendorQuote[]): VendorPriceRange | null {
  const priced = quotes.filter((q) => q.usd.low != null || q.usd.high != null);
  const values = priced.flatMap((q) => [q.usd.low, q.usd.high]).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return { low: Math.min(...values), high: Math.max(...values), vendors: priced.length };
}
