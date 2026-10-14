import type { CardType, NarutoCard, Rarity } from "@naruto-tcg/types";

/** Look of the CSS-only card frames: no card art exists, so type, village and rarity carry the identity. */

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  leader: "Leader",
  character: "Character",
  jutsu: "Jutsu",
  mission: "Mission",
  item: "Item",
  event: "Event",
};

/** Frame gradient and rim per card type. */
export const CARD_TYPE_FRAME: Record<CardType, { background: string; border: string }> = {
  leader: { background: "linear-gradient(160deg, #6b3410 0%, #2a160b 48%, #151521 100%)", border: "#c44700" },
  character: { background: "linear-gradient(160deg, #1f3354 0%, #18213a 48%, #151521 100%)", border: "#34507d" },
  jutsu: { background: "linear-gradient(160deg, #3b2457 0%, #261a3d 48%, #151521 100%)", border: "#5d4189" },
  mission: { background: "linear-gradient(160deg, #164237 0%, #132c28 48%, #151521 100%)", border: "#2d6c5a" },
  item: { background: "linear-gradient(160deg, #2a2a3d 0%, #1f1f2e 48%, #151521 100%)", border: "#4a4a63" },
  event: { background: "linear-gradient(160deg, #2a2a3d 0%, #1f1f2e 48%, #151521 100%)", border: "#4a4a63" },
};

interface VillageStyle {
  accent: string;
  /** Decorative watermark glyph. */
  glyph: string;
}

const VILLAGES: Record<string, VillageStyle> = {
  Leaf: { accent: "#58b368", glyph: "葉" },
  Sand: { accent: "#d4a24c", glyph: "砂" },
  Mist: { accent: "#4fb3d9", glyph: "霧" },
  Cloud: { accent: "#c9cbe0", glyph: "雲" },
  Stone: { accent: "#a08870", glyph: "岩" },
  Sound: { accent: "#9a7bd1", glyph: "音" },
  Rain: { accent: "#6f88b5", glyph: "雨" },
  Akatsuki: { accent: "#d6404f", glyph: "暁" },
  "Hot Water": { accent: "#e08a6a", glyph: "湯" },
  Waterfall: { accent: "#5fc4b8", glyph: "滝" },
  Wave: { accent: "#5aa0d0", glyph: "波" },
  Myoboku: { accent: "#8fbf4a", glyph: "蛙" },
  Allied: { accent: "#e0c060", glyph: "連" },
};

const NEUTRAL_VILLAGE: VillageStyle = { accent: "#8d8da3", glyph: "忍" };

/** Accent color and watermark for a card's village; unknown and neutral villages share a gray. */
export function villageStyle(village: string | undefined): VillageStyle {
  return (village && VILLAGES[village]) || NEUTRAL_VILLAGE;
}

export const RARITY_MARK: Record<Rarity, { short: string; label: string; className: string }> = {
  common: { short: "C", label: "Common", className: "border-shadow-500 text-ash-300" },
  uncommon: { short: "U", label: "Uncommon", className: "border-ash-400 text-ash-100" },
  rare: { short: "R", label: "Rare", className: "border-chakra-600 text-chakra-300" },
  "super-rare": { short: "SR", label: "Super rare", className: "border-chakra-400 text-chakra-300" },
  "secret-rare": { short: "SEC", label: "Secret rare", className: "border-chakra-300 bg-chakra-500/20 text-white" },
  promo: { short: "P", label: "Promo", className: "border-ash-300 text-ash-100" },
};

/** "Character — Jonin · Team 7" */
export function typeLine(card: Pick<NarutoCard, "type" | "traits">): string {
  const traits = card.traits ?? [];
  return traits.length > 0 ? `${CARD_TYPE_LABEL[card.type]} — ${traits.join(" · ")}` : CARD_TYPE_LABEL[card.type];
}

/** Screen-reader name for a card tile, e.g. "Chidori, 2-cost Jutsu, 4 copies". */
export function cardLabel(card: Pick<NarutoCard, "name" | "type" | "cost" | "power">, quantity?: number): string {
  const kind = card.cost === undefined ? CARD_TYPE_LABEL[card.type] : `${card.cost}-cost ${CARD_TYPE_LABEL[card.type]}`;
  const parts = [card.name, kind];
  if (card.power !== undefined) parts.push(`${card.power} power`);
  if (quantity !== undefined) parts.push(`${quantity} ${quantity === 1 ? "copy" : "copies"}`);
  return parts.join(", ");
}
