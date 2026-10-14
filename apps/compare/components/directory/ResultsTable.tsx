import Link from "next/link";
import { cx } from "@naruto-tcg/ui";
import { FinishBadge, RarityBadge } from "@/components/market/Badges";
import { CardArt } from "@/components/market/CardArt";
import { PriceChange } from "@/components/market/PriceChange";
import { Sparkline } from "@/components/market/Sparkline";
import { VendorKey } from "@/components/market/VendorKey";
import { formatUsd } from "@/lib/market/format";
import { cardHref } from "@/lib/market/query";
import type { CardMarketSummary } from "@/lib/market/types";

const th = "px-3 py-3 text-[11px] font-semibold tracking-wider text-ash-400 uppercase first:pl-4 last:pr-4";
const td = "px-3 py-2.5 first:pl-4 last:pr-4";

/** md+ layout. Rarity and 30D get their own columns from lg, finish from xl; until then badges sit under the name. */
export function ResultsTable({ items, caption }: { items: CardMarketSummary[]; caption: string }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-shadow-700 bg-shadow-900 md:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-shadow-700 bg-shadow-900">
          <tr>
            <th scope="col" className={cx(th, "text-left")}>
              Card
            </th>
            <th scope="col" className={cx(th, "hidden text-left lg:table-cell")}>
              Rarity
            </th>
            <th scope="col" className={cx(th, "hidden text-left xl:table-cell")}>
              Finish
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              Market
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              <abbr title="7-day change" className="no-underline">
                7D
              </abbr>
            </th>
            <th scope="col" className={cx(th, "hidden text-right lg:table-cell")}>
              <abbr title="30-day change" className="no-underline">
                30D
              </abbr>
            </th>
            <th scope="col" className={cx(th, "text-right")}>
              Lowest
            </th>
            <th scope="col" className={cx(th, "text-left")}>
              30-day trend
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-shadow-700/70">
          {items.map((summary) => {
            const { card } = summary;
            return (
              <tr key={card.id} className="group relative transition-colors hover:bg-shadow-800/70">
                <td className={td}>
                  <div className="flex min-w-[13rem] items-center gap-3">
                    <CardArt card={card} size="xs" />
                    <div className="min-w-0">
                      <Link
                        href={cardHref(card.id)}
                        className="font-medium text-ash-200 group-hover:text-white after:absolute after:inset-0 focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-chakra-400 focus-visible:after:ring-inset"
                      >
                        {card.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-ash-400">
                        {card.set} · {card.number}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1 xl:hidden">
                        <RarityBadge rarity={card.rarity} className="lg:hidden" />
                        <FinishBadge finish={card.finish} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className={cx(td, "hidden lg:table-cell")}>
                  <RarityBadge rarity={card.rarity} />
                </td>
                <td className={cx(td, "hidden xl:table-cell")}>
                  <FinishBadge finish={card.finish} />
                </td>
                <td className={cx(td, "text-right font-semibold whitespace-nowrap text-white tabular-nums")}>
                  {formatUsd(summary.marketPrice)}
                </td>
                <td className={cx(td, "text-right")}>
                  <PriceChange change={summary.changes["7d"]} />
                </td>
                <td className={cx(td, "hidden text-right lg:table-cell")}>
                  <PriceChange change={summary.changes["30d"]} />
                </td>
                <td className={cx(td, "text-right whitespace-nowrap")}>
                  <span className="block text-ash-200 tabular-nums">{formatUsd(summary.lowestPrice)}</span>
                  {summary.lowestVendor && (
                    <VendorKey vendor={summary.lowestVendor} className="mt-0.5 text-xs text-ash-400" />
                  )}
                </td>
                <td className={td}>
                  <Sparkline values={summary.sparkline} className="block" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
