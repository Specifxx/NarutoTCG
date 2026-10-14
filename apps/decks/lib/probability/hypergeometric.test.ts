import { describe, expect, it } from "vitest";
import { createRng, randInt } from "@/lib/random";
import { RULES } from "@/lib/rules";
import {
  cardsSeenByTurn,
  choose,
  type DrawGroup,
  expectedCopies,
  hypergeometricPmf,
  logChoose,
  logFactorial,
  multiGroupProbability,
  probAtLeast,
  probAtLeastOne,
  withMulligan,
} from "./hypergeometric";

/** Every `size`-card subset of positions 0..n-1. */
function* subsets(n: number, size: number, start = 0, chosen: number[] = []): Generator<number[]> {
  if (chosen.length === size) {
    yield chosen;
    return;
  }
  for (let i = start; i <= n - (size - chosen.length); i++) yield* subsets(n, size, i + 1, [...chosen, i]);
}

/** P(constraints hold) by enumerating every hand; cards are labelled with their group index, -1 for the rest. */
function bruteForce(deckSize: number, draws: number, groups: DrawGroup[]): number {
  const labels = groups.flatMap((group, index) => Array<number>(group.size).fill(index));
  while (labels.length < deckSize) labels.push(-1);
  let hits = 0;
  let total = 0;
  for (const hand of subsets(deckSize, draws)) {
    total++;
    const ok = groups.every((group, index) => {
      const k = hand.filter((position) => labels[position] === index).length;
      return k >= group.min && k <= (group.max ?? Infinity);
    });
    if (ok) hits++;
  }
  return hits / total;
}

describe("factorials and binomials", () => {
  it("computes ln(n!) and serves smaller n from the grown cache", () => {
    expect(logFactorial(0)).toBe(0);
    expect(logFactorial(1)).toBe(0);
    let sum = 0;
    for (let i = 2; i <= 60; i++) sum += Math.log(i);
    expect(logFactorial(60)).toBeCloseTo(sum, 10);
    expect(logFactorial(5)).toBeCloseTo(Math.log(120), 12);
    expect(logFactorial(10) - logFactorial(9)).toBeCloseTo(Math.log(10), 12);
  });

  it("returns exact binomial coefficients", () => {
    expect(choose(50, 5)).toBe(2118760);
    expect(choose(46, 5)).toBe(1370754);
    expect(choose(50, 8)).toBe(536878650);
    expect(choose(52, 26)).toBe(495918532948104);
    expect(choose(50, 25)).toBe(126410606437752);
    expect(choose(7, 0)).toBe(1);
    expect(choose(7, 7)).toBe(1);
    expect(choose(0, 0)).toBe(1);
    expect(choose(7, 8)).toBe(0);
    expect(choose(7, -1)).toBe(0);
  });

  it("stays exact for every coefficient below 2^53", () => {
    let row = [1];
    for (let n = 1; n <= 70; n++) {
      row = Array.from({ length: n + 1 }, (_, k) => (k === 0 || k === n ? 1 : row[k - 1] + row[k]));
      for (let k = 0; k <= n; k++) if (row[k] <= Number.MAX_SAFE_INTEGER) expect(choose(n, k), `C(${n},${k})`).toBe(row[k]);
    }
    expect(choose(55, 26)).toBe(3560597348629860);
    expect(choose(56, 28)).toBe(7648690600760440);
  });

  it("satisfies symmetry and Pascal's rule", () => {
    for (let n = 1; n <= 50; n++) {
      for (let k = 0; k <= n; k++) {
        expect(choose(n, k)).toBe(choose(n, n - k));
        expect(choose(n, k)).toBe(choose(n - 1, k - 1) + choose(n - 1, k));
      }
    }
  });

  it("keeps logChoose consistent with choose", () => {
    expect(logChoose(50, 5)).toBeCloseTo(Math.log(2118760), 10);
    expect(logChoose(5, 6)).toBe(-Infinity);
  });

  it("rejects invalid arguments", () => {
    expect(() => logFactorial(-1)).toThrow(RangeError);
    expect(() => logFactorial(2.5)).toThrow(RangeError);
    expect(() => choose(-3, 1)).toThrow(RangeError);
  });
});

