import type { Tournament } from "@naruto-tcg/types";
import { getCard } from "@/lib/data/cards";
import { buildTournamentDecks, normalizeSearchText, searchDecks, toSummary } from "@/lib/decks/catalog";
import type { DeckSummary } from "@/lib/decks/types";

/** Directory data helpers: imported decks, merging, the featured strip and card filter options. */

export const PAGE_SIZE = 24;
export const FEATURED_COUNT = 3;
export const IMPORTED_TAG = "Imported";

export interface CardOption {
  id: string;
  name: string;
}

function tagImported(deck: DeckSummary): DeckSummary {
  return { ...deck, tags: [IMPORTED_TAG, ...deck.tags.filter((tag) => tag !== IMPORTED_TAG)] };
}

/**
 * Directory rows for events imported in this browser (sanitized by the imports store), tagged
 * "Imported" (first, so the card shows it). An event that still fails to build is skipped
 * rather than breaking the directory.
 */
export function importedDeckSummaries(tournaments: readonly Tournament[]): DeckSummary[] {
  return tournaments.flatMap((tournament) => {
    try {
      return buildTournamentDecks([tournament]).map((deck) => tagImported(toSummary(deck)));
    } catch {
      return [];
    }
  });
}

/** Concatenates deck lists, keeping the first row for each id (seed data wins over imports). */
export function mergeDecks(...lists: ReadonlyArray<readonly DeckSummary[]>): DeckSummary[] {
  const seen = new Set<string>();
  const merged: DeckSummary[] = [];
  for (const list of lists) {
    for (const deck of list) {
      if (seen.has(deck.id)) continue;
      seen.add(deck.id);
      merged.push(deck);
    }
  }
  return merged;
}

/** The featured strip: the latest event winners and the most upvoted community decks. */
export function featuredDecks(
  decks: readonly DeckSummary[],
  count = FEATURED_COUNT,
): { winners: DeckSummary[]; community: DeckSummary[] } {
  return {
    winners: searchDecks(decks, { placement: "winner", sort: "newest" }).slice(0, count),
    community: searchDecks(decks, { source: "community", sort: "votes" }).slice(0, count),
  };
}

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Locale-free ordering, so server and browser always agree.
const compareOptions = (a: CardOption, b: CardOption) =>
  compareStrings(normalizeSearchText(a.name), normalizeSearchText(b.name)) || compareStrings(a.id, b.id);

/** Card filter options for every card (Leader included) that appears in at least one deck, by name. */
export function cardOptionsFor(decks: readonly Pick<DeckSummary, "cardIds">[], base: readonly CardOption[] = []): CardOption[] {
  const options = new Map(base.map((option) => [option.id, option]));
  for (const deck of decks) {
    for (const id of deck.cardIds) {
      if (options.has(id)) continue;
      const card = getCard(id);
      if (card) options.set(id, { id, name: card.name });
    }
  }
  return [...options.values()].sort(compareOptions);
}

/**
 * Card options for the combobox: every query term must prefix a word of the card name or id.
 * Names that start with the query rank first; selected ids are left out.
 */
export function matchCardOptions(
  options: readonly CardOption[],
  text: string,
  exclude: readonly string[] = [],
  limit = 8,
): CardOption[] {
  const query = normalizeSearchText(text);
  const terms = query.split(" ").filter(Boolean);
  const ranked: Array<[rank: number, option: CardOption]> = [];
  for (const option of options) {
    if (exclude.includes(option.id)) continue;
    if (terms.length === 0) {
      ranked.push([1, option]);
      continue;
    }
    const name = normalizeSearchText(option.name);
    const haystack = ` ${name} ${normalizeSearchText(option.id)}`;
    if (!terms.every((term) => haystack.includes(` ${term}`))) continue;
    ranked.push([name.startsWith(query) ? 0 : 1, option]);
  }
  return ranked
    .sort(([ra, a], [rb, b]) => ra - rb || compareOptions(a, b))
    .slice(0, limit)
    .map(([, option]) => option);
}
