import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Breadcrumbs } from "@/components/card/Breadcrumbs";
import { CardHero } from "@/components/card/CardHero";
import { buildVendorLinks, listingHref } from "@/components/card/links";
import { ListingsTable, type ListingRow } from "@/components/card/ListingsTable";
import { PriceHistoryChart } from "@/components/card/PriceHistoryChart";
import { ProductJsonLd } from "@/components/card/ProductJsonLd";
import { SectionHeader } from "@/components/card/SectionHeader";
import { VariantsList } from "@/components/card/VariantsList";
import { VendorComparisonTable } from "@/components/card/VendorComparisonTable";
import { getMarketStats } from "@/components/market/stats";
import { roundMoney } from "@/lib/market/analytics";
import { formatCount, formatUsd } from "@/lib/market/format";
import { FINISH_LABEL, RARITY_LABEL } from "@/lib/market/labels";
import { getMarketRepository } from "@/lib/market/repository";
import type { CardMarketDetail } from "@/lib/market/types";

/**
 * Rendered per request, never cached: prices and "updated X ago" stay current, and
 * arbitrary ids cannot fill a route cache. There is deliberately no loading.tsx here:
 * a Suspense boundary would flush a 200 before an unknown id could answer 404.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Shared by generateMetadata and the page so a request reads the card once. */
const loadCard = cache(async (rawId: string): Promise<CardMarketDetail | null> => {
  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    return null;
  }
  // No catalog id contains NUL, and PostgreSQL rejects it in text parameters (an error, not a miss).
  if (id.includes("\u0000")) return null;
  return getMarketRepository().getCardDetail(id);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const detail = await loadCard((await params).id);
  if (!detail) notFound();
  const { card, marketPrice } = detail.summary;
  const identity = `${card.name} (${card.setCode} ${card.number})`;
  const price = marketPrice != null ? `market price ${formatUsd(marketPrice)}` : "no market price yet";
  return {
    title: `${identity} price`,
    description: `${identity}, ${RARITY_LABEL[card.rarity]} ${FINISH_LABEL[card.finish].toLowerCase()}: ${price}. Compare TCGplayer, eBay and Cardmarket prices, live listings and 90-day price history.`,
  };
}

export default async function CardPage({ params }: PageProps) {
  const [detail, stats] = await Promise.all([loadCard((await params).id), getMarketStats()]);
  if (!detail) notFound();
  const { summary, quotes, listings, history, variants } = detail;
  const { card } = summary;
  const links = buildVendorLinks(card, quotes);
  const listingRows: ListingRow[] = listings.map((listing) => ({
    id: listing.id,
    vendor: listing.vendor,
    seller: listing.seller,
    condition: listing.condition,
    quantity: listing.quantity,
    currency: listing.currency,
    priceUsd: listing.priceUsd,
    shippingUsd: listing.shippingUsd,
    totalUsd: listing.totalUsd,
    nativeTotal: roundMoney(listing.price + (listing.shipping ?? 0)),
    href: listingHref(listing, links),
  }));
  const listingVendors = new Set(listings.map((l) => l.vendor)).size;

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <ProductJsonLd summary={summary} quotes={quotes} />
      <Breadcrumbs card={card} />
      <CardHero detail={detail} demoData={stats.demoData} links={links} />
      <VendorComparisonTable card={card} quotes={quotes} links={links} />
      <PriceHistoryChart history={history} changes={summary.changes} cardName={card.name} />
      <section aria-labelledby="listings-heading" className="mt-12">
        <SectionHeader
          id="listings-heading"
          title="Live listings"
          description={
            listings.length > 0
              ? `${formatCount(listings.length)} offers from ${listingVendors} ${listingVendors === 1 ? "marketplace" : "marketplaces"}, cheapest delivered total first.`
              : undefined
          }
        />
        <ListingsTable listings={listingRows} />
      </section>
      <VariantsList character={card.character} variants={variants} />
    </main>
  );
}
