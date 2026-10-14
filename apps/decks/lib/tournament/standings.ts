import type { MatchRecord, MatchStage, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { MATCH_POINTS, OMW_FLOOR } from "@/lib/rules";

export interface PlayerRecord {
  wins: number;
  losses: number;
  draws: number;
  /** Byes received; also counted in `wins`. */
  byes: number;
  /** Intentional draws; also counted in `draws`. */
  intentionalDraws: number;
}

export interface RecordOptions {
  stage?: MatchStage;
  /** Only count matches with `round <= throughRound`. */
  throughRound?: number;
}

export interface StandingRow {
  playerId: string;
  /** 1-based rank after tiebreakers. */
  rank: number;
  record: PlayerRecord;
  matchPoints: number;
  /** Match-win percentage, floored. 0..1 */
  mwp: number;
  /** Opponents' match-win percentage (each opponent floored). 0..1 */
  omw: number;
  /** Opponents' opponents' match-win percentage. 0..1 */
  oomw: number;
  dropped: boolean;
}

export function emptyRecord(): PlayerRecord {
  return { wins: 0, losses: 0, draws: 0, byes: 0, intentionalDraws: 0 };
}

export function matchPoints(record: PlayerRecord): number {
  return record.wins * MATCH_POINTS.win + record.draws * MATCH_POINTS.draw + record.losses * MATCH_POINTS.loss;
}

export function matchesPlayed(record: PlayerRecord): number {
  return record.wins + record.losses + record.draws;
}

/** "W-L-D", e.g. "6-2-1"; draws omitted when zero. */
export function formatRecord(record: Pick<PlayerRecord, "wins" | "losses" | "draws">): string {
  return record.draws > 0 ? `${record.wins}-${record.losses}-${record.draws}` : `${record.wins}-${record.losses}`;
}

function includeMatch(match: MatchRecord, options: RecordOptions): boolean {
  if (options.stage && match.stage !== options.stage) return false;
  if (options.throughRound !== undefined && match.round > options.throughRound) return false;
  return true;
}

function bump(records: Map<string, PlayerRecord>, playerId: string): PlayerRecord {
  let record = records.get(playerId);
  if (!record) {
    record = emptyRecord();
    records.set(playerId, record);
  }
  return record;
}

/** Per-player W/L/D from match results. Byes count as wins. */
export function computeRecords(matches: readonly MatchRecord[], options: RecordOptions = {}): Map<string, PlayerRecord> {
  const records = new Map<string, PlayerRecord>();
  for (const match of matches) {
    if (!includeMatch(match, options)) continue;
    const p1 = bump(records, match.player1Id);
    if (match.outcome === "bye" || match.player2Id === null) {
      p1.wins++;
      p1.byes++;
      continue;
    }
    const p2 = bump(records, match.player2Id);
    if (match.outcome === "p1") {
      p1.wins++;
      p2.losses++;
    } else if (match.outcome === "p2") {
      p2.wins++;
      p1.losses++;
    } else {
      p1.draws++;
      p2.draws++;
      if (match.intentionalDraw) {
        p1.intentionalDraws++;
        p2.intentionalDraws++;
      }
    }
  }
  return records;
}

/** Map of player id → ids of the opponents they actually played (byes excluded). */
export function computeOpponents(matches: readonly MatchRecord[], options: RecordOptions = {}): Map<string, string[]> {
  const opponents = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    const list = opponents.get(a);
    if (list) list.push(b);
    else opponents.set(a, [b]);
  };
  for (const match of matches) {
    if (!includeMatch(match, options) || match.player2Id === null || match.outcome === "bye") continue;
    add(match.player1Id, match.player2Id);
    add(match.player2Id, match.player1Id);
  }
  return opponents;
}

const mean = (values: number[], fallback: number) =>
  values.length === 0 ? fallback : values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Swiss standings with tiebreakers: match points, then OMW%, then OOMW%, then player id
 * (a deterministic last resort). Each player's MWP is floored at {@link OMW_FLOOR}; byes
 * count toward a player's own MWP but a bye is never an opponent.
 */
