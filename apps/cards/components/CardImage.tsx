import type { CardPrinting, NarutoCard } from "@naruto-tcg/types";
import { RARITY_META, cardImageSrc, generatedArtSrc, primaryPrinting } from "@/lib/meta";
import { FallbackImg } from "./FallbackImg";

/** Native card size in px at 10 px/mm (63 × 88 mm). */
export const CARD_WIDTH = 630;
export const CARD_HEIGHT = 880;

export function cardAltText(card: NarutoCard, printing: CardPrinting = primaryPrinting(card)): string {
  return `${card.name}${card.title ? `, ${card.title}` : ""} (${printing.number}, ${RARITY_META[printing.rarity].label})`;
}

const IMG_CLASS = "block aspect-[63/88] h-auto w-full rounded-[4.6%/3.3%] bg-shadow-800 object-cover";

/**
 * Card artwork at the physical 63:88 ratio with rounded card corners.
 * Uses a plain <img> so arbitrary scraped artwork hosts work without
 * next/image remote-pattern configuration. External artwork falls back to the
 * generated frame art if it fails to load.
 */
export function CardImage({
  card,
  printing = primaryPrinting(card),
  priority = false,
  sizes,
  alt,
  className = "",
}: {
  card: NarutoCard;
  printing?: CardPrinting;
  /** Eager-load above-the-fold images (e.g. the detail page hero). */
  priority?: boolean;
  sizes?: string;
  /** Override the generated alt text; pass "" when adjacent text already names the card. */
  alt?: string;
  className?: string;
}) {
  const src = cardImageSrc(card, printing);
  const fallbackSrc = generatedArtSrc(card, printing);
  const shared = {
    alt: alt ?? cardAltText(card, printing),
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    sizes,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
    decoding: "async" as const,
    draggable: false,
    className: `${IMG_CLASS} ${className}`,
  };
  // Generated art is same-origin and always present, so it needs no client fallback.
  return src === fallbackSrc ? <img src={src} {...shared} /> : <FallbackImg src={src} fallbackSrc={fallbackSrc} {...shared} />;
}
