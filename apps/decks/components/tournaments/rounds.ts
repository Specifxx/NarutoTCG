import type { MatchRecord, MatchStage } from "@naruto-tcg/types";

export interface RoundInfo {
  round: number;
  stage: MatchStage;
  /** "Round 3", "Quarterfinals", "Final". */
  label: string;
  /** Tab-sized: "R3", "Top 16", "Quarterfinals", "Final". */
  shortLabel: string;
}

export interface PairingRow {
  key: string;
  table: number | null;
  player1Id: string;
  player2Id: string | null;
  /** From player 1's side: "2-1", "1-2", "ID", "Draw", "Bye". */
  result: string;
  winner: "p1" | "p2" | null;
}

/** Elimination round named by its distance from the end: 0 → "Final", 1 → "Semifinals", 2 → "Quarterfinals", 3 → "Top 16". */
export function eliminationRoundLabel(roundsFromEnd: number): string {
  if (roundsFromEnd <= 0) return "Final";
  if (roundsFromEnd === 1) return "Semifinals";
  if (roundsFromEnd === 2) return "Quarterfinals";
  return `Top ${2 ** (roundsFromEnd + 1)}`;
}

/** Rounds left in a bracket whose round has this many matches: 1 → 0 (final), 2 → 1, 3–4 → 2, 5–8 → 3. */
function roundsFromEndForSize(matchCount: number): number {
  return matchCount <= 1 ? 0 : Math.ceil(Math.log2(matchCount));
}

/**
 * Top cut rounds labelled from the end. The last recorded round is named by its size (one match
 * is the final, two are the semifinals), and each earlier round is one step further out, so a
 * bracket missing its first rounds or its final is still named correctly.
 */
export function topCutRoundLabels(matches: readonly MatchRecord[]): Map<number, string> {
  const counts = new Map<number, number>();
  for (const match of matches) {
    if (match.stage === "top-cut") counts.set(match.round, (counts.get(match.round) ?? 0) + 1);
  }
  const rounds = [...counts.keys()].sort((a, b) => a - b);
  const labels = new Map<number, string>();
  if (rounds.length === 0) return labels;
  const last = roundsFromEndForSize(counts.get(rounds[rounds.length - 1]!)!);
  rounds.forEach((round, index) => labels.set(round, eliminationRoundLabel(last + rounds.length - 1 - index)));
  return labels;
}

/** Every round with at least one match: Swiss first, then the bracket, each labelled. */
export function eventRounds(matches: readonly MatchRecord[]): RoundInfo[] {
  const stages = new Map<number, MatchStage>();
  for (const match of matches) {
    // A round is top cut only if every match in it is; mixed data falls back to Swiss.
    const seen = stages.get(match.round);
    stages.set(match.round, seen === undefined ? match.stage : seen === match.stage ? seen : "swiss");
  }
  const cutLabels = topCutRoundLabels(matches.filter((m) => stages.get(m.round) === "top-cut"));
  return [...stages.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, stage]) => {
      if (stage === "top-cut") {
        const label = cutLabels.get(round) ?? `Round ${round}`;
        return { round, stage, label, shortLabel: label };
      }
      return { round, stage, label: `Round ${round}`, shortLabel: `R${round}` };
    });
}

/** Result text from player 1's side. Matches without a game score read "1-0" / "0-1". */
export function matchResultLabel(match: MatchRecord): string {
  if (match.outcome === "bye" || match.player2Id === null) return "Bye";
  if (match.outcome === "draw") return match.intentionalDraw ? "ID" : "Draw";
  if (match.games) return `${match.games.p1}-${match.games.p2}`;
  return match.outcome === "p1" ? "1-0" : "0-1";
}

/** Pairings of one round, by table (unnumbered tables last), then player 1 id. */
export function pairingsForRound(matches: readonly MatchRecord[], round: number): PairingRow[] {
  return matches
    .filter((match) => match.round === round)
    .sort(
      (a, b) =>
        (a.table ?? Number.MAX_SAFE_INTEGER) - (b.table ?? Number.MAX_SAFE_INTEGER) ||
        (a.player1Id < b.player1Id ? -1 : a.player1Id > b.player1Id ? 1 : 0),
    )
    .map((match) => ({
      key: `${match.round}:${match.table ?? "-"}:${match.player1Id}`,
      table: match.table ?? null,
      player1Id: match.player1Id,
      player2Id: match.outcome === "bye" ? null : match.player2Id,
      result: matchResultLabel(match),
      winner: match.outcome === "bye" || match.outcome === "p1" ? "p1" : match.outcome === "p2" ? "p2" : null,
    }));
}
