import type { MatchRecord, TournamentPlayer } from "@naruto-tcg/types";
import { shuffle, type Rng } from "@/lib/random";
import { computeSwissStandings } from "@/lib/tournament/standings";

export interface SwissPairing {
  /** The higher-ranked player of the pair (or the bye recipient). */
  player1Id: string;
  /** `null` for a bye. */
  player2Id: string | null;
}

export interface PairSwissRoundArgs {
  /** 1-based round being paired; results through `round - 1` decide the order. */
  round: number;
  players: ReadonlyArray<Pick<TournamentPlayer, "id" | "dropped">>;
  /** Every match so far; only Swiss rounds before `round` are read. */
  matches: readonly MatchRecord[];
  /** Shuffles the round-1 order. */
  rng: Rng;
}

/** Search-step cap per pairing attempt, so an infeasible constraint set fails fast. */
const SEARCH_BUDGET = 200_000;

/** Order-independent key for a pair of players. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Pair keys of every Swiss match played before `beforeRound` (byes excluded). */
export function pairingHistory(matches: readonly MatchRecord[], beforeRound = Number.POSITIVE_INFINITY): Set<string> {
  const keys = new Set<string>();
  for (const match of matches) {
    if (match.stage !== "swiss" || match.round >= beforeRound || match.player2Id === null) continue;
    keys.add(pairKey(match.player1Id, match.player2Id));
  }
  return keys;
}

/** Ids of players who received a Swiss bye before `beforeRound`. */
export function byeRecipients(matches: readonly MatchRecord[], beforeRound = Number.POSITIVE_INFINITY): Set<string> {
  const ids = new Set<string>();
  for (const match of matches) {
    if (match.stage === "swiss" && match.round < beforeRound && match.player2Id === null) ids.add(match.player1Id);
  }
  return ids;
}

/**
 * Pairs `order` top-down (each unpaired player meets the next available player below them,
 * so odd score groups float their lowest player down), backtracking around rematches.
 * At most `maxRematches` rematches are allowed; null when none is found within the budget.
 */
function pairInOrder(order: readonly string[], history: ReadonlySet<string>, maxRematches: number): Array<[string, string]> | null {
  const used = new Array<boolean>(order.length).fill(false);
  const pairs: Array<[string, string]> = [];
  let steps = 0;

  const solve = (rematchesLeft: number): boolean => {
    const i = used.indexOf(false);
    if (i === -1) return true;
    used[i] = true;
    for (let j = i + 1; j < order.length && steps < SEARCH_BUDGET; j++) {
      if (used[j]) continue;
      const rematch = history.has(pairKey(order[i]!, order[j]!));
      if (rematch && rematchesLeft === 0) continue;
      steps++;
      used[j] = true;
      pairs.push([order[i]!, order[j]!]);
      if (solve(rematchesLeft - (rematch ? 1 : 0))) return true;
      pairs.pop();
      used[j] = false;
    }
    used[i] = false;
    return false;
  };

  return solve(maxRematches) ? pairs : null;
}

/**
 * Fewest-rematch pairing of `order` minus one bye option (`null` = no bye). Every option is
 * tried with zero rematches, then one, and so on, so an earlier option wins ties and a
 * later one wins only by needing fewer rematches.
 */
function pairLeastRematches(
  order: readonly string[],
  byeOptions: ReadonlyArray<string | null>,
  history: ReadonlySet<string>,
): { pairs: Array<[string, string]>; byeId: string | null } {
  for (let allowed = 0; allowed <= order.length / 2; allowed++) {
    for (const byeId of byeOptions) {
      const pairs = pairInOrder(byeId === null ? order : order.filter((id) => id !== byeId), history, allowed);
      if (pairs) return { pairs, byeId };
    }
  }
  throw new Error("Swiss pairing failed: no pairing found even with rematches allowed");
}

/**
 * Pairs one Swiss round. Round 1 is a seeded random draw. Later rounds rank the active
 * (non-dropped) players by {@link computeSwissStandings} through the previous round and
 * pair them top-down within match-point groups, never repeating a pairing unless that is
 * impossible (then the fewest rematches are used). With an odd field the bye goes to the
 * lowest-ranked player who has not had one, passing up the list only when that saves a
 * rematch; a second bye is given only once everyone has had one.
 * Returned in table order, the bye last.
 */
export function pairSwissRound(args: PairSwissRoundArgs): SwissPairing[] {
  const { round, players, matches, rng } = args;
  const active = players.filter((p) => !p.dropped);
  const order =
    round === 1
      ? shuffle(rng, active.map((p) => p.id))
      : computeSwissStandings(players, matches, { throughRound: round - 1 })
          .filter((row) => !row.dropped)
          .map((row) => row.playerId);

  let byeOptions: Array<string | null> = [null];
  if (order.length % 2 === 1) {
    const hadBye = byeRecipients(matches, round);
    const bottomUp = order.slice().reverse();
    const fresh = bottomUp.filter((id) => !hadBye.has(id));
    byeOptions = fresh.length > 0 ? fresh : bottomUp;
  }
  const { pairs, byeId } = pairLeastRematches(order, byeOptions, pairingHistory(matches, round));

  const result: SwissPairing[] = pairs.map(([player1Id, player2Id]) => ({ player1Id, player2Id }));
  if (byeId !== null) result.push({ player1Id: byeId, player2Id: null });
  return result;
}
