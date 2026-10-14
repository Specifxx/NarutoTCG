"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { cx } from "@naruto-tcg/ui";
import { VendorKey } from "@/components/market/VendorKey";
import { formatCount, formatMoney, formatUsd } from "@/lib/market/format";
import { CONDITION_LABEL } from "@/lib/market/labels";
import type { CardCondition, CurrencyCode, VendorId } from "@/lib/market/types";
import { VENDOR_ORDER, VENDORS } from "@/lib/market/vendors";
import { BestPriceBadge } from "./BestPriceBadge";
import { OutboundLink } from "./OutboundLink";

/** A live listing as the client needs it: USD money, the native delivered total, and a server-built affiliate href. */
export interface ListingRow {
  id: string;
  vendor: VendorId;
  seller: string;
  condition: CardCondition;
  quantity: number;
  currency: CurrencyCode;
  priceUsd: number;
  shippingUsd: number | null;
  totalUsd: number;
  /** price + shipping in the vendor's own currency. */
  nativeTotal: number;
  href: string;
}

type VendorFilter = VendorId | "all";

const INITIAL_ROWS = 10;

const th = "px-3 py-3 text-[11px] font-semibold tracking-wider text-ash-400 uppercase first:pl-4 last:pr-4";
const td = "px-3 py-2.5 first:pl-4 last:pr-4";
const num = "text-right whitespace-nowrap tabular-nums";

function Condition({ condition }: { condition: CardCondition }) {
  return (
    <abbr
      title={CONDITION_LABEL[condition]}
      className="inline-flex min-w-9 cursor-help justify-center rounded border border-shadow-500 px-1.5 py-0.5 text-[11px] font-semibold text-ash-200 no-underline"
    >
      {condition}
    </abbr>
  );
}

function Shipping({ usd }: { usd: number | null }) {
  if (usd === null) return <span className="text-ash-400">Not stated</span>;
  if (usd === 0) return <span className="text-leaf-400">Free</span>;
  return <>{formatUsd(usd)}</>;
}

function shippingPhrase(usd: number | null): string {
  if (usd === null) return "shipping not stated";
  if (usd === 0) return "free shipping";
  return `${formatUsd(usd)} shipping`;
}

function Total({ row }: { row: ListingRow }) {
  return (
    <>
      <span className="block font-semibold text-white">{formatUsd(row.totalUsd)}</span>
      {row.currency !== "USD" && (
        <span className="block text-xs font-normal text-ash-400">{formatMoney(row.nativeTotal, row.currency)}</span>
      )}
    </>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={count === 0}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:h-10",
        active
          ? "border-chakra-500 bg-chakra-500/15 text-white"
          : "border-shadow-700 bg-shadow-900 text-ash-200 hover:border-shadow-500 hover:bg-shadow-800",
      )}
    >
      {children}
      <span className={cx("text-xs tabular-nums", active ? "text-chakra-400" : "text-ash-400")}>{count}</span>
    </button>
  );
}

