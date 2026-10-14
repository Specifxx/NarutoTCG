import type { Decklist } from "@naruto-tcg/types";
import { groupDecklist, type DeckSection, type GroupedDecklist } from "@/lib/decks/deck-utils";

/** Display order for the decklist views. Pure. */

type Entry = DeckSection["entries"][number];

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Cost (cards without one last), then English name order, then id: the same on every runtime. */
function compareEntries(a: Entry, b: Entry): number {
  const cost = (entry: Entry) => entry.card.cost ?? Number.MAX_SAFE_INTEGER;
  return cost(a) - cost(b) || a.card.name.localeCompare(b.card.name, "en") || compareIds(a.card.id, b.card.id);
}

/**
 * {@link groupDecklist} with every section re-sorted under a fixed locale. The decklist renders on
 * the server and again during hydration, so the order must not follow the browser's default
 * collation (Czech, for one, sorts "Choji" after "Hiashi").
 */
export function groupDecklistForDisplay(decklist: Decklist): GroupedDecklist {
  const grouped = groupDecklist(decklist);
  return { ...grouped, sections: grouped.sections.map((section) => ({ ...section, entries: [...section.entries].sort(compareEntries) })) };
}
