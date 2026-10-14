export type CardType = "leader" | "character" | "jutsu" | "mission" | "item" | "event";
export type Rarity = "common" | "uncommon" | "rare" | "super-rare" | "secret-rare" | "promo";
export type Element = "fire" | "wind" | "lightning" | "earth" | "water" | "yin" | "yang" | "neutral";

export interface NarutoCard {
  id: string;
  name: string;
  /** Version subtitle, e.g. "Sage Mode". Cards sharing `name` can Upgrade into each other. */
  title?: string;
  set: string;
  setName?: string;
  number: string;
  type: CardType;
  rarity: Rarity;
  element?: Element;
  village?: string;
  /** Traits such as "Team 7", "Sannin" or "Jinchuriki". */
  keywords?: string[];
  cost?: number;
  power?: number;
  /** Mission cards only: printed points before the rank bonus. */
  points?: number;
  text?: string;
  flavor?: string;
  imageUrl?: string;
  artist?: string;
  sourceUrl?: string;
}

export interface DeckEntry {
  cardId: string;
  quantity: number;
}

export interface Deck {
  id: string;
  name: string;
  owner?: string;
  description?: string;
  cards: DeckEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceRecord {
  cardId: string;
  source: string;
  currency: string;
  price: number;
  condition?: "NM" | "LP" | "MP" | "HP" | "DMG";
  url?: string;
  recordedAt: string;
}
