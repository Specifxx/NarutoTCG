import type { ProbabilityRow } from "@/lib/probability/conditions";

/** Sorting for the per-card draw odds table in the Odds tab. */

/** Turns shown as "by turn N" columns; pass these to probabilityTable so `pByTurn[i]` is turn i + 1. */
export const ODDS_TABLE_TURNS: readonly number[] = [1, 2, 3, 4, 5];

export type OddsSortKey = "card" | "copies" | "opening" | "t1" | "t2" | "t3" | "t4" | "t5";
export type SortDirection = "ascending" | "descending";
export interface OddsSort {
  key: OddsSortKey;
  direction: SortDirection;
}

export const DEFAULT_ODDS_SORT: OddsSort = { key: "opening", direction: "descending" };

const TURN_KEYS: readonly OddsSortKey[] = ["t1", "t2", "t3", "t4", "t5"];

/** Column key for a "by turn N" column. */
export function turnKey(turn: number): OddsSortKey {
  return TURN_KEYS[turn - 1] ?? "t5";
}

function sortValue(row: ProbabilityRow, key: Exclude<OddsSortKey, "card">): number {
  if (key === "copies") return row.copies;
  if (key === "opening") return row.pOpening;
  return row.pByTurn[TURN_KEYS.indexOf(key)] ?? 0;
}

/** Names sort A→Z on ascending; numbers sort low→high. Ties fall back to name, then id. */
export function sortOddsRows(
  rows: readonly ProbabilityRow[],
  { key, direction }: OddsSort,
  nameOf: (cardId: string) => string = (id) => id,
): ProbabilityRow[] {
  const sign = direction === "ascending" ? 1 : -1;
  const byName = (a: ProbabilityRow, b: ProbabilityRow) => nameOf(a.cardId).localeCompare(nameOf(b.cardId), "en") || (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0);
  return [...rows].sort((a, b) =>
    key === "card" ? sign * byName(a, b) : sign * (sortValue(a, key) - sortValue(b, key)) || byName(a, b),
  );
}

/** Clicking a column: the same column flips direction; a new one starts A→Z for names, high→low for numbers. */
export function toggleOddsSort(current: OddsSort, key: OddsSortKey): OddsSort {
  if (current.key === key) return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
  return { key, direction: key === "card" ? "ascending" : "descending" };
}
