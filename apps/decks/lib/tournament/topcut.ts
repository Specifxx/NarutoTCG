import type { MatchRecord } from "@naruto-tcg/types";

/** A decided top cut match: top cut has no draws. */
export interface TopCutResult {
  outcome: "p1" | "p2";
  games?: { p1: number; p2: number };
}

/** Plays one top cut match; `player1Id` is always the higher seed. */
export type TopCutResolver = (player1Id: string, player2Id: string, round: number) => TopCutResult;

export interface RunTopCutArgs {
  /** Player ids in seed order (index 0 = seed 1); the length must be a power of two. */
  seeds: readonly string[];
  /** Top cut rounds are numbered from `swissRounds + 1`. */
  swissRounds: number;
  resolve: TopCutResolver;
}

const isPowerOfTwo = (n: number) => Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0;

/**
 * First-round seed pairs in standard bracket order, built recursively so that the top two
 * seeds sit in opposite halves (the top four in different quarters, and so on).
 * `bracketSeedOrder(8)` → [[1,8],[4,5],[2,7],[3,6]].
 */
export function bracketSeedOrder(size: number): Array<[number, number]> {
  if (!isPowerOfTwo(size)) throw new Error(`Bracket size must be a power of two ≥ 2, got ${size}`);
  let slots = [1, 2];
  while (slots.length < size) {
    const next = slots.length * 2 + 1;
    slots = slots.flatMap((seed) => [seed, next - seed]);
  }
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < slots.length; i += 2) pairs.push([slots[i]!, slots[i + 1]!]);
  return pairs;
}

/**
 * Runs a single-elimination bracket to completion. Winners of adjacent matches meet next
 * round; the better seed is player1 and tables are numbered in bracket order each round.
 */
export function runTopCut(args: RunTopCutArgs): MatchRecord[] {
  const { seeds, swissRounds, resolve } = args;
  const seedOf = new Map(seeds.map((id, index) => [id, index + 1]));
  let alive = bracketSeedOrder(seeds.length).flatMap(([a, b]) => [seeds[a - 1]!, seeds[b - 1]!]);
  const matches: MatchRecord[] = [];

  for (let round = swissRounds + 1; alive.length > 1; round++) {
    const winners: string[] = [];
    for (let i = 0; i < alive.length; i += 2) {
      const [player1Id, player2Id] = seedOf.get(alive[i]!)! < seedOf.get(alive[i + 1]!)! ? [alive[i]!, alive[i + 1]!] : [alive[i + 1]!, alive[i]!];
      const result = resolve(player1Id, player2Id, round);
      matches.push({
        round,
        stage: "top-cut",
        table: i / 2 + 1,
        player1Id,
        player2Id,
        outcome: result.outcome,
        ...(result.games ? { games: result.games } : {}),
      });
      winners.push(result.outcome === "p1" ? player1Id : player2Id);
    }
    alive = winners;
  }
  return matches;
}
