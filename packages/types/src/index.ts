export type CardType = "character" | "jutsu" | "mission" | "item" | "event";
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

export type EventType =
  | "premier-demo"
  | "convention-showcase"
  | "lgs-weekly"
  | "store-championship"
  | "regional";

export interface EventOrganizer {
  name: string;
  email: string;
  url?: string;
}

export interface NarutoEvent {
  id: string;
  title: string;
  type: EventType;
  description: string;
  startsAt: string;
  endsAt: string;
  storeSlug?: string;
  venueName: string;
  address: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  entryFee: number;
  currency: string;
  format: string;
  capacity: number;
  registered: number;
  organizer: EventOrganizer;
  registrationUrl: string;
  players: string[];
}

export interface StoreHours {
  day: string;
  hours: string;
}

export interface Store {
  slug: string;
  name: string;
  verified: boolean;
  description: string;
  address: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  website: string;
  hours: StoreHours[];
  socials: Array<{ label: string; url: string }>;
}
