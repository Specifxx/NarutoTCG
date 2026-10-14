import { describe, expect, it } from "vitest";
import { getArchetype } from "@/lib/data/archetypes";
import { expandDecklist } from "@/lib/decks/deck-utils";
import { createRng } from "@/lib/random";
import { exactConditionProbability, type HandCondition } from "./conditions";
import { cardsSeenByTurn, probAtLeastOne, withMulligan } from "./hypergeometric";
import { drawHand, evaluateConditions, simulateHands } from "./simulate";
import { templateDecklist } from "./test-decks";

const DECK = templateDecklist(getArchetype("uchiha-avenger")!);
const LIBRARY = expandDecklist(DECK);
/** Karin (character, cost 1) and Chidori (jutsu, cost 2): 4 copies each. */
const KARIN = "NT02-003";
const CHIDORI = "NT02-006";
const TRIALS = 20_000;

/** Asserts a Monte Carlo rate is within 4 standard errors of the exact probability. */
function expectAgreement(rate: number, exact: number, trials = TRIALS): void {
  const standardError = Math.sqrt((exact * (1 - exact)) / trials);
  expect(Math.abs(rate - exact)).toBeLessThan(4 * standardError);
}

describe("drawHand", () => {
  it("draws from a shuffled copy without touching the input", () => {
    const library = Object.freeze([...LIBRARY]);
    const { hand, library: rest } = drawHand(library, 5, createRng("draw"));
    expect(hand).toHaveLength(5);
    expect(rest).toHaveLength(LIBRARY.length - 5);
    expect([...hand, ...rest].sort()).toEqual([...LIBRARY].sort());
    expect(library).toEqual(LIBRARY);
  });

  it("is deterministic for a seed and varies across seeds", () => {
    expect(drawHand(LIBRARY, 5, createRng(7))).toEqual(drawHand(LIBRARY, 5, createRng(7)));
    expect(drawHand(LIBRARY, 50, createRng(7)).hand).not.toEqual(drawHand(LIBRARY, 50, createRng(8)).hand);
  });

  it("draws everything when the library runs out and rejects bad sizes", () => {
    expect(drawHand(["a", "b"], 5, createRng(1)).hand.sort()).toEqual(["a", "b"]);
    expect(drawHand(["a", "b"], 0, createRng(1))).toMatchObject({ hand: [] });
    expect(() => drawHand(LIBRARY, -1, createRng(1))).toThrow(RangeError);
    expect(() => drawHand(LIBRARY, 1.5, createRng(1))).toThrow(RangeError);
  });
});

