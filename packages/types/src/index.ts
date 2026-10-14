export type CardType = "leader" | "character" | "jutsu" | "mission" | "item" | "event";
export type Rarity = "common" | "uncommon" | "rare" | "super-rare" | "secret-rare" | "promo";

export interface NarutoCard {
  id: string;
  name: string;
  set: string;
  number: string;
  type: CardType;
  rarity: Rarity;
  village?: string;
  cost?: number;
  power?: number;
  text?: string;
  imageUrl?: string;
  /** Free-form tribal/keyword traits such as "Uzumaki", "Akatsuki" or "Sannin". */
  traits?: string[];
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

export * from "./competitive";
