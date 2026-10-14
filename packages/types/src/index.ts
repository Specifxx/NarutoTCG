export type CardType = "character" | "jutsu" | "mission" | "item" | "event";
export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "super-rare"
  | "secret-rare"
  | "parallel"
  | "promo";

/** Print finish of a specific printing. Each finish is a separately priced product. */
export type CardFinish = "non-foil" | "foil" | "textured-foil";
export type CardCondition = "NM" | "LP" | "MP" | "HP" | "DMG";

/** Marketplaces tracked by the price compare app. */
export type VendorId = "tcgplayer" | "ebay" | "cardmarket";
export type CurrencyCode = "USD" | "EUR";

export interface NarutoCard {
  id: string;
  name: string;
  set: string;
  number: string;
  type: CardType;
  rarity: Rarity;
  finish?: CardFinish;
  village?: string;
  cost?: number;
  power?: number;
  text?: string;
  imageUrl?: string;
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
  condition?: CardCondition;
  url?: string;
  recordedAt: string;
}
