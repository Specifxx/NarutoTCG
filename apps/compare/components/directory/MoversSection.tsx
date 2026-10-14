import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { cx } from "@naruto-tcg/ui";
import { CardArt } from "@/components/market/CardArt";
import { PriceChange } from "@/components/market/PriceChange";
import { MOVER_MIN_PRICE } from "@/lib/market/constants";
import { formatUsd } from "@/lib/market/format";
import { cardHref } from "@/lib/market/query";
import type { CardMarketSummary, MarketMovers } from "@/lib/market/types";
import { PendingRegion } from "./DirectoryProvider";
import { MOVERS_WINDOW_LABEL, type MoversWindow } from "./href";
import { GemIcon, TrendDownIcon, TrendUpIcon } from "./icons";
import { MoversWindowToggle } from "./MoversWindowToggle";

type PanelKind = "gainers" | "losers" | "mostValuable";

const PANELS: Record<
  PanelKind,
  { title: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; tone: string; empty: (window: string) => string }
> = {
  gainers: {
    title: "Top Price Gainers",
    Icon: TrendUpIcon,
    tone: "text-leaf-400",
    empty: (window) => `No card has gained value over the last ${window}.`,
  },
  losers: {
    title: "Top Price Losers",
    Icon: TrendDownIcon,
    tone: "text-blood-400",
    empty: (window) => `No card has lost value over the last ${window}.`,
  },
  mostValuable: {
    title: "Most Valuable Cards",
    Icon: GemIcon,
    tone: "text-chakra-400",
    empty: () => "No cards have a market price yet.",
  },
};

function MoverRow({ summary, rank, window }: { summary: CardMarketSummary; rank: number; window: MoversWindow }) {
  const { card } = summary;
  return (
    <li className="group relative flex min-h-[4.5rem] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-shadow-800/70">
      <span className="w-4 shrink-0 text-right text-xs font-semibold text-ash-400 tabular-nums">{rank}</span>
      <CardArt card={card} size="xs" />
      <div className="min-w-0 flex-1">
        <Link
          href={cardHref(card.id)}
          className="block text-sm leading-snug font-medium text-ash-200 group-hover:text-white after:absolute after:inset-0 focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-chakra-400 focus-visible:after:ring-inset"
        >
          <span className="line-clamp-2">{card.name}</span>
        </Link>
        <p className="mt-0.5 truncate text-xs text-ash-400">
          {card.setCode} · {card.number}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-ash-200 tabular-nums">{formatUsd(summary.marketPrice)}</p>
        <PriceChange change={summary.changes[window]} className="text-xs" />
      </div>
    </li>
  );
}

function MoverPanel({ kind, items, window }: { kind: PanelKind; items: CardMarketSummary[]; window: MoversWindow }) {
  const { title, Icon, tone, empty } = PANELS[kind];
  const headingId = `movers-${kind}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900 sm:w-[60%] md:w-[46%] lg:w-auto"
    >
      <header className="flex items-center gap-2.5 border-b border-shadow-700 px-4 py-3">
        <span className={cx("flex size-7 items-center justify-center rounded-md bg-shadow-800", tone)}>
          <Icon className="size-4" />
        </span>
        <h3 id={headingId} className="text-sm font-semibold text-white">
          {title}
        </h3>
        <span className="ml-auto text-xs text-ash-400">
          {kind === "mostValuable" ? "Market price" : `${MOVERS_WINDOW_LABEL[window].short} change`}
        </span>
      </header>
      {items.length > 0 ? (
        <ol className="divide-y divide-shadow-700/70">
          {items.map((summary, index) => (
            <MoverRow key={summary.card.id} summary={summary} rank={index + 1} window={window} />
          ))}
        </ol>
      ) : (
        <p className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-ash-400">
          {empty(MOVERS_WINDOW_LABEL[window].span)}
        </p>
      )}
    </section>
  );
}

/** Market-wide highlights. Deliberately ignores the directory filters. */
export function MoversSection({ movers, window }: { movers: MarketMovers; window: MoversWindow }) {
  return (
    <section aria-labelledby="movers-heading" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="movers-heading" className="text-xl font-semibold tracking-tight text-white">
            Market movers
          </h2>
          <p className="mt-1 text-sm text-ash-400">
            All sets · {MOVERS_WINDOW_LABEL[window].long} change in market price · gainers and losers exclude cards
            under {formatUsd(MOVER_MIN_PRICE)}
          </p>
        </div>
        <MoversWindowToggle />
      </div>
      <PendingRegion
        region="movers"
        className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        <MoverPanel kind="gainers" items={movers.gainers} window={window} />
        <MoverPanel kind="losers" items={movers.losers} window={window} />
        <MoverPanel kind="mostValuable" items={movers.mostValuable} window={window} />
      </PendingRegion>
    </section>
  );
}
