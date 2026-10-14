import type { CardType, DeckEntry, Decklist, NarutoCard } from "@naruto-tcg/types";
import { CARD_INDEX } from "@/lib/data/cards";
import { RULES } from "@/lib/rules";

/** Layout, export and share-code helpers for decklists. The Leader is never part of the main deck. */

export type DeckSectionKey = "character" | "jutsu" | "mission" | "other";
export type DeckSectionTitle = "Characters" | "Jutsus" | "Missions" | "Other";

export interface DeckSection {
  key: DeckSectionKey;
  title: DeckSectionTitle;
  /** Total copies in the section. */
  count: number;
  /** Sorted by cost, then name. */
  entries: Array<{ card: NarutoCard; quantity: number }>;
}

export interface GroupedDecklist {
  leader: NarutoCard | null;
  /** In {@link DECK_SECTIONS} order; empty sections are omitted. */
  sections: DeckSection[];
  /** Ids missing from the card pool (the Leader's included); their cards are left out of `sections`. */
  unknownCardIds: string[];
}

export const DECK_SECTIONS: ReadonlyArray<{ key: DeckSectionKey; title: DeckSectionTitle }> = [
  { key: "character", title: "Characters" },
  { key: "jutsu", title: "Jutsus" },
  { key: "mission", title: "Missions" },
  { key: "other", title: "Other" },
];

/** Cost-curve buckets; costs of 7 and above are pooled. */
export const COST_BUCKETS = ["0", "1", "2", "3", "4", "5", "6", "7+"] as const;
export type CostBucket = (typeof COST_BUCKETS)[number];

export type CostCurvePoint = { cost: CostBucket } & Record<DeckSectionKey, number>;

const CARD_ID_PATTERN = /^[A-Za-z0-9-]+$/;
const ENTRY_PATTERN = /^([A-Za-z0-9-]+)x([1-9]\d*)$/;

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareCards(a: NarutoCard, b: NarutoCard): number {
  const cost = (card: NarutoCard) => card.cost ?? Number.MAX_SAFE_INTEGER;
  return cost(a) - cost(b) || a.name.localeCompare(b.name) || compareIds(a.id, b.id);
}

/** Display section for a card type; anything but Characters, Jutsus and Missions goes to "Other". */
export function sectionKey(type: CardType): DeckSectionKey {
  return type === "character" || type === "jutsu" || type === "mission" ? type : "other";
}

/** Copies per main-deck card id, merging duplicate entries, in first-seen order. */
export function cardCounts(decklist: Decklist): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { cardId, quantity } of decklist.cards) counts.set(cardId, (counts.get(cardId) ?? 0) + quantity);
  return counts;
}

/** The main deck as one id per physical card, ready to shuffle. */
export function expandDecklist(decklist: Decklist): string[] {
  return decklist.cards.flatMap(({ cardId, quantity }) => Array.from({ length: quantity }, () => cardId));
}

/** Splits a list into its Leader and Character / Jutsu / Mission / Other sections for display. */
export function groupDecklist(decklist: Decklist): GroupedDecklist {
  const leader = CARD_INDEX.get(decklist.leaderId) ?? null;
  const unknownCardIds = leader ? [] : [decklist.leaderId];
  const buckets = new Map<DeckSectionKey, DeckSection["entries"]>();
  for (const [cardId, quantity] of cardCounts(decklist)) {
    const card = CARD_INDEX.get(cardId);
    if (!card) {
      if (cardId !== decklist.leaderId) unknownCardIds.push(cardId);
      continue;
    }
    const key = sectionKey(card.type);
    const entries = buckets.get(key) ?? [];
    entries.push({ card, quantity });
    buckets.set(key, entries);
  }
  const sections = DECK_SECTIONS.flatMap(({ key, title }) => {
    const entries = buckets.get(key);
    if (!entries) return [];
    entries.sort((a, b) => compareCards(a.card, b.card));
    return [{ key, title, count: entries.reduce((sum, entry) => sum + entry.quantity, 0), entries }];
  });
  return { leader, sections, unknownCardIds };
}

/** Copies per cost bucket and section, over known main-deck cards that have a cost. */
export function costCurve(decklist: Decklist): CostCurvePoint[] {
  const points = COST_BUCKETS.map((cost) => ({ cost, character: 0, jutsu: 0, mission: 0, other: 0 }));
  for (const [cardId, quantity] of cardCounts(decklist)) {
    const card = CARD_INDEX.get(cardId);
    if (card?.cost === undefined) continue;
    points[Math.min(Math.max(0, Math.floor(card.cost)), COST_BUCKETS.length - 1)][sectionKey(card.type)] += quantity;
  }
  return points;
}

