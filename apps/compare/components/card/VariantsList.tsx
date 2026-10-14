import Link from "next/link";
import { FinishBadge, RarityBadge } from "@/components/market/Badges";
import { CardArt } from "@/components/market/CardArt";
import { PriceChange } from "@/components/market/PriceChange";
import { formatUsd } from "@/lib/market/format";
import { cardHref } from "@/lib/market/query";
import type { CardMarketSummary } from "@/lib/market/types";
import { SectionHeader } from "./SectionHeader";

/** Other printings of the same character, most valuable first. Renders nothing when there are none. */
export function VariantsList({ character, variants }: { character: string; variants: CardMarketSummary[] }) {
  if (variants.length === 0) return null;
  return (
    <section aria-labelledby="variants-heading" className="mt-12">
      <SectionHeader
        id="variants-heading"
        title="Other printings"
        description={`${variants.length} more ${variants.length === 1 ? "printing" : "printings"} of ${character}, most valuable first.`}
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {variants.map((summary) => {
          const { card } = summary;
          return (
            <li
              key={card.id}
              className="group relative flex gap-3 rounded-xl border border-shadow-700 bg-shadow-900 p-3 transition-colors hover:border-shadow-500 hover:bg-shadow-800/70"
            >
              <CardArt card={card} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={cardHref(card.id)}
                  className="text-sm leading-snug font-medium text-ash-200 group-hover:text-white after:absolute after:inset-0 after:rounded-xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-chakra-400"
                >
                  <span className="line-clamp-2">{card.name}</span>
                </Link>
                <p className="mt-0.5 truncate text-xs text-ash-400">
                  {card.setCode} · {card.number}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <RarityBadge rarity={card.rarity} />
                  <FinishBadge finish={card.finish} />
                </div>
                <div className="mt-auto flex items-baseline justify-between gap-3 pt-2.5">
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {formatUsd(summary.marketPrice)}
                  </span>
                  <span className="flex items-baseline gap-1 text-xs">
                    <span className="text-ash-400">7D</span>
                    <PriceChange change={summary.changes["7d"]} />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
