import type { Deck, DeckEntry } from "@naruto-tcg/types";
import { fullName, MAIN_DECK_TYPES } from "../cards/meta";
import type { CardDb, SimCard } from "../cards/types";
import { FORMAT } from "../game-engine/format";
import type { DeckSetup } from "../game-engine/types";

export interface DeckParts {
  leaders: Array<{ card: SimCard; quantity: number }>;
  missions: Array<{ card: SimCard; quantity: number }>;
  main: Array<{ card: SimCard; quantity: number }>;
  other: Array<{ card: SimCard; quantity: number }>;
  missing: DeckEntry[];
}

export function newDeckId(): string {
  return `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyDeck(name = "Untitled Deck"): Deck {
  const now = new Date().toISOString();
  return { id: newDeckId(), name, cards: [], createdAt: now, updatedAt: now };
}

export function quantityOf(deck: Deck, cardId: string): number {
  return deck.cards.find((e) => e.cardId === cardId)?.quantity ?? 0;
}

export function splitDeck(deck: Deck, db: CardDb): DeckParts {
  const parts: DeckParts = { leaders: [], missions: [], main: [], other: [], missing: [] };
  for (const entry of deck.cards) {
    const card = db[entry.cardId];
    if (!card) {
      parts.missing.push(entry);
      continue;
    }
    const row = { card, quantity: entry.quantity };
    if (card.type === "leader") parts.leaders.push(row);
    else if (card.type === "mission") parts.missions.push(row);
    else if (MAIN_DECK_TYPES.has(card.type)) parts.main.push(row);
    else parts.other.push(row);
  }
  return parts;
}

export function mainCount(deck: Deck, db: CardDb): number {
  return splitDeck(deck, db).main.reduce((n, r) => n + r.quantity, 0);
}

/** Copies of cards sharing this card's full name (name + title). */
export function copiesOfName(deck: Deck, db: CardDb, card: SimCard): number {
  const key = fullName(card).toLowerCase();
  return deck.cards.reduce((n, e) => {
    const c = db[e.cardId];
    return c && fullName(c).toLowerCase() === key ? n + e.quantity : n;
  }, 0);
}

/** Why a card cannot be added, or null. Leaders replace the current Leader. */
export function addBlocker(deck: Deck, db: CardDb, card: SimCard): string | null {
  if (card.type === "event") return "Event cards are not playable in this format.";
  if (card.type === "leader") return null;
  if (card.type === "mission") {
    const parts = splitDeck(deck, db);
    const count = parts.missions.reduce((n, r) => n + r.quantity, 0);
    if (parts.missions.some((r) => r.card.name.toLowerCase() === card.name.toLowerCase()))
      return "Each mission must have a different name.";
    if (count >= FORMAT.missionCount) return `A deck has exactly ${FORMAT.missionCount} missions.`;
    return null;
  }
  if (copiesOfName(deck, db, card) >= FORMAT.maxCopiesPerName)
    return `Max ${FORMAT.maxCopiesPerName} copies of ${fullName(card)}.`;
  if (mainCount(deck, db) >= FORMAT.mainDeckSize) return `Main deck is full (${FORMAT.mainDeckSize}).`;
  return null;
}

export function withCardAdded(deck: Deck, db: CardDb, card: SimCard): Deck {
  let cards = deck.cards;
  if (card.type === "leader") {
    cards = cards.filter((e) => db[e.cardId]?.type !== "leader");
    cards = [...cards, { cardId: card.id, quantity: 1 }];
  } else if (cards.some((e) => e.cardId === card.id)) {
    cards = cards.map((e) => (e.cardId === card.id ? { ...e, quantity: e.quantity + 1 } : e));
  } else {
    cards = [...cards, { cardId: card.id, quantity: 1 }];
  }
  return { ...deck, cards, updatedAt: new Date().toISOString() };
}

export function withCardRemoved(deck: Deck, cardId: string, all = false): Deck {
  const cards = deck.cards
    .map((e) => (e.cardId === cardId ? { ...e, quantity: all ? 0 : e.quantity - 1 } : e))
    .filter((e) => e.quantity > 0);
  return { ...deck, cards, updatedAt: new Date().toISOString() };
}

/** Expands a deck into the engine's setup shape (one id per copy). */
export function toDeckSetup(deck: Deck, db: CardDb): DeckSetup {
  const parts = splitDeck(deck, db);
  const expand = (rows: DeckParts["main"]) => rows.flatMap((r) => Array<string>(r.quantity).fill(r.card.id));
  return {
    name: deck.name,
    leaderId: parts.leaders[0]?.card.id ?? "",
    missionIds: expand(parts.missions),
    mainIds: expand(parts.main),
  };
}
