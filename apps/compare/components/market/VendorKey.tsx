import { MARKET_SERIES_COLOR, VENDORS } from "@/lib/market/vendors";
import type { VendorId } from "@/lib/market/types";

/** Vendor name keyed by a short stroke of its chart color (identity never relies on color alone). */
export function VendorKey({ vendor, className }: { vendor: VendorId | "market"; className?: string }) {
  const color = vendor === "market" ? MARKET_SERIES_COLOR : VENDORS[vendor].color;
  const name = vendor === "market" ? "Market" : VENDORS[vendor].name;
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className ?? ""}`}>
      <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}