describe("simulateHands", () => {
  it("agrees with the exact opening-hand probability", () => {
    const result = simulateHands({ deck: LIBRARY, draws: 5, trials: TRIALS, rng: createRng("opening"), condition: (hand) => hand.includes(KARIN) });
    expect(result.trials).toBe(TRIALS);
    expect(result.rate).toBe(result.hits / TRIALS);
    expectAgreement(result.rate, probAtLeastOne(50, 4, 5));
  });

  it("agrees with the exact mulligan formula", () => {
    const result = simulateHands({
      deck: LIBRARY,
      draws: 5,
      trials: TRIALS,
      rng: createRng("mulligan"),
      condition: (hand) => hand.includes(KARIN),
      mulligans: 1,
    });
    expectAgreement(result.rate, withMulligan(probAtLeastOne(50, 4, 5), 1));
  });

  it("agrees with exact multi-condition odds by turn 3 on the draw", () => {
    const conditions: HandCondition[] = [{ kind: "type", type: "jutsu", min: 2 }, { kind: "card", cardId: KARIN, min: 1 }];
    const draws = cardsSeenByTurn(3, { onThePlay: false });
    const exact = exactConditionProbability(DECK, conditions, draws)!;
    const result = simulateHands({ deck: LIBRARY, draws, trials: TRIALS, rng: createRng("turn-3"), condition: (hand) => evaluateConditions(hand, conditions) });
    expectAgreement(result.rate, exact);
  });

  it("handles overlapping conditions the exact engine declines", () => {
    const conditions: HandCondition[] = [{ kind: "type", type: "character", min: 1 }, { kind: "card", cardId: KARIN, min: 1 }];
    expect(exactConditionProbability(DECK, conditions, 5)).toBeNull();
    const result = simulateHands({ deck: LIBRARY, draws: 5, trials: TRIALS, rng: createRng("overlap"), condition: (hand) => evaluateConditions(hand, conditions) });
    expectAgreement(result.rate, probAtLeastOne(50, 4, 5));
  });

  it("reports a 95% Wilson interval", () => {
    let calls = 0;
    const eightOfTen = simulateHands({ deck: LIBRARY, draws: 5, trials: 10, rng: createRng(1), condition: () => calls++ % 5 !== 0 });
    expect(eightOfTen.hits).toBe(8);
    expect(eightOfTen.interval[0]).toBeCloseTo(0.4902, 3);
    expect(eightOfTen.interval[1]).toBeCloseTo(0.9433, 3);
    const all = simulateHands({ deck: LIBRARY, draws: 5, trials: 10, rng: createRng(1), condition: () => true });
    expect(all.interval[0]).toBeCloseTo(0.7225, 3);
    expect(all.interval[1]).toBe(1);
    const none = simulateHands({ deck: LIBRARY, draws: 5, trials: 10, rng: createRng(1), condition: () => false });
    expect(none.interval[0]).toBe(0);
  });

  it("pins the interval to exactly 0 or 1 when every trial misses or hits", () => {
    for (let trials = 1; trials <= 40; trials++) {
      const base = { deck: ["a"], draws: 1, trials, rng: createRng(trials) };
      expect(simulateHands({ ...base, condition: () => false }).interval[0], `0/${trials}`).toBe(0);
      expect(simulateHands({ ...base, condition: () => true }).interval[1], `${trials}/${trials}`).toBe(1);
    }
  });

  it("rejects invalid trial and mulligan counts", () => {
    const base = { deck: LIBRARY, draws: 5, rng: createRng(1), condition: () => true };
    expect(() => simulateHands({ ...base, trials: 0 })).toThrow(RangeError);
    expect(() => simulateHands({ ...base, trials: 10, mulligans: -1 })).toThrow(RangeError);
  });
});

describe("evaluateConditions", () => {
  const hand = [KARIN, KARIN, CHIDORI, "NT02-004", "NT09-999"];

  it("requires every condition to hold", () => {
    expect(evaluateConditions(hand, [])).toBe(true);
    expect(evaluateConditions(hand, [{ kind: "card", cardId: KARIN, min: 2 }])).toBe(true);
    expect(evaluateConditions(hand, [{ kind: "card", cardId: KARIN, min: 3 }])).toBe(false);
    expect(evaluateConditions(hand, [{ kind: "card", cardId: KARIN, min: 1 }, { kind: "type", type: "mission", min: 1 }])).toBe(false);
    expect(evaluateConditions(hand, [{ kind: "cards", label: "Openers", cardIds: [KARIN, CHIDORI], min: 3 }])).toBe(true);
    expect(evaluateConditions(hand, [{ kind: "card", cardId: "NT09-999", min: 1 }])).toBe(true);
  });

  it("filters type conditions by cost and lets a card satisfy overlapping conditions", () => {
    expect(evaluateConditions(hand, [{ kind: "type", type: "character", min: 3 }])).toBe(true);
    expect(evaluateConditions(hand, [{ kind: "type", type: "character", min: 3, maxCost: 1 }])).toBe(false);
    expect(evaluateConditions(hand, [{ kind: "type", type: "character", min: 2, maxCost: 1 }])).toBe(true);
    expect(evaluateConditions([KARIN], [{ kind: "type", type: "character", min: 1 }, { kind: "card", cardId: KARIN, min: 1 }])).toBe(true);
  });
});
