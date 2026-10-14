import type { CardType, Element, Rarity, SimCard } from "./types";

export const ELEMENTS: readonly Element[] = ["fire", "wind", "lightning", "earth", "water", "yin", "yang", "neutral"];

export const ELEMENT_META: Record<Element, { label: string; kanji: string; color: string; glow: string }> = {
  fire: { label: "Fire", kanji: "火", color: "#ff5a1f", glow: "rgba(255,90,31,0.45)" },
  wind: { label: "Wind", kanji: "風", color: "#3fd6a5", glow: "rgba(63,214,165,0.4)" },
  lightning: { label: "Lightning", kanji: "雷", color: "#ffd23f", glow: "rgba(255,210,63,0.4)" },
  earth: { label: "Earth", kanji: "土", color: "#c08a4a", glow: "rgba(192,138,74,0.4)" },
  water: { label: "Water", kanji: "水", color: "#3f9dff", glow: "rgba(63,157,255,0.42)" },
  yin: { label: "Yin", kanji: "陰", color: "#9a6bff", glow: "rgba(154,107,255,0.42)" },
  yang: { label: "Yang", kanji: "陽", color: "#ffe7a3", glow: "rgba(255,231,163,0.35)" },
  neutral: { label: "Neutral", kanji: "無", color: "#9aa0b4", glow: "rgba(154,160,180,0.3)" },
};

export const RARITIES: readonly Rarity[] = ["common", "uncommon", "rare", "super-rare", "secret-rare", "promo"];

export const RARITY_META: Record<Rarity, { label: string; short: string; color: string }> = {
  common: { label: "Common", short: "C", color: "#9aa0b4" },
  uncommon: { label: "Uncommon", short: "UC", color: "#5fd0a0" },
  rare: { label: "Rare", short: "R", color: "#4aa8ff" },
  "super-rare": { label: "Super Rare", short: "SR", color: "#c27bff" },
  "secret-rare": { label: "Secret Rare", short: "SCR", color: "#ffcf4a" },
  promo: { label: "Promo", short: "P", color: "#ff6b8b" },
};

export const CARD_TYPES: readonly CardType[] = ["leader", "character", "jutsu", "item", "mission", "event"];

export const TYPE_META: Record<CardType, { label: string; plural: string }> = {
  leader: { label: "Leader", plural: "Leaders" },
  character: { label: "Character", plural: "Characters" },
  jutsu: { label: "Jutsu", plural: "Jutsu" },
  item: { label: "Item", plural: "Items" },
  mission: { label: "Mission", plural: "Missions" },
  event: { label: "Event", plural: "Events" },
};

/** Card types that go in the 40-card main deck. */
export const MAIN_DECK_TYPES: ReadonlySet<CardType> = new Set<CardType>(["character", "jutsu", "item"]);

/** The name the copy limit counts: name plus version title. */
export function fullName(card: Pick<SimCard, "name" | "title">): string {
  return card.title ? `${card.name} — ${card.title}` : card.name;
}

export function compareByCost(a: SimCard, b: SimCard): number {
  return a.cost - b.cost || a.name.localeCompare(b.name) || (a.title ?? "").localeCompare(b.title ?? "");
}

export function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r);
}