/** Live offers, cheapest delivered total first, filterable by vendor. */
export function ListingsTable({ listings }: { listings: ListingRow[] }) {
  const [vendor, setVendor] = useState<VendorFilter>("all");
  const [expanded, setExpanded] = useState(false);
  const tableId = useId();
  const listId = useId();

  const counts = useMemo(() => {
    const byVendor = new Map<VendorId, number>(VENDOR_ORDER.map((v) => [v, 0]));
    for (const row of listings) byVendor.set(row.vendor, (byVendor.get(row.vendor) ?? 0) + 1);
    return byVendor;
  }, [listings]);
  const lowestTotal = listings.reduce<number | null>(
    (min, row) => (min === null || row.totalUsd < min ? row.totalUsd : min),
    null,
  );

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-shadow-700 bg-shadow-900 px-6 py-12 text-center">
        <p className="font-medium text-ash-200">No live listings right now</p>
        <p className="mt-1 text-sm text-ash-400">Use the marketplace links above to search for new offers.</p>
      </div>
    );
  }

  const filtered = vendor === "all" ? listings : listings.filter((row) => row.vendor === vendor);
  const rows = expanded ? filtered : filtered.slice(0, INITIAL_ROWS);
  const isLowest = (row: ListingRow) => row.totalUsd === lowestTotal;
  const scope = vendor === "all" ? "" : ` on ${VENDORS[vendor].name}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div role="group" aria-label="Filter listings by vendor" className="flex flex-wrap gap-2">
          <FilterChip active={vendor === "all"} count={listings.length} onClick={() => setVendor("all")}>
            All
          </FilterChip>
          {VENDOR_ORDER.map((v) => (
            <FilterChip key={v} active={vendor === v} count={counts.get(v) ?? 0} onClick={() => setVendor(v)}>
              {VENDORS[v].name}
            </FilterChip>
          ))}
        </div>
        <p aria-live="polite" className="text-sm text-ash-400 tabular-nums">
          Showing {formatCount(rows.length)} of {formatCount(filtered.length)}{" "}
          {filtered.length === 1 ? "listing" : "listings"}
          {scope}
        </p>
      </div>

      <div
        id={tableId}
        className="mt-4 hidden overflow-x-auto rounded-xl border border-shadow-700 bg-shadow-900 md:block"
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Live listings{scope}, cheapest delivered total first, in US dollars</caption>
          <thead className="border-b border-shadow-700">
            <tr>
              <th scope="col" className={cx(th, "text-left")}>
                Vendor
              </th>
              <th scope="col" className={cx(th, "text-left")}>
                Seller
              </th>
              <th scope="col" className={cx(th, "text-left")}>
                Condition
              </th>
              <th scope="col" className={cx(th, "text-right")}>
                Qty
              </th>
              <th scope="col" className={cx(th, "text-right")}>
                Price
              </th>
              <th scope="col" className={cx(th, "text-right")}>
                Shipping
              </th>
              <th scope="col" className={cx(th, "text-right")}>
                Total
              </th>
              <th scope="col" className={cx(th, "text-right")}>
                <span className="sr-only">Link</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-shadow-700/70">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cx("transition-colors hover:bg-shadow-800/60", isLowest(row) && "bg-leaf-400/[0.04]")}
              >
                <td className={td}>
                  <VendorKey vendor={row.vendor} className="text-ash-200" />
                </td>
                <th scope="row" className={cx(td, "max-w-56 text-left font-medium text-ash-200")}>
                  <span className="block truncate" title={row.seller}>
                    {row.seller}
                  </span>
                  {isLowest(row) && <BestPriceBadge label="Lowest total" className="mt-1" />}
                </th>
                <td className={td}>
                  <Condition condition={row.condition} />
                </td>
                <td className={cx(td, num, "text-ash-200")}>{row.quantity}</td>
                <td className={cx(td, num, "text-ash-200")}>{formatUsd(row.priceUsd)}</td>
                <td className={cx(td, num, "text-ash-200")}>
                  <Shipping usd={row.shippingUsd} />
                </td>
                <td className={cx(td, num)}>
                  <Total row={row} />
                </td>
                <td className={cx(td, "text-right")}>
                  <OutboundLink
                    href={row.href}
                    label="View"
                    context={`${row.seller}'s listing on ${VENDORS[row.vendor].name}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul
        id={listId}
        className="mt-4 divide-y divide-shadow-700/70 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900 md:hidden"
      >
        {rows.map((row) => (
          <li key={row.id} className={cx("p-4", isLowest(row) && "bg-leaf-400/[0.04]")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ash-200">{row.seller}</p>
                <VendorKey vendor={row.vendor} className="mt-0.5 text-xs text-ash-400" />
              </div>
              <div className="shrink-0 text-right text-sm tabular-nums">
                <Total row={row} />
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-ash-400">
                <Condition condition={row.condition} />
                <span>Qty {row.quantity}</span>
                <span className="tabular-nums">
                  {formatUsd(row.priceUsd)} + {shippingPhrase(row.shippingUsd)}
                </span>
                {isLowest(row) && <BestPriceBadge label="Lowest total" />}
              </div>
              <OutboundLink
                href={row.href}
                label="View"
                context={`${row.seller}'s listing on ${VENDORS[row.vendor].name}`}
                className="shrink-0"
              />
            </div>
          </li>
        ))}
      </ul>

      {filtered.length > INITIAL_ROWS && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`${tableId} ${listId}`}
            onClick={() => setExpanded((open) => !open)}
            className="inline-flex h-10 items-center rounded-lg border border-shadow-700 bg-shadow-900 px-4 text-sm font-medium text-ash-200 transition-colors hover:border-shadow-500 hover:bg-shadow-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            {expanded ? "Show fewer listings" : `Show all ${formatCount(filtered.length)} listings`}
          </button>
        </div>
      )}
    </div>
  );
}
