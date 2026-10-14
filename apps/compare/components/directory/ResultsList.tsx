import Link from "next/link";
import { FinishBadge, RarityBadge } from "@/components/market/Badges";
import { CardArt } from "@/components/market/CardArt";
import { PriceChange } from "@/components/market/PriceChange";
import { formatUsd } from "@/lib/market/format";
import { cardHref } from "@/lib/market/query";
import type { CardMarketSummary } from "@/lib/market/types";
import { VENDORS } from "@/lib/market/vendors";

/** Below md: one stacked card per row, prioritising price, 7-day change and the cheapest vendor. */
export function ResultsList({ items }: { items: CardMarketSummary[] }) {
  return (
    <ul className="divide-y divide-shadow-700/70 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900 md:hidden">
      {items.map((summary) => {
        const { card } = summary;
        return (
          <li key={card.id} className="group relative flex gap-3 p-3 transition-colors hover:bg-shadow-800/70">
            <CardArt card={card} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={cardHref(card.id)}
                  className="min-w-0 text-sm leading-snug font-medium text-ash-200 group-hover:text-white after:absolute after:inset-0 focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-chakra-400 focus-visible:after:ring-inset"
                >
                  <span className="line-clamp-2">{card.name}</span>
                </Link>
                <span className="shrink-0 text-sm font-semibold text-white tabular-nums">
                  {formatUsd(summary.marketPrice)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-ash-400">
                  {card.setCode} · {card.number}
                </span>
                <span className="flex shrink-0 items-baseline gap-1">
                  <span className="text-ash-400">7D</span>
                  <PriceChange change={summary.changes["7d"]} />
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <RarityBadge rarity={card.rarity} />
                {card.finish !== "non-foil" && <FinishBadge finish={card.finish} />}
              </div>
              {summary.lowestPrice != null && summary.lowestVendor && (
                <p className="mt-1.5 text-xs text-ash-400">
                  Lowest <span className="font-medium text-ash-200 tabular-nums">{formatUsd(summary.lowestPrice)}</span>{" "}
                  on {VENDORS[summary.lowestVendor].name}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
