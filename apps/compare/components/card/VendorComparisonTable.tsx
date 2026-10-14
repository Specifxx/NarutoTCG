import type { ReactNode } from "react";
import { cx } from "@naruto-tcg/ui";
import { VendorKey } from "@/components/market/VendorKey";
import { lowestQuote } from "@/lib/market/analytics";
import { formatCount, formatDateTime, formatMoney, formatRelative, formatUsd } from "@/lib/market/format";
import type { MarketCard, VendorId, VendorQuote } from "@/lib/market/types";
import { VENDOR_ORDER, VENDORS } from "@/lib/market/vendors";
import { BestPriceBadge } from "./BestPriceBadge";
import { VENDOR_VERB, type VendorLinks } from "./links";
import { OutboundLink } from "./OutboundLink";
import { SectionHeader } from "./SectionHeader";

const th = "px-3 py-3 text-[11px] font-semibold tracking-wider text-ash-400 uppercase first:pl-4 last:pr-4";
const td = "px-3 py-3 first:pl-4 last:pr-4";
const num = "text-right tabular-nums whitespace-nowrap";

function Updated({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {formatRelative(iso)}
    </time>
  );
}

/** USD market price; Cardmarket also shows the EUR figure it was converted from. */
function MarketValue({ quote, className }: { quote: VendorQuote; className?: string }) {
  return (
    <span className={className}>
      <span className="block font-semibold text-white">{formatUsd(quote.usd.market)}</span>
      {quote.currency !== "USD" && quote.native.market != null && (
        <span className="block text-xs text-ash-400">{formatMoney(quote.native.market, quote.currency)}</span>
      )}
    </span>
  );
}

function VendorAction({ vendor, quoted, href }: { vendor: VendorId; quoted: boolean; href: string }) {
  const name = VENDORS[vendor].name;
  return quoted ? (
    <OutboundLink href={href} label={VENDOR_VERB[vendor]} context={`on ${name}`} />
  ) : (
    <OutboundLink href={href} label="Search" context={`${name} for this card`} />
  );
}

function DesktopTable({
  card,
  rows,
  best,
  links,
}: {
  card: MarketCard;
  rows: Array<{ vendor: VendorId; quote: VendorQuote | undefined }>;
  best: VendorId | null;
  links: VendorLinks;
}) {
  return (
    <div className="relative hidden overflow-x-auto rounded-xl border border-shadow-700 bg-shadow-900 md:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          {card.name} prices at each marketplace, in US dollars. Cardmarket prices converted from euros.
        </caption>
        <thead className="border-b border-shadow-700">
          <tr>
            <th scope="col" className={cx(th, "text-left")}>
              Vendor
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              Listings
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              Low
            </th>
            <th scope="col" className={cx(th, "hidden text-right lg:table-cell")}>
              Mid
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              High
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              Market
            </th>
            <th scope="col" className={cx(th, "hidden text-left lg:table-cell")}>
              Updated
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              <span className="sr-only">Link</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-shadow-700/70">
          {rows.map(({ vendor, quote }) => (
            <tr key={vendor} className={cx(!quote && "text-ash-400")}>
              <th scope="row" className={cx(td, "text-left font-medium")}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <VendorKey vendor={vendor} className={quote ? "text-ash-200" : "text-ash-400"} />
                  {vendor === best && <BestPriceBadge label="Best price" />}
                </div>
              </th>
              {quote ? (
                <>
                  <td className={cx(td, num, "text-ash-200")}>{formatCount(quote.listingsCount)}</td>
                  <td className={cx(td, num, "font-medium", vendor === best ? "text-leaf-400" : "text-ash-200")}>
                    {formatUsd(quote.usd.low)}
                  </td>
                  <td className={cx(td, num, "hidden text-ash-200 lg:table-cell")}>{formatUsd(quote.usd.mid)}</td>
                  <td className={cx(td, num, "text-ash-200")}>{formatUsd(quote.usd.high)}</td>
                  <td className={cx(td, num)}>
                    <MarketValue quote={quote} />
                  </td>
                  <td className={cx(td, "hidden whitespace-nowrap text-ash-400 lg:table-cell")}>
                    <Updated iso={quote.updatedAt} />
                  </td>
                </>
              ) : (
                <>
                  <td className={cx(td, "text-right whitespace-nowrap")}>Not listed</td>
                  <td className={cx(td, num)}>—</td>
                  <td className={cx(td, num, "hidden lg:table-cell")}>—</td>
                  <td className={cx(td, num)}>—</td>
                  <td className={cx(td, num)}>—</td>
                  <td className={cx(td, "hidden lg:table-cell")}>—</td>
                </>
              )}
              <td className={cx(td, "text-right")}>
                <VendorAction vendor={vendor} quoted={Boolean(quote)} href={links[vendor]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-wider text-ash-400 uppercase">{term}</dt>
      <dd className="mt-0.5 text-sm text-ash-200 tabular-nums">{children}</dd>
    </div>
  );
}

function MobileList({
  rows,
  best,
  links,
}: {
  rows: Array<{ vendor: VendorId; quote: VendorQuote | undefined }>;
  best: VendorId | null;
  links: VendorLinks;
}) {
  return (
    <ul className="divide-y divide-shadow-700/70 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900 md:hidden">
      {rows.map(({ vendor, quote }) => (
        <li key={vendor} className="p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="text-sm font-semibold">
              <VendorKey vendor={vendor} className={quote ? "text-ash-200" : "text-ash-400"} />
            </h3>
            {vendor === best && <BestPriceBadge label="Best price" />}
          </div>
          {quote ? (
            <dl className="mt-3 grid grid-cols-4 gap-x-3 gap-y-2">
              <Stat term="Low">
                <span className={cx("font-medium", vendor === best && "text-leaf-400")}>
                  {formatUsd(quote.usd.low)}
                </span>
              </Stat>
              <Stat term="Mid">{formatUsd(quote.usd.mid)}</Stat>
              <Stat term="High">{formatUsd(quote.usd.high)}</Stat>
              <Stat term="Market">
                <MarketValue quote={quote} />
              </Stat>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-ash-400">Not listed on {VENDORS[vendor].name} right now.</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-ash-400">
              {quote ? (
                <>
                  {formatCount(quote.listingsCount)} {quote.listingsCount === 1 ? "listing" : "listings"} · updated{" "}
                  <Updated iso={quote.updatedAt} />
                </>
              ) : (
                "Search the marketplace instead"
              )}
            </p>
            <VendorAction vendor={vendor} quoted={Boolean(quote)} href={links[vendor]} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One row per vendor in fixed order, including vendors that do not list the card. */
export function VendorComparisonTable({
  card,
  quotes,
  links,
}: {
  card: MarketCard;
  quotes: VendorQuote[];
  links: VendorLinks;
}) {
  const byVendor = new Map(quotes.map((q) => [q.vendor, q]));
  const rows = VENDOR_ORDER.map((vendor) => ({ vendor, quote: byVendor.get(vendor) }));
  const best = lowestQuote(quotes)?.vendor ?? null;
  return (
    <section aria-labelledby="compare-heading" className="mt-12">
      <SectionHeader
        id="compare-heading"
        title="Compare prices"
        description="Low, mid, high and market price at each marketplace right now."
      />
      <DesktopTable card={card} rows={rows} best={best} links={links} />
      <MobileList rows={rows} best={best} links={links} />
      <p className="mt-3 text-xs text-ash-400">USD. Cardmarket prices converted from EUR.</p>
    </section>
  );
}
