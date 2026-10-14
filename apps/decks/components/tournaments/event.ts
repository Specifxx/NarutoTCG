import type { Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { tournamentDeckId } from "@/lib/decks/types";
import { chartSeriesIds, OTHER_SERIES_ID, seriesIdFor, seriesLabel } from "@/lib/meta/share";
import { computeRecords, computeSwissStandings, formatRecord } from "@/lib/tournament/standings";

export interface StandingsEntry {
  playerId: string;
  name: string;
  country: string | null;
  archetypeId: string;
  placement: number;
  /** Rank after Swiss, or null when the event has no Swiss results. */
  swissRank: number | null;
  /** "6-2-1"; null when the event has no match results. */
  swissRecord: string | null;
  overallRecord: string | null;
  matchPoints: number | null;
  omw: number | null;
  oomw: number | null;
  dropped: boolean;
  inTopCut: boolean;
  /** Deck page id when the list was published. */
  deckId: string | null;
}

export interface SeriesBreakdownRow {
  seriesId: string;
  label: string;
  entries: number;
  /** entries / players, 0..1 */
  share: number;
  topCut: number;
  /** topCut / entries, 0..1; null when the event has no cut. */
  conversion: number | null;
}

/** Swiss rank of every player (1 = top seed). Empty when no Swiss match was recorded. */
export function swissSeeds(tournament: Pick<Tournament, "players" | "matches">): Map<string, number> {
  if (!tournament.matches.some((m) => m.stage === "swiss")) return new Map();
  return new Map(computeSwissStandings(tournament.players, tournament.matches).map((row) => [row.playerId, row.rank]));
}

/**
 * One row per player in final placement order, with Swiss tiebreakers from
 * computeSwissStandings and the overall record including the top cut.
 */
export function buildStandings(tournament: Tournament): StandingsEntry[] {
  const hasSwiss = tournament.matches.some((m) => m.stage === "swiss");
  const swiss = hasSwiss ? new Map(computeSwissStandings(tournament.players, tournament.matches).map((row) => [row.playerId, row])) : null;
  const overall = tournament.matches.length > 0 ? computeRecords(tournament.matches) : null;
  return tournament.players
    .slice()
    .sort((a, b) => a.placement - b.placement)
    .map((player) => {
      const row = swiss?.get(player.id);
      const record = overall?.get(player.id);
      return {
        playerId: player.id,
        name: player.name,
        country: player.country ?? null,
        archetypeId: player.archetypeId,
        placement: player.placement,
        swissRank: row?.rank ?? null,
        swissRecord: row ? formatRecord(row.record) : null,
        overallRecord: overall ? formatRecord(record ?? { wins: 0, losses: 0, draws: 0 }) : null,
        matchPoints: row?.matchPoints ?? null,
        omw: row?.omw ?? null,
        oomw: row?.oomw ?? null,
        dropped: Boolean(player.dropped),
        inTopCut: tournament.topCutSize > 0 && player.placement <= tournament.topCutSize,
        deckId: player.decklist ? tournamentDeckId(tournament.id, player.id) : null,
      };
    });
}

/**
 * Entries per chart series (uncharted archetypes and rogue fold into "Other"), most played
 * first with "Other" last; ties keep the fixed series order. Series with no entries are left out.
 */
export function eventMetaBreakdown(
  players: ReadonlyArray<Pick<TournamentPlayer, "archetypeId" | "placement">>,
  topCutSize: number,
): SeriesBreakdownRow[] {
  const order = chartSeriesIds();
  const counts = new Map(order.map((id) => [id, { entries: 0, topCut: 0 }]));
  for (const player of players) {
    const bucket = counts.get(seriesIdFor(player.archetypeId))!;
    bucket.entries++;
    if (topCutSize > 0 && player.placement <= topCutSize) bucket.topCut++;
  }
  const rank = (id: string) => (id === OTHER_SERIES_ID ? 1 : 0);
  return order
    .filter((id) => counts.get(id)!.entries > 0)
    .sort((a, b) => rank(a) - rank(b) || counts.get(b)!.entries - counts.get(a)!.entries || order.indexOf(a) - order.indexOf(b))
    .map((seriesId) => {
      const { entries, topCut } = counts.get(seriesId)!;
      return {
        seriesId,
        label: seriesLabel(seriesId),
        entries,
        share: players.length > 0 ? entries / players.length : 0,
        topCut,
        conversion: topCutSize > 0 ? topCut / entries : null,
      };
    });
}

/** File name for the JSON download of an event. */
export function tournamentFileName(id: string): string {
  return `${id.replace(/[^a-z0-9._-]+/gi, "-") || "tournament"}.json`;
}
