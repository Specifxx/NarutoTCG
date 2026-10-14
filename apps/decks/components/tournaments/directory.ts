import type { EventTier } from "@naruto-tcg/types";
import { classifyRegion, REGION_ORDER, type RegionId } from "./region";
import type { TournamentSummary } from "./summary";

export interface EventListQuery {
  /** Whitespace-separated terms; each must start a word of the name, place, organizer or winner. */
  text?: string;
  /** Empty or missing means every tier. */
  tiers?: readonly EventTier[];
  region?: RegionId | "all";
  format?: string;
}

export interface EventTotals {
  events: number;
  players: number;
  matches: number;
  decklists: number;
}

/** Lowercase, accent-free, punctuation-free text for matching. */
export function normalizeQuery(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function haystack(event: TournamentSummary): string {
  const { city, region, country, venue } = event.location;
  const fields = [event.name, city, region, country, venue, event.organizer, event.winner?.name, event.location.online ? "online" : ""];
  return ` ${normalizeQuery(fields.filter(Boolean).join(" "))}`;
}

/** Code-unit order: identical on server and client, unlike localeCompare. */
const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Newest first, then by name and id so ties are stable. */
export function compareEventsNewest(a: TournamentSummary, b: TournamentSummary): number {
  return compareStrings(b.date, a.date) || compareStrings(a.name, b.name) || compareStrings(a.id, b.id);
}

/** Seed and browser-imported rows together; the first row with a given id wins. */
export function mergeEventSummaries(...lists: ReadonlyArray<readonly TournamentSummary[]>): TournamentSummary[] {
  const seen = new Set<string>();
  const merged: TournamentSummary[] = [];
  for (const list of lists) {
    for (const event of list) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      merged.push(event);
    }
  }
  return merged;
}

/** Applies the directory filters and sorts newest first. */
export function filterEvents(events: readonly TournamentSummary[], query: EventListQuery = {}): TournamentSummary[] {
  const terms = normalizeQuery(query.text ?? "").split(" ").filter(Boolean);
  const tiers = query.tiers?.length ? new Set(query.tiers) : null;
  const region = query.region && query.region !== "all" ? query.region : null;
  const format = query.format && query.format !== "all" ? query.format : null;
  return events
    .filter((event) => {
      if (tiers && !tiers.has(event.tier)) return false;
      if (region && classifyRegion(event.location) !== region) return false;
      if (format && event.format !== format) return false;
      if (terms.length === 0) return true;
      const text = haystack(event);
      return terms.every((term) => text.includes(` ${term}`));
    })
    .sort(compareEventsNewest);
}

/** KPI totals for a set of events. */
export function eventTotals(events: readonly TournamentSummary[]): EventTotals {
  return events.reduce<EventTotals>(
    (totals, event) => ({
      events: totals.events + 1,
      players: totals.players + event.players,
      matches: totals.matches + event.matches,
      decklists: totals.decklists + event.decklists,
    }),
    { events: 0, players: 0, matches: 0, decklists: 0 },
  );
}

/** Distinct formats, the one played most recently first. */
export function formatOptions(events: readonly TournamentSummary[]): string[] {
  const latest = new Map<string, string>();
  for (const event of events) {
    const seen = latest.get(event.format);
    if (seen === undefined || event.date > seen) latest.set(event.format, event.date);
  }
  return [...latest.keys()].sort((a, b) => compareStrings(latest.get(b)!, latest.get(a)!) || compareStrings(a, b));
}

/** Regions offered by the filter: the four named regions always, "other" only when an event is there. */
export function regionOptions(events: readonly TournamentSummary[]): RegionId[] {
  const hasOther = events.some((event) => classifyRegion(event.location) === "other");
  return REGION_ORDER.filter((region) => region !== "other" || hasOther);
}
