import type { CardPrinting, NarutoCard } from "@naruto-tcg/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CardShopPanel } from "@/components/affiliate/CardShopPanel";
import { ElementBadge, RarityBadge, TypeBadge } from "@/components/badges";
import { CardFacts, CardRules, CardStats } from "@/components/detail/CardData";
import { Breadcrumbs, CardPager } from "@/components/detail/DetailNav";
import { effectKeywords } from "@/components/detail/effect-keywords";
import { effectSummary, parseEffectText } from "@/components/detail/effect-text";
import { FoilCard, type HeroPrinting } from "@/components/detail/FoilCard";
import { OtherVersions } from "@/components/detail/OtherVersions";
import type { PrintingRow } from "@/components/detail/PrintingsChecklist";
import { PrintingsSection } from "@/components/detail/PrintingsSection";
import { getCardNeighbors, getOtherVersions, getRelatedDecks } from "@/components/detail/queries";
import { RelatedDecks } from "@/components/detail/RelatedDecks";
import { RevealBadge } from "@/components/detail/RevealBadge";
import { getAllCards, getCard, getSet } from "@/lib/data";
import {
  ELEMENT_META,
  RARITY_META,
  TYPE_META,
  cardImageSrc,
  cardRarities,
  formatDate,
  isReleased,
  primaryPrinting,
  printingKey,
  setHref,
  todayIso,
} from "@/lib/meta";

/** Related decks shown in full; the rest are summarised as a count. */
const MAX_DECKS = 6;

type Params = Promise<{ id: string }>;

export const dynamicParams = false;

export function generateStaticParams(): { id: string }[] {
  return getAllCards().map((card) => ({ id: card.id }));
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function findCard(id: string): NarutoCard | undefined {
  return getCard(id) ?? getCard(safeDecode(id));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const card = findCard((await params).id);
  if (!card) return { title: "Card not found" };
  const title = `${card.name} (${card.id})`;
  const kind = `${ELEMENT_META[card.element].label} ${TYPE_META[card.type].label}`;
  const description = card.effect.trim()
    ? effectSummary(`${card.title ? `${card.title}. ` : ""}${kind}. ${card.effect}`, 200)
    : `${card.title ? `${card.title}. ` : ""}${kind} with no card text.`;
  const image = cardImageSrc(card);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Naruto TCG Cards",
      // Relative artwork needs a deployment origin (metadataBase); only absolute URLs are safe to emit here.
      ...(/^https?:\/\//.test(image) && { images: [{ url: image, alt: `${card.name} card art` }] }),
    },
    twitter: { card: "summary", title, description },
  };
}

/**
 * Printings for the hero selector: one per distinct look (artwork + foil), in
 * printing order, so identical reprints don't produce duplicate buttons.
 */
function heroPrintings(card: NarutoCard, setName: (setId: string) => string): HeroPrinting[] {
  const seen = new Set<string>();
  const options: HeroPrinting[] = [];
  for (const printing of card.printings) {
    const look = `${cardImageSrc(card, printing)}|${RARITY_META[printing.rarity].foil}`;
    if (seen.has(look)) continue;
    seen.add(look);
    options.push({ printing, setName: setName(printing.setId) });
  }
  return options;
}

function printingRow(printing: CardPrinting, today: string): PrintingRow {
  const set = getSet(printing.setId);
  return {
    key: printingKey(printing),
    setId: printing.setId,
    setName: set?.name ?? printing.setId,
    setShortName: set?.shortName ?? printing.setId,
    setKind: set?.kind,
    number: printing.number,
    rarity: printing.rarity,
    variant: printing.variant,
    releaseDate: set?.releaseDate,
    upcoming: set ? !isReleased(set, today) : false,
  };
}

export default async function CardDetailPage({ params }: { params: Params }) {
  const card = findCard((await params).id);
  if (!card) notFound();

  const today = todayIso();
  const debut = primaryPrinting(card);
  const debutSet = getSet(debut.setId);
  const debutUpcoming = debutSet ? !isReleased(debutSet, today) : false;
  const setLabel = debutSet?.shortName ?? debut.setId;
  const element = ELEMENT_META[card.element];

  const paragraphs = parseEffectText(card.effect, { keywords: card.keywords });
  const keywords = effectKeywords(paragraphs);
  const neighbors = getCardNeighbors(card);
  const related = getRelatedDecks(card.id, MAX_DECKS);
  const versions = getOtherVersions(card);
  const rows = card.printings.map((printing) => printingRow(printing, today));
  const hero = heroPrintings(card, (setId) => getSet(setId)?.shortName ?? setId);

  const backdrop: CSSProperties = {
    backgroundImage: `radial-gradient(55% 60% at 22% 0%, ${element.hex}24, transparent 70%), radial-gradient(40% 50% at 85% 10%, #f25c0014, transparent 70%)`,
  };

  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
        style={backdrop}
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:pb-24 lg:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Breadcrumbs card={card} setId={debut.setId} setLabel={setLabel} />
          <CardPager neighbors={neighbors} setLabel={setLabel} />
        </div>

        <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] xl:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <FoilCard card={card} options={hero} />
          </div>

          <div className="min-w-0 space-y-8">
            <header>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ash-400">
                <span className="rounded-md border border-shadow-700 bg-shadow-900 px-2 py-0.5 font-mono text-xs text-ash-200">
                  {card.id}
                </span>
                <Link
                  href={setHref(debut.setId)}
                  className="rounded-sm transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  {debutSet?.name ?? debut.setId}
                </Link>
              </p>
              <h1 className="mt-3 text-balance text-4xl font-black tracking-tight text-white sm:text-5xl">
                {card.name}
              </h1>
              {card.title && <p className="mt-1.5 text-lg font-medium text-ash-400 sm:text-xl">{card.title}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <TypeBadge type={card.type} />
                <ElementBadge element={card.element} />
                {cardRarities(card).map((rarity) => (
                  <RarityBadge key={rarity} rarity={rarity} />
                ))}
                {debutUpcoming && debutSet && (
                  <span className="inline-block whitespace-nowrap rounded-full border border-sky-400/45 bg-sky-400/10 px-2 py-0.5 text-xs font-semibold text-sky-300">
                    Releases <time dateTime={debutSet.releaseDate}>{formatDate(debutSet.releaseDate)}</time>
                  </span>
                )}
              </div>
              {card.reveal && (
                <div className="mt-4">
                  <RevealBadge reveal={card.reveal} />
                </div>
              )}
            </header>

            <section aria-labelledby="card-data-heading" className="space-y-4">
              <h2 id="card-data-heading" className="sr-only">
                Card data
              </h2>
              <CardStats card={card} />
              <CardRules card={card} paragraphs={paragraphs} />
              <CardFacts
                card={card}
                debutSet={debutSet}
                debutUpcoming={debutUpcoming}
                effectKeywords={keywords}
              />
            </section>

            <CardShopPanel card={card} />

            <PrintingsSection cardName={card.name} rows={rows} />
          </div>
        </div>

        <div className="mt-16 space-y-16 lg:mt-20">
          <RelatedDecks card={card} decks={related.decks} total={related.total} />
          <OtherVersions card={card} versions={versions} />
        </div>
      </div>
    </div>
  );
}
