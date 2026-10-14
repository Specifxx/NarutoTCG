import { FINISH_LABEL, RARITY_LABEL } from "@/lib/market/labels";
import type { CardMarketSummary, VendorQuote } from "@/lib/market/types";
import { vendorPriceRange } from "./pricing";

/**
 * schema.org Product with an AggregateOffer spanning every vendor's low to high price.
 * Omitted when no vendor quotes a price, since a Product without offers is invalid.
 */
export function ProductJsonLd({ summary, quotes }: { summary: CardMarketSummary; quotes: VendorQuote[] }) {
  const range = vendorPriceRange(quotes);
  if (!range) return null;
  const { card } = summary;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${card.name} (${card.setCode} ${card.number})`,
    sku: card.id,
    category: "Trading card",
    description: `${card.set} #${card.number}, ${RARITY_LABEL[card.rarity]}, ${FINISH_LABEL[card.finish]}.`,
    ...(card.imageUrl ? { image: card.imageUrl } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: range.low.toFixed(2),
      highPrice: range.high.toFixed(2),
      offerCount: summary.listingsCount,
    },
  };
  // JSON inside <script> must not be able to close the tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