export function computeSwissStandings(
  players: ReadonlyArray<Pick<TournamentPlayer, "id" | "dropped">>,
  matches: readonly MatchRecord[],
  options: { throughRound?: number } = {},
): StandingRow[] {
  const scope: RecordOptions = { stage: "swiss", throughRound: options.throughRound };
  const records = computeRecords(matches, scope);
  const opponents = computeOpponents(matches, scope);

  const mwp = new Map<string, number>();
  for (const player of players) {
    const record = records.get(player.id) ?? emptyRecord();
    const played = matchesPlayed(record);
    mwp.set(player.id, played === 0 ? OMW_FLOOR : Math.max(OMW_FLOOR, matchPoints(record) / (MATCH_POINTS.win * played)));
  }
  const mwpOf = (id: string) => mwp.get(id) ?? OMW_FLOOR;

  const omw = new Map<string, number>();
  for (const player of players) {
    omw.set(player.id, mean((opponents.get(player.id) ?? []).map(mwpOf), OMW_FLOOR));
  }
  const omwOf = (id: string) => omw.get(id) ?? OMW_FLOOR;

  const rows = players.map((player) => {
    const record = records.get(player.id) ?? emptyRecord();
    return {
      playerId: player.id,
      rank: 0,
      record,
      matchPoints: matchPoints(record),
      mwp: mwpOf(player.id),
      omw: omwOf(player.id),
      oomw: mean((opponents.get(player.id) ?? []).map(omwOf), OMW_FLOOR),
      dropped: Boolean(player.dropped),
    };
  });

  rows.sort(
    (a, b) =>
      b.matchPoints - a.matchPoints ||
      b.omw - a.omw ||
      b.oomw - a.oomw ||
      (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0),
  );
  rows.forEach((row, index) => (row.rank = index + 1));
  return rows;
}

/**
 * Final placements: top cut players first, ordered by how deep they went (champion first)
 * and then by Swiss rank within the same elimination round; everyone else by Swiss rank.
 */
export function computeFinalPlacements(tournament: {
  players: ReadonlyArray<Pick<TournamentPlayer, "id" | "dropped">>;
  matches: Tournament["matches"];
  topCutSize: number;
}): Map<string, number> {
  const swiss = computeSwissStandings(tournament.players, tournament.matches);
  const swissRank = new Map(swiss.map((row) => [row.playerId, row.rank]));
  const rankOf = (id: string) => swissRank.get(id) ?? Number.MAX_SAFE_INTEGER;

  const topCutMatches = tournament.matches.filter((m) => m.stage === "top-cut");
  const placements = new Map<string, number>();
  if (tournament.topCutSize === 0 || topCutMatches.length === 0) {
    for (const row of swiss) placements.set(row.playerId, row.rank);
    return placements;
  }

  // Round each top cut player was eliminated in; Infinity for the player who never lost.
  const eliminatedIn = new Map<string, number>();
  for (const match of topCutMatches) {
    for (const id of [match.player1Id, match.player2Id]) {
      if (id !== null && !eliminatedIn.has(id)) eliminatedIn.set(id, Number.POSITIVE_INFINITY);
    }
    if (match.player2Id === null) continue;
    const loser = match.outcome === "p1" ? match.player2Id : match.outcome === "p2" ? match.player1Id : null;
    if (loser !== null) eliminatedIn.set(loser, Math.min(eliminatedIn.get(loser)!, match.round));
  }

  const cut = [...eliminatedIn.keys()].sort(
    (a, b) => eliminatedIn.get(b)! - eliminatedIn.get(a)! || rankOf(a) - rankOf(b),
  );
  cut.forEach((id, index) => placements.set(id, index + 1));
  let next = cut.length + 1;
  for (const row of swiss) {
    if (!placements.has(row.playerId)) placements.set(row.playerId, next++);
  }
  return placements;
}

/** Number of single-elimination rounds for a cut of the given size (8 → 3). */
export function topCutRounds(topCutSize: number): number {
  return topCutSize <= 1 ? 0 : Math.ceil(Math.log2(topCutSize));
}

/** Label for a final placement given the cut size, e.g. "Winner", "Top 4", "Top 8". */
export function placementLabel(placement: number, topCutSize: number): string {
  if (placement === 1) return "Winner";
  if (placement === 2 && topCutSize >= 2) return "Finalist";
  if (topCutSize > 0 && placement <= topCutSize) {
    let bracket = 4;
    while (bracket < placement) bracket *= 2;
    return `Top ${bracket}`;
  }
  return ordinal(placement);
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}
