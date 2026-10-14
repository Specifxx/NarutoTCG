// Server-only access to the validated card dataset. The JSON files are
// validated once per server process; any error fails `next build` loudly,
// and warnings are logged without failing it.
import "server-only";
import type { CardPrinting, CardSet, Deck, NarutoCard } from "@naruto-tcg/types";
import cardsJson from "../public/data/cards.json";
import decksJson from "../public/data/decks.json";
import setsJson from "../public/data/sets.json";
import { RARITY_META, compareCollectorNumbers, primaryPrinting, printingKey } from "./meta";
import { orderPrintingsByRelease, validateDataset, type Dataset } from "./schema";

function loadDataset(): Dataset {
  const { data, errors, warnings } = validateDataset({ cards: cardsJson, sets: setsJson, decks: decksJson });
  if (errors.length > 0) {
    throw new Error(
      `public/data contains ${errors.length} invalid record(s). Run \`pnpm --filter @naruto-tcg/cards validate:data\`.\n  - ${errors.join("\n  - ")}`,
    );
  }
  if (warnings.length > 0) {
    console.warn(
      `public/data has ${warnings.length} warning(s); \`pnpm --filter @naruto-tcg/cards validate:data\` fails on these.\n  - ${warnings.join("\n  - ")}`,
    );
  }
  // printings[0] drives the debut set, canonical order, breadcrumbs and pager,
  // so never trust the listed order.
  return { ...data, cards: orderPrintingsByRelease(data.cards, data.sets) };
}

const dataset = loadDataset();

const setById = new Map(dataset.sets.map((set) => [set.id, set]));
const setsByRelease: readonly CardSet[] = [...dataset.sets].sort(
  (a, b) => a.releaseDate.localeCompare(b.releaseDate) || compareCollectorNumbers(a.id, b.id),
);
const setOrder = new Map(setsByRelease.map((set, i) => [set.id, i]));

/** Canonical order: debut set release, then collector number. */
const cards: readonly NarutoCard[] = [...dataset.cards].sort((a, b) => {
  const pa = primaryPrinting(a);
  const pb = primaryPrinting(b);
  return (
    (setOrder.get(pa.setId) ?? 0) - (setOrder.get(pb.setId) ?? 0) ||
    compareCollectorNumbers(pa.number, pb.number) ||
    compareCollectorNumbers(a.id, b.id)
  );
});
const cardById = new Map(cards.map((card) => [card.id, card]));

export interface SetEntry {
  card: NarutoCard;
  printing: CardPrinting;
  /** `printingKey(printing)`, precomputed for collection tracking. */
  key: string;
}

const entriesBySet = new Map<string, SetEntry[]>();
for (const card of cards) {
  for (const printing of card.printings) {
    const list = entriesBySet.get(printing.setId) ?? [];
    list.push({ card, printing, key: printingKey(printing) });
    entriesBySet.set(printing.setId, list);
  }
}
for (const list of entriesBySet.values()) {
  list.sort(
    (a, b) =>
      compareCollectorNumbers(a.printing.number, b.printing.number) ||
      RARITY_META[a.printing.rarity].rank - RARITY_META[b.printing.rarity].rank,
  );
}

export interface DeckAppearance {
  deck: Deck;
  /** Copies in the main deck; 0 when the card only appears as the leader. */
  quantity: number;
  asLeader: boolean;
}

const appearancesByCard = new Map<string, DeckAppearance[]>();
function addAppearance(cardId: string, appearance: DeckAppearance): void {
  const list = appearancesByCard.get(cardId) ?? [];
  list.push(appearance);
  appearancesByCard.set(cardId, list);
}
for (const deck of dataset.decks) {
  if (deck.leaderId) addAppearance(deck.leaderId, { deck, quantity: 0, asLeader: true });
  for (const entry of deck.cards) addAppearance(entry.cardId, { deck, quantity: entry.quantity, asLeader: false });
}
for (const list of appearancesByCard.values()) {
  list.sort((a, b) => Number(b.asLeader) - Number(a.asLeader) || b.quantity - a.quantity || b.deck.updatedAt.localeCompare(a.deck.updatedAt));
}

const revealed: readonly NarutoCard[] = cards
  .filter((card) => card.reveal !== undefined)
  .sort((a, b) => (b.reveal?.date ?? "").localeCompare(a.reveal?.date ?? "") || compareCollectorNumbers(a.id, b.id));

/** All cards in canonical order. */
export function getAllCards(): readonly NarutoCard[] {
  return cards;
}

export function getCard(id: string): NarutoCard | undefined {
  return cardById.get(id);
}

/** Sets ordered by release date, oldest first. */
export function getSets(): readonly CardSet[] {
  return setsByRelease;
}

export function getSet(id: string): CardSet | undefined {
  return setById.get(id);
}

/** Every printing in a set, in collector-number order. */
export function getSetEntries(setId: string): readonly SetEntry[] {
  return entriesBySet.get(setId) ?? [];
}

export function getDecks(): readonly Deck[] {
  return dataset.decks;
}

/** Decks that include the card, leader appearances first. */
export function getDeckAppearances(cardId: string): readonly DeckAppearance[] {
  return appearancesByCard.get(cardId) ?? [];
}

/** Cards with reveal metadata, newest reveal first. */
export function getRevealedCards(): readonly NarutoCard[] {
  return revealed;
}
