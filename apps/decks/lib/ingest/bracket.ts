import type { MatchRecord, TournamentPlayer } from "@naruto-tcg/types";
import { topCutRounds } from "@/lib/tournament/standings";

/**
 * Checks reported placements against the recorded top cut. Only what the bracket decides is
 * checked: the final's winner and loser are 1st and 2nd, a player eliminated in a round is placed
 * below everyone who survived that round, and (when every cut match is recorded) the cut players
 * hold the top places. Order within a band (two semifinal losers) is the organizer's call.
 */

type BracketPlayer = Pick<TournamentPlayer, "id" | "name" | "placement">;

interface Run {
  /** Round of the player's first top cut loss. */
  lostIn?: number;
  /** Last top cut round the player appears in. */
  reached: number;
}

/** How far each player in a top cut match got, by id. */
function cutRuns(matches: readonly MatchRecord[]): Map<string, Run> {
  const runs = new Map<string, Run>();
  for (const match of matches) {
    if (match.stage !== "top-cut") continue;
    for (const id of [match.player1Id, match.player2Id]) {
      if (id === null) continue;
      const run = runs.get(id);
      if (run) run.reached = Math.max(run.reached, match.round);
      else runs.set(id, { reached: match.round });
    }
    const loser = match.player2Id === null ? null : match.outcome === "p1" ? match.player2Id : match.outcome === "p2" ? match.player1Id : null;
    if (loser !== null) {
      const run = runs.get(loser)!;
      run.lostIn = Math.min(run.lostIn ?? Number.POSITIVE_INFINITY, match.round);
    }
  }
  return runs;
}

/**
 * How deep a player went: the round they lost in, or just past the last round they reached when
 * they never lost. A player eliminated in round e is below everyone deeper than e.
 */
const depth = (run: Run) => run.lostIn ?? run.reached + 0.5;

/** The final's winner and loser, when the round a top cut of this size ends in has exactly one decided match. */
function recordedFinal(matches: readonly MatchRecord[], swissRounds: number, topCutSize: number): { winner: string; loser: string } | null {
  if (topCutSize < 2) return null;
  const finalRound = swissRounds + topCutRounds(topCutSize);
  const cut = matches.filter((m) => m.stage === "top-cut");
  if (cut.length === 0 || Math.max(...cut.map((m) => m.round)) !== finalRound) return null;
  const final = cut.filter((m) => m.round === finalRound);
  const match = final[0];
  if (final.length !== 1 || !match || match.player2Id === null || (match.outcome !== "p1" && match.outcome !== "p2")) return null;
  return match.outcome === "p1"
    ? { winner: match.player1Id, loser: match.player2Id }
    : { winner: match.player2Id, loser: match.player1Id };
}

/**
 * Ways the placements contradict the recorded top cut, as sentences naming the players; empty
 * when they agree or nothing is decided. Expects unique player ids.
 */
export function bracketConflicts(tournament: {
  players: readonly BracketPlayer[];
  matches: readonly MatchRecord[];
  swissRounds: number;
  topCutSize: number;
}): string[] {
  const { players, matches, swissRounds, topCutSize } = tournament;
  const byId = new Map(players.map((p) => [p.id, p]));
  const runs = [...cutRuns(matches)].flatMap(([id, run]) => {
    const player = byId.get(id);
    return player ? [{ player, run }] : [];
  });
  if (runs.length === 0) return [];
  const conflicts: string[] = [];

  const final = recordedFinal(matches, swissRounds, topCutSize);
  const winner = final && byId.get(final.winner);
  const loser = final && byId.get(final.loser);
  if (winner && winner.placement !== 1) conflicts.push(`${winner.name} won the final but is placed ${winner.placement}.`);
  if (loser && loser.placement !== 2) conflicts.push(`${loser.name} lost the final but is placed ${loser.placement}.`);

  // A player eliminated in round e must be placed below everyone who survived round e.
  const rounds = [...new Set(runs.flatMap(({ run }) => (run.lostIn !== undefined ? [run.lostIn] : [])))].sort((a, b) => b - a);
  for (const round of rounds) {
    const out = runs.filter(({ run }) => run.lostIn === round);
    const through = runs.filter(({ run }) => depth(run) > round);
    if (through.length === 0) continue;
    const best = out.reduce((a, b) => (b.player.placement < a.player.placement ? b : a));
    const worst = through.reduce((a, b) => (b.player.placement > a.player.placement ? b : a));
    if (worst.player.placement > best.player.placement) {
      conflicts.push(
        `${worst.player.name} (placed ${worst.player.placement}) went further in the top cut than ${best.player.name} (placed ${best.player.placement}), who lost in round ${round}.`,
      );
    }
  }

  // With the whole bracket recorded (one loss per player but the champion), the cut holds the top places.
  const losers = runs.filter(({ run }) => run.lostIn !== undefined).length;
  const decided = matches.filter((m) => m.stage === "top-cut" && m.player2Id !== null && (m.outcome === "p1" || m.outcome === "p2")).length;
  if (topCutSize >= 2 && runs.length === topCutSize && losers === topCutSize - 1 && decided === topCutSize - 1) {
    for (const { player } of runs) {
      if (player.placement > topCutSize) conflicts.push(`${player.name} made the top ${topCutSize} but is placed ${player.placement}.`);
    }
  }
  return conflicts;
}

/**
 * Placements that follow the bracket: players in top cut matches first, deepest run first (the
 * champion, the finalist, then each elimination round), everyone else after them. Ties keep the
 * order of `reported` (the organizer's own standings), then player id.
 */
export function bracketPlacements(
  players: readonly Pick<TournamentPlayer, "id">[],
  matches: readonly MatchRecord[],
  reported: ReadonlyMap<string, number>,
): Map<string, number> {
  const runs = cutRuns(matches);
  const rank = (id: string) => reported.get(id) ?? Number.MAX_SAFE_INTEGER;
  const key = (id: string) => {
    const run = runs.get(id);
    return run ? depth(run) : -1;
  };
  const order = players
    .map((p) => p.id)
    .sort((a, b) => key(b) - key(a) || rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
  return new Map(order.map((id, index) => [id, index + 1]));
}