/** Main-deck copies per card type, over known cards. */
export function typeCounts(decklist: Decklist): Record<CardType, number> {
  const counts: Record<CardType, number> = { leader: 0, character: 0, jutsu: 0, mission: 0, item: 0, event: 0 };
  for (const [cardId, quantity] of cardCounts(decklist)) {
    const card = CARD_INDEX.get(cardId);
    if (card) counts[card.type] += quantity;
  }
  return counts;
}

/** Mean cost per main-deck copy, over cards that have a cost; 0 when there are none. */
export function averageCost(decklist: Decklist): number {
  let copies = 0;
  let total = 0;
  for (const [cardId, quantity] of cardCounts(decklist)) {
    const cost = CARD_INDEX.get(cardId)?.cost;
    if (cost === undefined) continue;
    copies += quantity;
    total += cost * quantity;
  }
  return copies > 0 ? total / copies : 0;
}

/**
 * Plain-text export: `Leader: <name> (<id>)`, then one block per section headed
 * `Characters (24)` with `4 <name> (<id>)` lines, and a final `Unknown (N)` block listing ids
 * missing from the card pool so the export never drops cards.
 */
export function decklistToText(decklist: Decklist, { includeIds = true }: { includeIds?: boolean } = {}): string {
  const { leader, sections, unknownCardIds } = groupDecklist(decklist);
  const label = (card: NarutoCard) => (includeIds ? `${card.name} (${card.id})` : card.name);
  const blocks = [`Leader: ${leader ? label(leader) : decklist.leaderId}`];
  for (const { title, count, entries } of sections) {
    blocks.push([`${title} (${count})`, ...entries.map(({ card, quantity }) => `${quantity} ${label(card)}`)].join("\n"));
  }
  const counts = cardCounts(decklist);
  const unknown = unknownCardIds.filter((id) => counts.has(id)).map((id) => [id, counts.get(id)!] as const);
  if (unknown.length > 0) {
    const total = unknown.reduce((sum, [, quantity]) => sum + quantity, 0);
    blocks.push([`Unknown (${total})`, ...unknown.map(([id, quantity]) => `${quantity} ${id}`)].join("\n"));
  }
  return blocks.join("\n\n");
}

/**
 * Compact URL-safe share code, `<leaderId>.<cardId>x<qty>...`, with entries merged and sorted
 * by id so every list has exactly one code, e.g. `NT02-L01.NT01-040x4.NT02-001x4`.
 * Throws on ids or quantities it cannot represent.
 */
export function encodeDecklist(decklist: Decklist): string {
  const entries = [...cardCounts(decklist)].sort(([a], [b]) => compareIds(a, b));
  for (const id of [decklist.leaderId, ...entries.map(([cardId]) => cardId)]) {
    if (!CARD_ID_PATTERN.test(id)) throw new RangeError(`Card id "${id}" cannot be encoded.`);
  }
  for (const [cardId, quantity] of entries) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > RULES.mainDeckSize) {
      throw new RangeError(`Quantity ${quantity} for ${cardId} cannot be encoded.`);
    }
  }
  return [decklist.leaderId, ...entries.map(([cardId, quantity]) => `${cardId}x${quantity}`)].join(".");
}

/**
 * Parses an {@link encodeDecklist} code. Strict: only the canonical form (ids in ascending
 * order, no duplicates, quantities 1–50 without leading zeros) is accepted; anything else is null.
 * Card ids are not checked against the pool; legality is a separate concern.
 */
export function decodeDecklist(code: string): Decklist | null {
  const [leaderId, ...parts] = code.split(".");
  if (!CARD_ID_PATTERN.test(leaderId)) return null;
  const cards: DeckEntry[] = [];
  for (const part of parts) {
    const match = ENTRY_PATTERN.exec(part);
    if (!match) return null;
    const [, cardId, digits] = match;
    const quantity = Number(digits);
    const previous = cards[cards.length - 1];
    if (quantity > RULES.mainDeckSize || (previous && compareIds(previous.cardId, cardId) >= 0)) return null;
    cards.push({ cardId, quantity });
  }
  return { leaderId, cards };
}

/**
 * Up to `n` highlight card ids for previews, ranked by signature status, then copies, then
 * cost (highest first). Only known main-deck cards are considered.
 */
export function keyCards(decklist: Decklist, signatureCardIds: readonly string[], n = 3): string[] {
  const signature = new Set(signatureCardIds);
  return [...cardCounts(decklist)]
    .flatMap(([cardId, quantity]) => {
      const card = CARD_INDEX.get(cardId);
      return card ? [{ cardId, quantity, cost: card.cost ?? 0, signature: signature.has(cardId) }] : [];
    })
    .sort(
      (a, b) =>
        Number(b.signature) - Number(a.signature) || b.quantity - a.quantity || b.cost - a.cost || compareIds(a.cardId, b.cardId),
    )
    .slice(0, n)
    .map(({ cardId }) => cardId);
}
