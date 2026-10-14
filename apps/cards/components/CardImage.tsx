import type { CardPrinting, NarutoCard } from "@naruto-tcg/types";
import { RARITY_META, cardImageSrc, primaryPrinting } from "@/lib/meta";

/** Native card size in px at 10 px/mm (63 × 88 mm). */
export const CARD_WIDTH = 630;
export const CARD_HEIGHT = 880;

/**
 * Card artwork at the physical 63:88 ratio with rounded card corners.
 * Uses a plain <img> so arbitrary scraped artwork hosts work without
 * next/image remote-pattern configuration.
 */
export function CardImage({
  card,
  printing = primaryPrinting(card),
  priority = false,
  sizes,
  className = "",
}: {
  card: NarutoCard;
  printing?: CardPrinting;
  /** Eager-load above-the-fold images (e.g. the detail page hero). */
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <img
      src={cardImageSrc(card, printing)}
      alt={`${card.name}${card.title ? `, ${card.title}` : ""} (${printing.number}, ${RARITY_META[printing.rarity].label})`}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className={`block aspect-[63/88] h-auto w-full rounded-[4.6%/3.3%] bg-shadow-800 object-cover ${className}`}
    />
  );
}
