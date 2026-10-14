import type { EventTier, Tournament } from "@naruto-tcg/types";
import { AUTHORS, type Author } from "@/lib/data/authors";
import { tournamentDeckId, type DeckSummary } from "@/lib/decks/types";
import { computeRecords } from "@/lib/tournament/standings";

/** Player and author profiles for /players/[handle]: tournament history plus published decks. */

export interface PlayerResult {
  tournamentId: string;
  tournamentName: string;
  date: string;
  tier: EventTier;
  placement: number;
  playerCount: number;
  topCutSize: number;
  archetypeId: string;
  /** Byes count as wins. */
  record: { wins: number; losses: number; draws: number };
  /** Set when the deck catalog holds this player's list for the event. */
  deckId?: string;
}

export interface PlayerTotals {
  events: number;
  wins: number;
  losses: number;
  draws: number;
  topCuts: number;
  eventWins: number;
  bestPlacement: number | null;
}

export interface PlayerProfile {
  handle: string;
  name: string;
  country?: string;
  bio?: string;
  isAuthor: boolean;
  joined?: string;
  /** Newest first. */
  results: PlayerResult[];
  totals: PlayerTotals;
  /** Events played per archetype id. */
  archetypeCounts: Record<string, number>;
  /** Piloted tournament decks and authored community decks, newest first. */
  decks: DeckSummary[];
}

interface Entrant {
  name: string;
  country?: string;
  /** Date of the event the identity was taken from; the newest event wins. */
  seen: string;
  results: PlayerResult[];
}

function compareResults(a: PlayerResult, b: PlayerResult): number {
  return b.date.localeCompare(a.date) || a.tournamentId.localeCompare(b.tournamentId);
}

function totalsOf(results: readonly PlayerResult[]): PlayerTotals {
  const totals: PlayerTotals = { events: results.length, wins: 0, losses: 0, draws: 0, topCuts: 0, eventWins: 0, bestPlacement: null };
  for (const result of results) {
    totals.wins += result.record.wins;
    totals.losses += result.record.losses;
    totals.draws += result.record.draws;
    if (result.topCutSize > 0 && result.placement <= result.topCutSize) totals.topCuts++;
    if (result.placement === 1) totals.eventWins++;
    totals.bestPlacement = Math.min(totals.bestPlacement ?? result.placement, result.placement);
  }
  return totals;
}

/**
 * Profiles keyed by handle: every tournament player (keyed by player id) and every author.
 * A handle that is both is merged into one profile, with the author's curated identity.
 */
export function buildPlayerProfiles(
  tournaments: readonly Tournament[],
  decks: readonly DeckSummary[],
  authors: readonly Author[] = AUTHORS,
): Map<string, PlayerProfile> {
  const deckIds = new Set(decks.map((deck) => deck.id));
  const entrants = new Map<string, Entrant>();
  for (const tournament of tournaments) {
    const records = computeRecords(tournament.matches);
    for (const player of tournament.players) {
      const record = records.get(player.id);
      const deckId = tournamentDeckId(tournament.id, player.id);
      const result: PlayerResult = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        date: tournament.date,
        tier: tournament.tier,
        placement: player.placement,
        playerCount: tournament.players.length,
        topCutSize: tournament.topCutSize,
        archetypeId: player.archetypeId,
        record: { wins: record?.wins ?? 0, losses: record?.losses ?? 0, draws: record?.draws ?? 0 },
        ...(deckIds.has(deckId) ? { deckId } : {}),
      };
      const entrant = entrants.get(player.id);
      if (!entrant) {
        entrants.set(player.id, { name: player.name, country: player.country, seen: tournament.date, results: [result] });
        continue;
      }
      entrant.results.push(result);
      if (tournament.date > entrant.seen) {
        entrant.name = player.name;
        entrant.country = player.country;
        entrant.seen = tournament.date;
      }
    }
  }

  const decksByHandle = new Map<string, DeckSummary[]>();
  for (const deck of decks) {
    const list = decksByHandle.get(deck.author.handle);
    if (list) list.push(deck);
    else decksByHandle.set(deck.author.handle, [deck]);
  }

  const authorIndex = new Map(authors.map((author) => [author.handle, author]));
  const handles = [...new Set([...entrants.keys(), ...authorIndex.keys()])].sort();
  const profiles = new Map<string, PlayerProfile>();
  for (const handle of handles) {
    const entrant = entrants.get(handle);
    const author = authorIndex.get(handle);
    const results = (entrant?.results ?? []).sort(compareResults);
    const archetypeCounts: Record<string, number> = {};
    for (const result of results) archetypeCounts[result.archetypeId] = (archetypeCounts[result.archetypeId] ?? 0) + 1;
    profiles.set(handle, {
      handle,
      name: author?.name ?? entrant?.name ?? handle,
      country: author?.country ?? entrant?.country,
      bio: author?.bio,
      isAuthor: author !== undefined,
      joined: author?.joined,
      results,
      totals: totalsOf(results),
      archetypeCounts,
      decks: (decksByHandle.get(handle) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)),
    });
  }
  return profiles;
}
