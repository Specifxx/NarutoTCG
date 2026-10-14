import { FinishBadge, RarityBadge } from "@/components/market/Badges";
import { CardArt } from "@/components/market/CardArt";
import { formatDateTime, formatRelative } from "@/lib/market/format";
import type { CardMarketDetail, MarketCard, RepositoryMode } from "@/lib/market/types";
import { BuyActions } from "./BuyActions";
import { ClockIcon } from "./icons";
import type { VendorLinks } from "./links";
import { MarketStats } from "./MarketStats";

const TYPE_LABEL: Record<MarketCard["type"], string> = {
  character: "Character",
  jutsu: "Jutsu",
  mission: "Mission",
  item: "Item",
  event: "Event",
};

function cardFacts(card: MarketCard): string[] {
  return [
    TYPE_LABEL[card.type],
    card.village,
    card.cost != null ? `Cost ${card.cost}` : undefined,
    card.power != null ? `Power ${card.power}` : undefined,
  ].filter((fact): fact is string => fact !== undefined);
}

/**
 * Art, identity, market stats and buy box. Grid areas reflow from
 * art-beside-title on phones, to art beside everything on tablets, to a
 * three-column product layout with the buy box on the right from lg.
 */
export function CardHero({
  detail,
  mode,
  links,
}: {
  detail: CardMarketDetail;
  mode: RepositoryMode;
  links: VendorLinks;
}) {
  const { summary, quotes } = detail;
  const { card } = summary;
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-6 [grid-template-areas:'art_title'_'details_details'_'buy_buy'] sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6 sm:[grid-template-areas:'art_title'_'art_details'_'art_buy'] lg:grid-cols-[12rem_minmax(0,1fr)_19rem] lg:[grid-template-areas:'art_title_buy'_'art_details_buy'] xl:grid-cols-[15rem_minmax(0,1fr)_21rem] xl:gap-x-8">
      <div className="self-start [grid-area:art]">
        <CardArt card={card} size="lg" />
      </div>

      <div className="min-w-0 self-end [grid-area:title] sm:self-start">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl xl:text-4xl">
          {card.name}
        </h1>
        <p className="mt-1.5 text-sm text-ash-400 sm:text-base">
          {card.set} · #{card.number}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <RarityBadge rarity={card.rarity} />
          <FinishBadge finish={card.finish} />
        </div>
        <p className="mt-2.5 text-sm text-ash-400">{cardFacts(card).join(" · ")}</p>
      </div>

      <div className="@container min-w-0 [grid-area:details]">
        {card.text && (
          <p className="max-w-prose border-l-2 border-shadow-500 pl-3 text-sm leading-relaxed text-ash-200">
            <span className="sr-only">Card text: </span>
            {card.text}
          </p>
        )}
        <div className="mt-5 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ash-400 first:mt-0">
          <p className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-3.5" />
            Prices updated{" "}
            {summary.updatedAt ? (
              <time dateTime={summary.updatedAt} title={formatDateTime(summary.updatedAt)}>
                {formatRelative(summary.updatedAt)}
              </time>
            ) : (
              "never"
            )}
          </p>
          {mode === "seed" && (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-shadow-500 bg-shadow-800 px-2.5 py-0.5 font-medium text-ash-200">
              <span aria-hidden className="size-1.5 rounded-full bg-chakra-400" />
              Demo data — simulated prices
            </p>
          )}
        </div>
        <MarketStats summary={summary} quotes={quotes} />
      </div>

      <div className="min-w-0 self-start [grid-area:buy]">
        <BuyActions quotes={quotes} links={links} />
      </div>
    </div>
  );
}
