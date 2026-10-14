import type { CardType, Element, NarutoCard, Rarity } from "@naruto-tcg/types";

export type { CardType, Element, Rarity };

/** A card after normalization: every gameplay-relevant field is present. */
export interface SimCard extends NarutoCard {
  element: Element;
  keywords: string[];
  cost: number;
  power: number;
  points: number;
  text: string;
}

export type CardDb = Readonly<Record<string, SimCard>>;
