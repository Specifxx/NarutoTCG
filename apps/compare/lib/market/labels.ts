import type { CardCondition, CardFinish, CardType, Rarity, SortKey } from "./types";

export const CARD_TYPES = ["character", "jutsu", "mission", "item", "event"] as const satisfies readonly CardType[];

export const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "super-rare",
  "secret-rare",
  "parallel",
  "promo",
];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  "super-rare": "Super Rare",
  "secret-rare": "Secret Rare",
  parallel: "Parallel",
  promo: "Promo",
};

export const FINISH_ORDER: CardFinish[] = ["non-foil", "foil", "textured-foil"];

export const FINISH_LABEL: Record<CardFinish, string> = {
  "non-foil": "Non-foil",
  foil: "Foil",
  "textured-foil": "Textured foil",
};

export const CONDITION_ORDER: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG"];

export const CONDITION_LABEL: Record<CardCondition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "change7-desc", label: "7-day change: biggest gain" },
  { value: "change7-asc", label: "7-day change: biggest drop" },
  { value: "change30-desc", label: "30-day change: biggest gain" },
  { value: "change30-asc", label: "30-day change: biggest drop" },
  { value: "name-asc", label: "Name: A to Z" },
];

export const DEFAULT_SORT: SortKey = "price-desc";

export function isRarity(value: unknown): value is Rarity {
  return typeof value === "string" && (RARITY_ORDER as string[]).includes(value);
}

export function isFinish(value: unknown): value is CardFinish {
  return typeof value === "string" && (FINISH_ORDER as string[]).includes(value);
}

export function isCondition(value: unknown): value is CardCondition {
  return typeof value === "string" && (CONDITION_ORDER as string[]).includes(value);
}

export function isSortKey(value: unknown): value is SortKey {
  return typeof value === "string" && SORT_OPTIONS.some((o) => o.value === value);
}
