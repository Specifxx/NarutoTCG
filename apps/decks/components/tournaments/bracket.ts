import type { MatchOutcome, MatchRecord } from "@naruto-tcg/types";
import { topCutRoundLabels } from "./rounds";

export interface BracketSlot {
  /** Null for the empty side of a bye. */
  playerId: string | null;
  /** Swiss rank going into the cut. */
  seed: number | null;
  /** Games won, when the match has a game score. */
  games: number | null;
  won: boolean;
}

export interface BracketMatch {
  key: string;
  round: number;
  table: number | null;
  outcome: MatchOutcome;
  slots: [BracketSlot, BracketSlot];
}

export interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
}

const byTable = (a: MatchRecord, b: MatchRecord) =>
  (a.table ?? Number.MAX_SAFE_INTEGER) - (b.table ?? Number.MAX_SAFE_INTEGER) ||
  (a.player1Id < b.player1Id ? -1 : a.player1Id > b.player1Id ? 1 : 0);

function toBracketMatch(match: MatchRecord, seeds: ReadonlyMap<string, number>): BracketMatch {
  const slot = (playerId: string | null, games: number | undefined, won: boolean): BracketSlot => ({
    playerId,
    seed: playerId === null ? null : (seeds.get(playerId) ?? null),
    games: games ?? null,
    won,
  });
  const bye = match.outcome === "bye" || match.player2Id === null;
  return {
    key: `${match.round}:${match.table ?? "-"}:${match.player1Id}`,
    round: match.round,
    table: match.table ?? null,
    outcome: match.outcome,
    slots: [
      slot(match.player1Id, match.games?.p1, bye || match.outcome === "p1"),
      slot(bye ? null : match.player2Id, match.games?.p2, !bye && match.outcome === "p2"),
    ],
  };
}

/**
 * Single-elimination bracket from the top cut matches, one column per round. The last round is
 * ordered by table; every earlier round is ordered so the two matches feeding a later match sit
 * next to each other (top slot's feeder first). Matches that feed nothing recorded come last.
 */
export function buildBracket(matches: readonly MatchRecord[], seeds: ReadonlyMap<string, number>): BracketRound[] {
  const cut = matches.filter((m) => m.stage === "top-cut");
  const byRound = new Map<number, MatchRecord[]>();
  for (const match of cut) {
    const list = byRound.get(match.round);
    if (list) list.push(match);
    else byRound.set(match.round, [match]);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  if (rounds.length === 0) return [];
  const labels = topCutRoundLabels(cut);

  const ordered = new Map<number, MatchRecord[]>();
  const lastRound = rounds[rounds.length - 1]!;
  ordered.set(lastRound, byRound.get(lastRound)!.slice().sort(byTable));
  for (let i = rounds.length - 2; i >= 0; i--) {
    const pool = byRound.get(rounds[i]!)!.slice().sort(byTable);
    const used = new Set<MatchRecord>();
    const out: MatchRecord[] = [];
    for (const later of ordered.get(rounds[i + 1]!)!) {
      for (const playerId of [later.player1Id, later.player2Id]) {
        if (playerId === null) continue;
        const feeder = pool.find((m) => !used.has(m) && (m.player1Id === playerId || m.player2Id === playerId));
        if (feeder) {
          used.add(feeder);
          out.push(feeder);
        }
      }
    }
    for (const match of pool) if (!used.has(match)) out.push(match);
    ordered.set(rounds[i]!, out);
  }

  return rounds.map((round) => ({
    round,
    label: labels.get(round) ?? `Round ${round}`,
    matches: ordered.get(round)!.map((match) => toBracketMatch(match, seeds)),
  }));
}
