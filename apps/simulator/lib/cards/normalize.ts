import { CARD_TYPES, ELEMENTS, RARITIES } from "./meta";
import type { CardType, Element, Rarity, SimCard } from "./types";

const RARITY_ALIASES: Record<string, Rarity> = {
  c: "common",
  common: "common",
  uc: "uncommon",
  u: "uncommon",
  uncommon: "uncommon",
  r: "rare",
  rare: "rare",
  sr: "super-rare",
  "super rare": "super-rare",
  "super-rare": "super-rare",
  scr: "secret-rare",
  sec: "secret-rare",
  "secret rare": "secret-rare",
  "secret-rare": "secret-rare",
  ur: "secret-rare",
  p: "promo",
  pr: "promo",
  promo: "promo",
};

const TYPE_ALIASES: Record<string, CardType> = {
  ninja: "character",
  attachment: "item",
  tool: "item",
  equipment: "item",
  technique: "jutsu",
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function int(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function rarityOf(v: unknown): Rarity | undefined {
  const key = str(v)?.toLowerCase();
  if (!key) return undefined;
  if ((RARITIES as readonly string[]).includes(key)) return key as Rarity;
  return RARITY_ALIASES[key];
}

function typeOf(v: unknown): CardType | undefined {
  const key = str(v)?.toLowerCase();
  if (!key) return undefined;
  if ((CARD_TYPES as readonly string[]).includes(key)) return key as CardType;
  return TYPE_ALIASES[key];
}

function elementOf(v: unknown): Element {
  const key = str(v)?.toLowerCase();
  return key && (ELEMENTS as readonly string[]).includes(key) ? (key as Element) : "neutral";
}

function textOf(v: unknown): string {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string").join("\n");
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Turns untrusted JSON (the seed set or scraped data) into SimCards.
 * Accepts either an array of cards or `{ cards: [...] }`. Invalid entries are skipped with a warning.
 */
export function normalizeCards(raw: unknown): { cards: SimCard[]; warnings: string[] } {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { cards?: unknown }).cards)
      ? (raw as { cards: unknown[] }).cards
      : [];
  const warnings: string[] = [];
  const cards: SimCard[] = [];
  const seen = new Set<string>();

  list.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      warnings.push(`Entry ${index}: not an object.`);
      return;
    }
    const r = entry as Record<string, unknown>;
    const id = str(r.id);
    const name = str(r.name);
    const type = typeOf(r.type);
    if (!id || !name || !type) {
      warnings.push(`Entry ${index}: missing id, name or a known type.`);
      return;
    }
    if (seen.has(id)) {
      warnings.push(`Entry ${index}: duplicate id "${id}" skipped.`);
      return;
    }
    seen.add(id);
    const rarity = rarityOf(r.rarity);
    if (!rarity) warnings.push(`${id}: unknown rarity "${String(r.rarity)}", treated as common.`);
    const keywords = Array.isArray(r.keywords) ? r.keywords.filter((k): k is string => typeof k === "string") : [];

    cards.push({
      id,
      name,
      title: str(r.title),
      set: str(r.set) ?? "UNK",
      setName: str(r.setName),
      number: str(r.number) ?? "",
      type,
      rarity: rarity ?? "common",
      element: elementOf(r.element),
      village: str(r.village),
      keywords,
      cost: int(r.cost, 0),
      power: int(r.power, 0),
      points: int(r.points, 0),
      text: textOf(r.text),
      flavor: str(r.flavor),
      imageUrl: str(r.imageUrl),
      artist: str(r.artist),
      sourceUrl: str(r.sourceUrl),
    });
  });

  return { cards, warnings };
}
