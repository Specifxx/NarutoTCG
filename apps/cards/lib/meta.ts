// Client-safe presentation metadata and pure helpers shared across the app.
// Tailwind class strings are spelled out in full so the scanner can see them.
import {
  CARD_TYPES,
  CHAKRA_ELEMENTS,
  RARITIES,
  type CardPrinting,
  type CardSet,
  type CardType,
  type ChakraElement,
  type NarutoCard,
  type PrintingVariant,
  type Rarity,
  type SetKind,
} from "@naruto-tcg/types";

export { CARD_TYPES, CHAKRA_ELEMENTS, RARITIES };

export const TYPE_META: Record<CardType, { label: string; plural: string; blurb: string }> = {
  leader: { label: "Leader", plural: "Leaders", blurb: "Leads your deck and sets its strategy." },
  character: { label: "Character", plural: "Characters", blurb: "Shinobi you deploy to attack and defend." },
  mission: { label: "Mission", plural: "Missions", blurb: "Persistent objectives that reward progress." },
  jutsu: { label: "Jutsu", plural: "Jutsu", blurb: "One-shot techniques and counters." },
};

export interface ElementMeta {
  label: string;
  kanji: string;
  /** Raw color for SVG/inline styles. */
  hex: string;
  text: string;
  badge: string;
  ring: string;
  glow: string;
}

export const ELEMENT_META: Record<ChakraElement, ElementMeta> = {
  fire: {
    label: "Fire",
    kanji: "火",
    hex: "#ff5b2e",
    text: "text-fire",
    badge: "border-fire/40 bg-fire/10 text-fire",
    ring: "ring-fire/60",
    glow: "shadow-fire/30",
  },
  water: {
    label: "Water",
    kanji: "水",
    hex: "#3b9dff",
    text: "text-water",
    badge: "border-water/40 bg-water/10 text-water",
    ring: "ring-water/60",
    glow: "shadow-water/30",
  },
  lightning: {
    label: "Lightning",
    kanji: "雷",
    hex: "#ffd23f",
    text: "text-lightning",
    badge: "border-lightning/40 bg-lightning/10 text-lightning",
    ring: "ring-lightning/60",
    glow: "shadow-lightning/30",
  },
  earth: {
    label: "Earth",
    kanji: "土",
    hex: "#d0914f",
    text: "text-earth",
    badge: "border-earth/40 bg-earth/10 text-earth",
    ring: "ring-earth/60",
    glow: "shadow-earth/30",
  },
  wind: {
    label: "Wind",
    kanji: "風",
    hex: "#3fdc9a",
    text: "text-wind",
    badge: "border-wind/40 bg-wind/10 text-wind",
    ring: "ring-wind/60",
    glow: "shadow-wind/30",
  },
};

/** Foil treatment used by the card image effects. */
export type FoilKind = "none" | "glare" | "holo" | "gold";

export interface RarityMeta {
  label: string;
  /** Short code printed on cards. */
  code: string;
  /** Higher is rarer; used for sorting and "best printing" picks. */
  rank: number;
  badge: string;
  foil: FoilKind;
}

export const RARITY_META: Record<Rarity, RarityMeta> = {
  common: { label: "Common", code: "C", rank: 0, badge: "border-shadow-500 bg-shadow-800 text-ash-200", foil: "none" },
  uncommon: {
    label: "Uncommon",
    code: "UC",
    rank: 1,
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    foil: "none",
  },
  rare: { label: "Rare", code: "R", rank: 2, badge: "border-sky-400/40 bg-sky-400/10 text-sky-300", foil: "glare" },
  "super-rare": {
    label: "Super Rare",
    code: "SR",
    rank: 3,
    badge: "border-violet-400/50 bg-violet-400/10 text-violet-300",
    foil: "holo",
  },
  "parallel-rare": {
    label: "Parallel Rare",
    code: "PR",
    rank: 5,
    badge: "border-fuchsia-400/50 bg-gradient-to-r from-fuchsia-500/20 via-cyan-400/20 to-amber-300/20 text-fuchsia-200",
    foil: "holo",
  },
  "secret-rare": {
    label: "Secret Rare",
    code: "SEC",
    rank: 6,
    badge: "border-amber-300/60 bg-gradient-to-r from-amber-500/25 to-yellow-200/20 text-amber-200",
    foil: "gold",
  },
  promo: { label: "Promo", code: "P", rank: 4, badge: "border-chakra-500/50 bg-chakra-500/10 text-chakra-400", foil: "glare" },
};

export const VARIANT_LABEL: Record<PrintingVariant, string> = {
  standard: "Standard",
  parallel: "Parallel Art",
  "alt-art": "Alternate Art",
  promo: "Promo Stamp",
};

export const SET_KIND_LABEL: Record<SetKind, string> = {
  starter: "Starter Deck",
  booster: "Booster Set",
  promo: "Promo",
};

/** Stable identity for a printing, used as the collection-tracking key. */
export function printingKey(printing: Pick<CardPrinting, "setId" | "number" | "variant">): string {
  return `${printing.setId}:${printing.number}:${printing.variant}`;
}

/** Debut printing. The validator guarantees at least one exists. */
export function primaryPrinting(card: NarutoCard): CardPrinting {
  const first = card.printings[0];
  if (!first) throw new Error(`Card ${card.id} has no printings`);
  return first;
}

/** Distinct rarities across all printings, rarest first. */
export function cardRarities(card: NarutoCard): Rarity[] {
  return [...new Set(card.printings.map((p) => p.rarity))].sort((a, b) => RARITY_META[b].rank - RARITY_META[a].rank);
}

/** Distinct set IDs the card is printed in, in printing order. */
export function cardSetIds(card: NarutoCard): string[] {
  return [...new Set(card.printings.map((p) => p.setId))];
}

/**
 * Image URL for a printing. Precedence: the printing's own artwork, then the
 * card's base artwork (standard printings only), then generated frame art.
 */
export function cardImageSrc(card: NarutoCard, printing: CardPrinting = primaryPrinting(card)): string {
  if (printing.imageUrl) return printing.imageUrl;
  if (card.imageUrl && printing.variant === "standard") return card.imageUrl;
  return `/art/${encodeURIComponent(card.id)}/${printing.variant}`;
}

export function cardHref(id: string): `/card/${string}` {
  return `/card/${encodeURIComponent(id)}`;
}

export function setHref(id: string): `/sets/${string}` {
  return `/sets/${encodeURIComponent(id)}`;
}

/** Natural ordering for collector numbers and IDs ("ST01-2" < "ST01-10"). */
export function compareCollectorNumbers(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const DATE_FORMAT_LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Parse an ISO YYYY-MM-DD date as UTC midnight so output never shifts by timezone. */
export function parseIsoDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(parseIsoDate(iso));
}

export function formatDateLong(iso: string): string {
  return DATE_FORMAT_LONG.format(parseIsoDate(iso));
}

/** Today's date as YYYY-MM-DD (UTC). Static pages evaluate this at build time. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isReleased(set: Pick<CardSet, "releaseDate">, today: string = todayIso()): boolean {
  return set.releaseDate <= today;
}

/** Whole days from `from` to `to` (both ISO dates). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

export function formatPower(power: number | undefined): string {
  return power === undefined ? "—" : power.toLocaleString("en-US");
}

export function formatCost(cost: number | undefined): string {
  return cost === undefined ? "—" : String(cost);
}
