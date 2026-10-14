import { RULES } from "@/lib/rules";

/**
 * Exact draw probabilities for opening hands and early turns. Decks are small (50 cards), so
 * binomial coefficients stay exact in double precision.
 */

const LOG_FACTORIALS: number[] = [0];

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative integer, got ${value}.`);
}

function assertHypergeometric(N: number, K: number, n: number): void {
  assertCount(N, "Population size");
  assertCount(K, "Success count");
  assertCount(n, "Draw count");
  if (K > N) throw new RangeError(`Success count ${K} exceeds the population of ${N}.`);
  if (n > N) throw new RangeError(`Cannot draw ${n} cards from ${N}.`);
}

function clampProbability(p: number): number {
  return Math.min(1, Math.max(0, p));
}

/** ln(n!), memoized across calls. */
export function logFactorial(n: number): number {
  assertCount(n, "n");
  for (let i = LOG_FACTORIALS.length; i <= n; i++) LOG_FACTORIALS.push(LOG_FACTORIALS[i - 1] + Math.log(i));
  return LOG_FACTORIALS[n];
}

/** ln C(n, k); `-Infinity` when k is outside 0..n. */
export function logChoose(n: number, k: number): number {
  assertCount(n, "n");
  if (!Number.isInteger(k) || k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** C(n, k) by the multiplicative formula, exact while the result fits in 2^53; 0 when k is outside 0..n. */
export function choose(n: number, k: number): number {
  assertCount(n, "n");
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  const r = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= r; i++) {
    // C(n-r+i, i) = C(n-r+i-1, i-1)·(n-r+i)/i; cancelling gcd(result, i) first keeps both divisions exact.
    const g = gcd(result, i);
    result = (result / g) * ((n - r + i) / (i / g));
  }
  return result;
}

/** P(X = k) for X ~ Hypergeometric: `n` draws from `N` cards of which `K` are successes. */
export function hypergeometricPmf(N: number, K: number, n: number, k: number): number {
  assertHypergeometric(N, K, n);
  if (!Number.isInteger(k) || k < Math.max(0, n - (N - K)) || k > Math.min(K, n)) return 0;
  return clampProbability(Math.exp(logChoose(K, k) + logChoose(N - K, n - k) - logChoose(N, n)));
}

/** P(X >= k): at least `k` of the `K` successes among `n` draws from `N`. */
export function probAtLeast(N: number, K: number, n: number, k: number): number {
  assertHypergeometric(N, K, n);
  if (Number.isNaN(k)) throw new RangeError("Threshold must be a number.");
  if (k <= 0) return 1;
  let total = 0;
  for (let i = Math.ceil(k); i <= Math.min(K, n); i++) total += hypergeometricPmf(N, K, n, i);
  return clampProbability(total);
}

/** P(X >= 1): at least one of `K` copies among `n` draws from `N`. */
export function probAtLeastOne(N: number, K: number, n: number): number {
  return 1 - hypergeometricPmf(N, K, n, 0);
}

/** E[X] = n·K/N copies among `n` draws. */
export function expectedCopies(N: number, K: number, n: number): number {
  assertHypergeometric(N, K, n);
  return N === 0 ? 0 : (n * K) / N;
}

/** A set of cards drawn together as one constraint, e.g. "1–2 Lightning Jutsu". */
export interface DrawGroup {
  /** Copies of the group's cards in the deck. */
  size: number;
  /** Fewest copies wanted among the draws. */
  min: number;
  /** Most copies allowed among the draws; unbounded when omitted. */
  max?: number;
}

/**
 * P(every group lands between its `min` and `max` copies) when drawing `draws` cards from
 * `deckSize`. Groups must be disjoint; the rest of the deck forms an unconstrained remainder.
 * Exact: counts qualifying hands group by group over the number of draws used. Unsatisfiable
 * constraints give 0; inconsistent inputs (groups larger than the deck, overdrawing) throw.
 */
export function multiGroupProbability({
  deckSize,
  draws,
  groups,
}: {
  deckSize: number;
  draws: number;
  groups: readonly DrawGroup[];
}): number {
  assertCount(deckSize, "Deck size");
  assertCount(draws, "Draw count");
  if (draws > deckSize) throw new RangeError(`Cannot draw ${draws} cards from ${deckSize}.`);
  let grouped = 0;
  for (const group of groups) {
    assertCount(group.size, "Group size");
    assertCount(group.min, "Group min");
    if (group.max !== undefined) assertCount(group.max, "Group max");
    grouped += group.size;
  }
  if (grouped > deckSize) throw new RangeError(`Groups hold ${grouped} cards but the deck has ${deckSize}.`);

  // ways[r]: hands of r cards from the remainder plus the groups folded in so far that satisfy them.
  let ways = Array.from({ length: draws + 1 }, (_, r) => choose(deckSize - grouped, r));
  for (const { size, min, max = size } of groups) {
    const previous = ways;
    const hi = Math.min(size, max);
    ways = previous.map((_, r) => {
      let total = 0;
      for (let k = min; k <= Math.min(hi, r); k++) total += choose(size, k) * previous[r - k];
      return total;
    });
  }
  return clampProbability(ways[draws] / choose(deckSize, draws));
}

/**
 * Cards seen by your `turn` after its draw. Turn 0 is the opening hand alone; each later turn
 * draws one card, except that the player on the play skips the turn-1 draw.
 */
export function cardsSeenByTurn(
  turn: number,
  { onThePlay, handSize = RULES.openingHandSize }: { onThePlay: boolean; handSize?: number },
): number {
  assertCount(turn, "Turn");
  const skipped = turn >= 1 && onThePlay && RULES.firstPlayerSkipsDraw ? 1 : 0;
  return handSize + turn - skipped;
}

/**
 * P(keeping a qualifying hand) when a miss is shuffled back for a fresh hand up to `mulligans`
 * times. A full reshuffle makes every hand independent: 1 − (1 − p)^(1 + mulligans).
 */
export function withMulligan(p: number, mulligans: number = RULES.freeMulligans): number {
  if (Number.isNaN(p)) throw new RangeError("Probability must be a number.");
  assertCount(mulligans, "Mulligans");
  return 1 - (1 - clampProbability(p)) ** (1 + mulligans);
}
