// Canonical Naruto TCG domain model shared by every app on the platform.
// Enum-like unions are derived from `as const` tuples so runtime validators
// and UI option lists can iterate the exact same values the types allow.

export const CARD_TYPES = ["leader", "character", "mission", "jutsu"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CHAKRA_ELEMENTS = ["fire", "water", "lightning", "earth", "wind"] as const;
export type ChakraElement = (typeof CHAKRA_ELEMENTS)[number];

/** Ordered from most to least common. */
export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "super-rare",
  "parallel-rare",
  "secret-rare",
  "promo",
] as const;
export type Rarity = (typeof RARITIES)[number];

/** How a printing differs from the card's base artwork. */
export const PRINTING_VARIANTS = ["standard", "parallel", "alt-art", "promo"] as const;
export type PrintingVariant = (typeof PRINTING_VARIANTS)[number];

export const SET_KINDS = ["starter", "booster", "promo"] as const;
export type SetKind = (typeof SET_KINDS)[number];

/** One physical printing of a card in a specific product. */
export interface CardPrinting {
  /** References `CardSet.id`. */
  setId: string;
  /** Collector number as printed on the card, e.g. "ST01-001" or "P-007". */
  number: string;
  rarity: Rarity;
  variant: PrintingVariant;
  /** Artwork for this specific printing (overrides `NarutoCard.imageUrl`). */
  imageUrl?: string;
}

/** Where and when a card was first revealed ahead of release. */
export interface CardReveal {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Human-readable source name. */
  source: string;
  /** Link to the reveal article or post. */
  url: string;
}

export interface NarutoCard {
  /** Unique, URL-safe card ID, e.g. "NR01-001". */
  id: string;
  name: string;
  /** Epithet printed under the name, e.g. "The Third Hokage". */
  title?: string;
  type: CardType;
  element: ChakraElement;
  /** Chakra cost to play. Leaders have no cost. */
  cost?: number;
  /** Battle power. Required for leaders and characters. */
  power?: number;
  /** Character tags such as "Leaf Village" or "Akatsuki". */
  traits: string[];
  /** Rules keywords such as "Rush" or "Blocker". */
  keywords: string[];
  /** Full rules text. Empty for vanilla cards. */
  effect: string;
  flavor?: string;
  artist?: string;
  /** Base artwork for the card's standard printings. */
  imageUrl?: string;
  /** Every printing of this card; the first entry is its debut printing. */
  printings: CardPrinting[];
  reveal?: CardReveal;
}

export interface CardSet {
  /** Set code, e.g. "ST01". */
  id: string;
  name: string;
  shortName: string;
  kind: SetKind;
  /** ISO date, YYYY-MM-DD. */
  releaseDate: string;
  /** Number of distinct collector numbers in the finished set. */
  totalCards: number;
  description?: string;
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
  /** Leader card ID; the leader is not part of `cards`. */
  leaderId?: string;
  archetype?: string;
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
