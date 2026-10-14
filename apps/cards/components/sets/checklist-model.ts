// Pure, client-safe checklist logic shared by the server page (to build the
// index) and the client checklist (to filter it).
import type { Rarity } from "@naruto-tcg/types";

/** Compact, serializable description of one checklist row. */
export interface ChecklistIndexEntry {
  /** Collection key (`printingKey`). */
  key: string;
  rarity: Rarity;
  /** Pre-normalized haystack: name, title and collector number. */
  search: string;
}

export const STATUS_FILTERS = ["all", "owned", "missing"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export interface ChecklistFilter {
  status: StatusFilter;
  /** Empty means every rarity. */
  rarities: readonly Rarity[];
  /** Raw user input; normalized before matching. */
  query: string;
}

/** Lowercase, accent-free, single-spaced text for forgiving substring search. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Invisible format characters (soft hyphen, zero-width space, bidi controls)
    // vanish rather than split a word in two.
    .replace(/\p{Cf}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchHaystack(parts: readonly (string | undefined)[]): string {
  return normalizeSearch(parts.filter((part): part is string => part !== undefined).join(" "));
}

/** Every whitespace-separated term must appear somewhere in the haystack. */
export function matchesQuery(haystack: string, normalizedQuery: string): boolean {
  if (normalizedQuery === "") return true;
  return normalizedQuery.split(" ").every((term) => haystack.includes(term));
}

export function entryMatches(
  entry: ChecklistIndexEntry,
  filter: ChecklistFilter,
  normalizedQuery: string,
  owned: ReadonlySet<string>,
): boolean {
  if (filter.status === "owned" && !owned.has(entry.key)) return false;
  if (filter.status === "missing" && owned.has(entry.key)) return false;
  if (filter.rarities.length > 0 && !filter.rarities.includes(entry.rarity)) return false;
  return matchesQuery(entry.search, normalizedQuery);
}

export interface RarityTally {
  rarity: Rarity;
  total: number;
  owned: number;
}

/** Owned/total per rarity, in the order given by `order`, skipping absent rarities. */
export function tallyByRarity(
  entries: readonly ChecklistIndexEntry[],
  owned: ReadonlySet<string>,
  order: readonly Rarity[],
): RarityTally[] {
  const tallies = new Map<Rarity, RarityTally>();
  for (const entry of entries) {
    const tally = tallies.get(entry.rarity) ?? { rarity: entry.rarity, total: 0, owned: 0 };
    tally.total++;
    if (owned.has(entry.key)) tally.owned++;
    tallies.set(entry.rarity, tally);
  }
  return order.flatMap((rarity) => {
    const tally = tallies.get(rarity);
    return tally ? [tally] : [];
  });
}

export function countOwned(keys: readonly string[], owned: ReadonlySet<string>): number {
  let count = 0;
  for (const key of keys) if (owned.has(key)) count++;
  return count;
}