describe("hypergeometric distribution", () => {
  it("gives P(>=1 of 4 copies in a 5-card hand from 50) = 1 - C(46,5)/C(50,5)", () => {
    const exact = 1 - 1370754 / 2118760;
    expect(probAtLeastOne(50, 4, 5)).toBeCloseTo(exact, 12);
    expect(probAtLeastOne(50, 4, 5)).toBeCloseTo(0.35304, 5);
  });

  it("gives P(>=1 of 4 copies by turn 3 on the draw) = 1 - C(46,8)/C(50,8)", () => {
    const seen = cardsSeenByTurn(3, { onThePlay: false });
    expect(seen).toBe(8);
    expect(probAtLeastOne(50, 4, seen)).toBeCloseTo(1 - 260932815 / 536878650, 12);
    expect(probAtLeastOne(50, 4, seen)).toBeCloseTo(0.513982, 6);
    expect(probAtLeastOne(50, 4, cardsSeenByTurn(3, { onThePlay: true }))).toBeCloseTo(0.464134, 6);
  });

  it("has a pmf that sums to 1 over its support and is 0 outside it", () => {
    for (const [N, K, n] of [
      [50, 4, 5],
      [50, 12, 9],
      [12, 5, 7],
      [10, 10, 4],
      [10, 0, 4],
      [8, 3, 8],
    ]) {
      let total = 0;
      for (let k = 0; k <= n; k++) total += hypergeometricPmf(N, K, n, k);
      expect(total).toBeCloseTo(1, 12);
    }
    expect(hypergeometricPmf(50, 4, 5, 5)).toBe(0);
    expect(hypergeometricPmf(10, 8, 5, 2)).toBe(0);
    expect(hypergeometricPmf(50, 4, 5, -1)).toBe(0);
  });

  it("is symmetric in successes and draws, and in successes and failures", () => {
    for (let k = 0; k <= 4; k++) {
      expect(hypergeometricPmf(50, 4, 7, k)).toBeCloseTo(hypergeometricPmf(50, 7, 4, k), 12);
      expect(hypergeometricPmf(50, 4, 7, k)).toBeCloseTo(hypergeometricPmf(50, 46, 7, 7 - k), 12);
    }
  });

  it("matches the textbook formula on a small case", () => {
    expect(hypergeometricPmf(10, 4, 3, 2)).toBeCloseTo((choose(4, 2) * choose(6, 1)) / choose(10, 3), 12);
  });

  it("accumulates upper tails", () => {
    expect(probAtLeast(50, 4, 5, 0)).toBe(1);
    expect(probAtLeast(50, 4, 5, 1)).toBeCloseTo(probAtLeastOne(50, 4, 5), 12);
    expect(probAtLeast(50, 4, 5, 2)).toBeCloseTo(
      hypergeometricPmf(50, 4, 5, 2) + hypergeometricPmf(50, 4, 5, 3) + hypergeometricPmf(50, 4, 5, 4),
      12,
    );
    expect(probAtLeast(50, 4, 5, 5)).toBe(0);
    expect(probAtLeastOne(50, 0, 5)).toBe(0);
    expect(probAtLeastOne(50, 50, 1)).toBe(1);
  });

  it("computes expected copies as the pmf mean", () => {
    expect(expectedCopies(50, 4, 5)).toBeCloseTo(0.4, 12);
    let mean = 0;
    for (let k = 0; k <= 4; k++) mean += k * hypergeometricPmf(50, 4, 9, k);
    expect(expectedCopies(50, 4, 9)).toBeCloseTo(mean, 12);
    expect(expectedCopies(0, 0, 0)).toBe(0);
  });

  it("rejects inconsistent parameters", () => {
    expect(() => hypergeometricPmf(50, 51, 5, 1)).toThrow(RangeError);
    expect(() => probAtLeastOne(50, 4, 51)).toThrow(RangeError);
    expect(() => expectedCopies(50, -1, 5)).toThrow(RangeError);
    expect(() => probAtLeast(50, 4, 5, Number.NaN)).toThrow(RangeError);
  });
});

