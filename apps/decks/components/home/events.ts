import type { EventTier, Tournament } from "@naruto-tcg/types";
import { tournamentDeckId, type DeckSummary } from "@/lib/decks/types";
import { formatDate, formatShortDate } from "@/lib/format";
import type { ArchetypeStats } from "@/lib/meta/types";

/** Headline numbers for the overview KPI row. */
export interface OverviewKpis {
  events: number;
  /** Oldest and newest event dates; null without events. */
  dateRange: { from: string; to: string } | null;
  /** Distinct players across every event (player ids double as global handles). */
  players: number;
  /** Player registrations, counting a player once per event. */
  entries: number;
  /**
   * Matches played, Swiss and top cut, counted like the meta engine: byes, intentional draws
   * and matches against unregistered players are left out.
   */
  matches: number;
  decklists: number;
  eventDecklists: number;
  communityDecklists: number;
  rankedArchetypes: number;
  playedArchetypes: number;
}

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function countPlayedMatches(tournament: Tournament): number {
  const registered = new Set(tournament.players.map((p) => p.id));
  return tournament.matches.filter(
    (m) =>
      m.outcome !== "bye" &&
      !m.intentionalDraw &&
      m.player2Id !== null &&
      registered.has(m.player1Id) &&
      registered.has(m.player2Id),
  ).length;
}

/**
 * Counts for the overview: events and their date span, distinct players and entries,
 * matches played (as the meta page counts them), published decklists by source and ranked archetypes.
 */
export function overviewKpis(
  tournaments: readonly Tournament[],
  decks: readonly DeckSummary[],
  stats: readonly ArchetypeStats[],
): OverviewKpis {
  const dates = tournaments.map((t) => t.date).sort(compareStrings);
  const players = new Set(tournaments.flatMap((t) => t.players.map((p) => p.id)));
  const eventDecklists = decks.filter((deck) => deck.source === "tournament").length;
  return {
    events: tournaments.length,
    dateRange: dates.length ? { from: dates[0]!, to: dates[dates.length - 1]! } : null,
    players: players.size,
    entries: tournaments.reduce((sum, t) => sum + t.players.length, 0),
    matches: tournaments.reduce((sum, t) => sum + countPlayedMatches(t), 0),
    decklists: decks.length,
    eventDecklists,
    communityDecklists: decks.length - eventDecklists,
    rankedArchetypes: stats.filter((s) => s.tier !== "unranked").length,
    playedArchetypes: stats.filter((s) => s.entries > 0).length,
  };
}

/** "May 16 – Oct 10, 2026"; the year repeats only when it differs; a single day prints once. */
export function formatDateRange(from: string, to: string): string {
  if (from === to) return formatDate(to);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${sameYear ? formatShortDate(from) : formatDate(from)} – ${formatDate(to)}`;
}

/** One event in the overview's "Latest results" list. Plain and serializable. */
export interface LatestResult {
  id: string;
  name: string;
  tier: EventTier;
  date: string;
  players: number;
  topCutSize: number;
  /** `deckId` is set when the winner published a list. */
  winner: { id: string; name: string; archetypeId: string; deckId: string | null } | null;
  /** Top cut players, champion first; empty for events without a cut. */
  topCut: Array<{ placement: number; name: string; archetypeId: string }>;
}

/** The `count` newest events (ties by id), reduced to what the overview list shows. */
export function latestResults(tournaments: readonly Tournament[], count = 4): LatestResult[] {
  return tournaments
    .slice()
    .sort((a, b) => compareStrings(b.date, a.date) || compareStrings(a.id, b.id))
    .slice(0, Math.max(0, count))
    .map((t) => {
      const byPlacement = t.players.slice().sort((a, b) => a.placement - b.placement);
      const winner = byPlacement[0]?.placement === 1 ? byPlacement[0] : undefined;
      return {
        id: t.id,
        name: t.name,
        tier: t.tier,
        date: t.date,
        players: t.players.length,
        topCutSize: t.topCutSize,
        winner: winner
          ? {
              id: winner.id,
              name: winner.name,
              archetypeId: winner.archetypeId,
              deckId: winner.decklist ? tournamentDeckId(t.id, winner.id) : null,
            }
          : null,
        topCut:
          t.topCutSize >= 2
            ? byPlacement
                .filter((p) => p.placement <= t.topCutSize)
                .map((p) => ({ placement: p.placement, name: p.name, archetypeId: p.archetypeId }))
            : [],
      };
    });
}
