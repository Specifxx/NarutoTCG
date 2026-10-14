import type { ReactNode } from "react";
import { cx } from "@naruto-tcg/ui";
import { PriceChange } from "@/components/market/PriceChange";
import { VendorKey } from "@/components/market/VendorKey";
import { CHANGE_WINDOWS } from "@/lib/market/constants";
import { formatUsd } from "@/lib/market/format";
import type { CardMarketSummary, ChangeWindow, VendorQuote } from "@/lib/market/types";
import { vendorPriceRange } from "./pricing";

const CHANGE_LABEL: Record<ChangeWindow, string> = { "7d": "7D change", "30d": "30D change", "90d": "90D change" };

const label = "text-[11px] font-semibold tracking-wider text-ash-400 uppercase";
const value = "text-base font-semibold text-white @md:text-lg";

function Missing({ reason }: { reason: string }) {
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">Not available.</span>
      <span className="ml-2 text-xs font-normal text-ash-400">{reason}</span>
    </>
  );
}

function Tile({
  term,
  children,
  detail,
  className,
}: {
  term: ReactNode;
  children: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("min-w-0 bg-shadow-900 px-4 py-3", className)}>
      <dt className={label}>{term}</dt>
      <dd className="mt-1">{children}</dd>
      {detail && <dd className="mt-0.5 text-xs leading-snug text-ash-400">{detail}</dd>}
    </div>
  );
}

/**
 * Market price, cheapest listing, vendor spread and change tiles. Lays out by the
 * width of its container (`@container` ancestor), not the viewport.
 */
export function MarketStats({ summary, quotes }: { summary: CardMarketSummary; quotes: VendorQuote[] }) {
  const range = vendorPriceRange(quotes);
  const missingChange = summary.asOf ? "Not enough history" : "No price data yet";
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-shadow-700 bg-shadow-700 @lg:grid-cols-3">
      <Tile
        term="Market price"
        className="col-span-2 @lg:col-span-1"
        detail={summary.asOf ? "Median across vendors" : "Not traded yet"}
      >
        <span className="text-3xl font-bold tracking-tight text-white @lg:text-2xl @2xl:text-3xl">
          {formatUsd(summary.marketPrice)}
        </span>
      </Tile>
      <Tile
        term="Lowest listing"
        detail={summary.lowestVendor ? <VendorKey vendor={summary.lowestVendor} /> : "No active listings"}
      >
        <span className={value}>{formatUsd(summary.lowestPrice)}</span>
      </Tile>
      <Tile
        term={
          <>
            <span className="@sm:hidden">Vendor range</span>
            <span className="hidden @sm:inline">Range across vendors</span>
          </>
        }
        detail={
          range ? `${range.vendors} ${range.vendors === 1 ? "vendor" : "vendors"} · low to high` : "No vendor quotes"
        }
      >
        {range ? (
          <span className={value}>
            {formatUsd(range.low)}
            <span className="text-ash-400">–</span>
            <wbr />
            {formatUsd(range.high)}
          </span>
        ) : (
          <span className={value}>—</span>
        )}
      </Tile>
      {CHANGE_WINDOWS.map((window) => {
        const change = summary.changes[window];
        return (
          <div
            key={window}
            className="col-span-2 flex min-w-0 items-baseline justify-between gap-3 bg-shadow-900 px-4 py-2.5 @lg:col-span-1 @lg:block @lg:py-3"
          >
            <dt className={label}>{CHANGE_LABEL[window]}</dt>
            <dd className="text-right text-sm font-semibold @lg:mt-1 @lg:text-left">
              {change ? <PriceChange change={change} showAbs /> : <Missing reason={missingChange} />}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