describe("multiGroupProbability", () => {
  it("matches brute-force enumeration of every hand on small decks", () => {
    const cases: Array<{ deckSize: number; draws: number; groups: DrawGroup[] }> = [];
    for (let minA = 0; minA <= 3; minA++) {
      for (const maxB of [undefined, 0, 1, 2, 3]) {
        cases.push({ deckSize: 12, draws: 4, groups: [{ size: 3, min: minA }, { size: 4, min: 1, max: maxB }] });
      }
    }
    cases.push(
      { deckSize: 12, draws: 5, groups: [{ size: 2, min: 1 }, { size: 3, min: 1, max: 2 }, { size: 4, min: 1 }] },
      { deckSize: 12, draws: 6, groups: [{ size: 4, min: 0, max: 1 }, { size: 4, min: 2 }, { size: 4, min: 1, max: 3 }] },
      { deckSize: 10, draws: 4, groups: [{ size: 5, min: 2, max: 2 }, { size: 5, min: 2, max: 2 }] },
      { deckSize: 12, draws: 12, groups: [{ size: 3, min: 3 }, { size: 4, min: 4, max: 4 }] },
      { deckSize: 12, draws: 0, groups: [{ size: 3, min: 0 }] },
    );
    for (const { deckSize, draws, groups } of cases) {
      expect(multiGroupProbability({ deckSize, draws, groups })).toBeCloseTo(bruteForce(deckSize, draws, groups), 12);
    }
  });

  it("matches brute force on seeded random decks, including empty decks and groups", () => {
    const rng = createRng("multi-group");
    for (let trial = 0; trial < 200; trial++) {
      const deckSize = randInt(rng, 0, 11);
      const draws = randInt(rng, 0, deckSize);
      const groups: DrawGroup[] = [];
      let left = deckSize;
      for (let g = randInt(rng, 0, 3); g > 0; g--) {
        const size = randInt(rng, 0, left);
        left -= size;
        const min = randInt(rng, 0, 4);
        groups.push(rng() < 0.5 ? { size, min } : { size, min, max: randInt(rng, 0, 5) });
      }
      expect(multiGroupProbability({ deckSize, draws, groups })).toBeCloseTo(bruteForce(deckSize, draws, groups), 12);
    }
  });

  it("reduces to the hypergeometric tail for one group", () => {
    expect(multiGroupProbability({ deckSize: 50, draws: 5, groups: [{ size: 4, min: 1 }] })).toBeCloseTo(probAtLeastOne(50, 4, 5), 12);
    expect(multiGroupProbability({ deckSize: 50, draws: 9, groups: [{ size: 12, min: 2 }] })).toBeCloseTo(probAtLeast(50, 12, 9, 2), 12);
    expect(multiGroupProbability({ deckSize: 50, draws: 5, groups: [{ size: 4, min: 1, max: 1 }] })).toBeCloseTo(
      hypergeometricPmf(50, 4, 5, 1),
      12,
    );
  });

  it("treats no groups as certain and unsatisfiable constraints as impossible", () => {
    expect(multiGroupProbability({ deckSize: 50, draws: 5, groups: [] })).toBe(1);
    expect(multiGroupProbability({ deckSize: 50, draws: 5, groups: [{ size: 2, min: 3 }] })).toBe(0);
    expect(multiGroupProbability({ deckSize: 50, draws: 5, groups: [{ size: 8, min: 3, max: 2 }] })).toBe(0);
    expect(multiGroupProbability({ deckSize: 50, draws: 5, groups: [{ size: 8, min: 3 }, { size: 8, min: 3 }] })).toBe(0);
    expect(multiGroupProbability({ deckSize: 50, draws: 5, groups: [{ size: 8, min: 6 }] })).toBe(0);
  });

  it("validates its inputs", () => {
    expect(() => multiGroupProbability({ deckSize: 10, draws: 4, groups: [{ size: 6, min: 1 }, { size: 5, min: 1 }] })).toThrow(RangeError);
    expect(() => multiGroupProbability({ deckSize: 10, draws: 11, groups: [] })).toThrow(RangeError);
    expect(() => multiGroupProbability({ deckSize: 10, draws: 4, groups: [{ size: 3, min: -1 }] })).toThrow(RangeError);
    expect(() => multiGroupProbability({ deckSize: 10, draws: 4, groups: [{ size: 3, min: 1, max: 1.5 }] })).toThrow(RangeError);
  });
});

describe("cardsSeenByTurn", () => {
  it("counts the opening hand plus one draw per turn, skipping turn 1 on the play", () => {
    expect(RULES.firstPlayerSkipsDraw).toBe(true);
    expect([0, 1, 2, 3, 4].map((turn) => cardsSeenByTurn(turn, { onThePlay: true }))).toEqual([5, 5, 6, 7, 8]);
    expect([0, 1, 2, 3, 4].map((turn) => cardsSeenByTurn(turn, { onThePlay: false }))).toEqual([5, 6, 7, 8, 9]);
    expect(cardsSeenByTurn(2, { onThePlay: false, handSize: 7 })).toBe(9);
    expect(() => cardsSeenByTurn(-1, { onThePlay: true })).toThrow(RangeError);
  });
});

describe("withMulligan", () => {
  it("treats each reshuffled hand as an independent attempt", () => {
    expect(RULES.freeMulligans).toBe(1);
    expect(withMulligan(0.5)).toBeCloseTo(0.75, 12);
    expect(withMulligan(0.5, 2)).toBeCloseTo(0.875, 12);
    expect(withMulligan(0.3, 0)).toBeCloseTo(0.3, 12);
    expect(withMulligan(0)).toBe(0);
    expect(withMulligan(1)).toBe(1);
    const p = probAtLeastOne(50, 4, 5);
    expect(withMulligan(p)).toBeCloseTo(1 - (1 - p) ** 2, 12);
  });

  it("clamps rounding noise and rejects bad input", () => {
    expect(withMulligan(1 + 1e-15)).toBe(1);
    expect(withMulligan(-1e-15)).toBe(0);
    expect(() => withMulligan(Number.NaN)).toThrow(RangeError);
    expect(() => withMulligan(0.5, -1)).toThrow(RangeError);
  });
});
