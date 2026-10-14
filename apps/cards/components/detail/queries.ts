// Server-only derived data for the card detail page. Indexes are built lazily,
// once per server process, so prerendering thousands of pages stays linear.
import "server-only";
import type { CardSet, CardType, Deck, NarutoCard } from "@naruto-tcg/types";
import { getAllCards, getCard, getDeckAppearances, getSet, getSetEntries } from "@/lib/data";
import { CARD_TYPES, primaryPrinting } from "@/lib/meta";

const foldName = (name: string) => name.trim().toLowerCase();

let cardsByName: Map<string, NarutoCard[]> | undefined;

/** Other cards that share this card's name (different titles / printings of the character). */
export function getOtherVersions(card: NarutoCard): NarutoCard[] {
  if (!cardsByName) {
    cardsByName = new Map();
    for (const candidate of getAllCards()) {
      const key = foldName(candidate.name);
      const list = cardsByName.get(key) ?? [];
      list.push(candidate);
      cardsByName.set(key, list);
    }
  }
  return (cardsByName.get(foldName(card.name)) ?? []).filter((candidate) => candidate.id !== card.id);
}

const sequenceBySet = new Map<string, readonly NarutoCard[]>();

/**
 * Distinct cards of a set in collector-number order, standard printings only.
 * Parallels and promo stamps share their base card's slot, so they are skipped.
 */
function setSequence(setId: string, standardOnly: boolean): readonly NarutoCard[] {
  const cacheKey = `${setId}:${standardOnly ? "standard" : "all"}`;
  const cached = sequenceBySet.get(cacheKey);
  if (cached) return cached;
  const seen = new Set<string>();
  const list: NarutoCard[] = [];
  for (const entry of getSetEntries(setId)) {
    if (standardOnly && entry.printing.variant !== "standard") continue;
    if (seen.has(entry.card.id)) continue;
    seen.add(entry.card.id);
    list.push(entry.card);
  }
  sequenceBySet.set(cacheKey, list);
  return list;
}

export interface CardNeighbors {
  setId: string;
  set: CardSet | undefined;
  /** 1-based position within the debut set, or 0 when the card is not in the sequence. */
  position: number;
  total: number;
  prev?: NarutoCard;
  next?: NarutoCard;
}

/** Previous/next cards in the order of the card's debut set. */
export function getCardNeighbors(card: NarutoCard): CardNeighbors {
  const setId = primaryPrinting(card).setId;
  let sequence = setSequence(setId, true);
  let index = sequence.findIndex((candidate) => candidate.id === card.id);
  if (index === -1) {
    // Debut printing is not a standard one (e.g. a promo-only card): fall back to every printing.
    sequence = setSequence(setId, false);
    index = sequence.findIndex((candidate) => candidate.id === card.id);
  }
  const prev = index > 0 ? sequence[index - 1] : undefined;
  const next = index >= 0 ? sequence[index + 1] : undefined;
  return {
    setId,
    set: getSet(setId),
    position: index + 1,
    total: sequence.length,
    ...(prev && { prev }),
    ...(next && { next }),
  };
}

export interface DecklistLine {
  cardId: string;
  card: NarutoCard | undefined;
  quantity: number;
}

export interface DecklistGroup {
  type: CardType | "unknown";
  count: number;
  lines: DecklistLine[];
}

export interface RelatedDeck {
  deck: Deck;
  /** Copies of the viewed card in the main deck (0 when it is only the leader). */
  quantity: number;
  asLeader: boolean;
  leader: NarutoCard | undefined;
  /** Total main-deck cards (excluding the leader). */
  mainCount: number;
  groups: readonly DecklistGroup[];
}

function compareLines(a: DecklistLine, b: DecklistLine): number {
  const costA = a.card?.cost ?? Number.POSITIVE_INFINITY;
  const costB = b.card?.cost ?? Number.POSITIVE_INFINITY;
  return costA - costB || (a.card?.name ?? a.cardId).localeCompare(b.card?.name ?? b.cardId, "en");
}

const GROUP_ORDER: readonly (CardType | "unknown")[] = [...CARD_TYPES, "unknown"];
const groupsByDeck = new Map<string, readonly DecklistGroup[]>();

/** Decklist grouped by card type, each group sorted by cost then name. Cached per deck. */
function groupDecklist(deck: Deck): readonly DecklistGroup[] {
  const cached = groupsByDeck.get(deck.id);
  if (cached) return cached;
  const byType = new Map<CardType | "unknown", DecklistLine[]>();
  for (const entry of deck.cards) {
    const card = getCard(entry.cardId);
    const type = card?.type ?? "unknown";
    const lines = byType.get(type) ?? [];
    lines.push({ cardId: entry.cardId, card, quantity: entry.quantity });
    byType.set(type, lines);
  }
  const groups = GROUP_ORDER.flatMap((type) => {
    const lines = byType.get(type);
    if (!lines || lines.length === 0) return [];
    lines.sort(compareLines);
    return [{ type, count: lines.reduce((sum, line) => sum + line.quantity, 0), lines }];
  });
  groupsByDeck.set(deck.id, groups);
  return groups;
}

export interface RelatedDecks {
  decks: RelatedDeck[];
  /** Number of distinct decks that use the card, including those beyond `limit`. */
  total: number;
}

/**
 * Decks that include the card (as leader or in the main deck), one entry per
 * deck, leader appearances first. Only the first `limit` decks are expanded.
 */
export function getRelatedDecks(cardId: string, limit: number): RelatedDecks {
  const merged = new Map<string, { deck: Deck; quantity: number; asLeader: boolean }>();
  for (const { deck, quantity, asLeader } of getDeckAppearances(cardId)) {
    const existing = merged.get(deck.id);
    if (existing) {
      existing.quantity += quantity;
      existing.asLeader ||= asLeader;
    } else {
      merged.set(deck.id, { deck, quantity, asLeader });
    }
  }
  const decks = [...merged.values()].slice(0, Math.max(0, limit)).map(({ deck, quantity, asLeader }) => ({
    deck,
    quantity,
    asLeader,
    leader: deck.leaderId ? getCard(deck.leaderId) : undefined,
    mainCount: deck.cards.reduce((sum, entry) => sum + entry.quantity, 0),
    groups: groupDecklist(deck),
  }));
  return { decks, total: merged.size };
}
