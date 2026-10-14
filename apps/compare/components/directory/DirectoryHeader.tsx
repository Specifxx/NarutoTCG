import type { ReactNode } from "react";
import { formatCount, formatDateTime, formatRelative } from "@/lib/market/format";
import { VENDOR_ORDER, VENDORS } from "@/lib/market/vendors";

const vendorList = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" });

/** `shortLabel` replaces `label` on phones so the three values stay on one baseline. */
function Stat({
  label,
  shortLabel,
  value,
  detail,
}: {
  label: string;
  shortLabel: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <dt className="text-[11px] font-semibold tracking-wider text-ash-400 uppercase">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </dt>
      <dd className="mt-1 text-lg font-semibold text-white tabular-nums sm:text-xl">{value}</dd>
      {detail && <dd className="mt-0.5 text-xs leading-snug text-ash-400">{detail}</dd>}
    </div>
  );
}

export function DirectoryHeader({
  cardCount,
  lastUpdated,
  demoData,
}: {
  cardCount: number;
  /** ISO timestamp of the most recent vendor update, or null before any data. */
  lastUpdated: string | null;
  /** The prices are simulated sample data. */
  demoData: boolean;
}) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-chakra-400 uppercase">Single-card market</p>
          {demoData && (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-shadow-500 bg-shadow-800 px-2.5 py-0.5 text-xs font-medium text-ash-200">
              <span aria-hidden className="size-1.5 rounded-full bg-chakra-400" />
              Demo data — simulated prices
            </p>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Naruto TCG Price Directory</h1>
        <p className="mt-2 text-base leading-relaxed text-ash-400">
          Compare single-card prices across {vendorList.format(VENDOR_ORDER.map((v) => VENDORS[v].name))} — market
          values, cheapest listings and price trends, refreshed daily.
        </p>
      </div>
      <dl className="grid shrink-0 grid-cols-3 divide-x divide-shadow-700 rounded-xl border border-shadow-700 bg-shadow-900 lg:w-[34rem]">
        <Stat
          label="Cards tracked"
          shortLabel="Cards"
          value={formatCount(cardCount)}
          detail="Every printing & finish"
        />
        <Stat
          label="Vendors compared"
          shortLabel="Vendors"
          value={formatCount(VENDOR_ORDER.length)}
          detail="Compared per card"
        />
        <Stat
          label="Last updated"
          shortLabel="Updated"
          value={lastUpdated ? <time dateTime={lastUpdated}>{formatRelative(lastUpdated)}</time> : "—"}
          detail={lastUpdated ? formatDateTime(lastUpdated) : undefined}
        />
      </dl>
    </header>
  );
}
