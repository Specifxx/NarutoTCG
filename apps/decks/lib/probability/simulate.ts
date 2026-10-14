import { CARD_INDEX } from "@/lib/data/cards";
import { cardMatchesCondition, type CardIndex, type HandCondition } from "@/lib/probability/conditions";
import { shuffle, type Rng } from "@/lib/random";

/** Monte Carlo hand sampling for the opening-hand drawer and for conditions the exact math cannot handle. */

export interface SimulationResult {
  hits: number;
  trials: number;
  rate: number;
  /** 95% Wilson score interval for `rate`. */
  interval: [number, number];
}

const Z_95 = 1.96;

function wilsonInterval(hits: number, trials: number): [number, number] {
  const p = hits / trials;
  const z2 = Z_95 * Z_95;
  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const margin = (Z_95 * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denominator;
  // The bounds are exactly 0 and 1 at the extremes; pin them against rounding.
  return [hits === 0 ? 0 : Math.max(0, center - margin), hits === trials ? 1 : Math.min(1, center + margin)];
}

/**
 * Shuffles a copy of `library` and draws `size` cards off the top (all of them if it runs out).
 * The returned library is the shuffled remainder, so its first card is the next draw.
 */
export function drawHand(library: readonly string[], size: number, rng: Rng): { hand: string[]; library: string[] } {
  if (!Number.isInteger(size) || size < 0) throw new RangeError(`Hand size must be a non-negative integer, got ${size}.`);
  const shuffled = shuffle(rng, library);
  return { hand: shuffled.slice(0, size), library: shuffled.slice(size) };
}

/**
 * Estimates P(`condition` holds for `draws` cards from `deck`) over `trials` shuffles. With
 * `mulligans`, a failed hand is shuffled back and redrawn up to that many times.
 */
export function simulateHands({
  deck,
  draws,
  trials,
  rng,
  condition,
  mulligans = 0,
}: {
  deck: readonly string[];
  draws: number;
  trials: number;
  rng: Rng;
  condition: (hand: string[]) => boolean;
  mulligans?: number;
}): SimulationResult {
  if (!Number.isInteger(trials) || trials < 1) throw new RangeError(`Trials must be a positive integer, got ${trials}.`);
  if (!Number.isInteger(mulligans) || mulligans < 0) throw new RangeError(`Mulligans must be a non-negative integer, got ${mulligans}.`);
  let hits = 0;
  for (let trial = 0; trial < trials; trial++) {
    for (let attempt = 0; attempt <= mulligans; attempt++) {
      if (condition(drawHand(deck, draws, rng).hand)) {
        hits++;
        break;
      }
    }
  }
  return { hits, trials, rate: hits / trials, interval: wilsonInterval(hits, trials) };
}

/**
 * True when the hand meets every condition. Each condition is counted on its own, so one card
 * may satisfy several overlapping conditions.
 */
export function evaluateConditions(
  hand: readonly string[],
  conditions: readonly HandCondition[],
  cardIndex: CardIndex = CARD_INDEX,
): boolean {
  return conditions.every(
    (condition) => hand.filter((cardId) => cardMatchesCondition(cardId, condition, cardIndex)).length >= condition.min,
  );
}
