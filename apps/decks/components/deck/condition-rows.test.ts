import { describe, expect, it } from "vitest";
import { getArchetype } from "@/lib/data/archetypes";
import { getCard } from "@/lib/data/cards";
import { probAtLeastOne } from "@/lib/probability/hypergeometric";
import { templateDecklist } from "@/lib/probability/test-decks";
import { RULES } from "@/lib/rules";
import {
  describeCondition,
  drawsForHorizon,
  exactResult,
  horizonLabel,
  intervalMargin,
  newConditionRow,
  normalizeMaxCost,
  normalizeMin,
  rowToCondition,
  rowsToConditions,
  simulatedResult,
} from "./condition-rows";

const nameOf = (id: string) => getCard(id)?.name ?? id;
const DECK = templateDecklist(getArchetype("uchiha-avenger")!);
const CHIDORI = "NT02-006";
const KARIN = "NT02-003";
const HAWK = "NT02-005";

describe("normalizing inputs", () => {
  it("rounds min counts to whole numbers of at least 1", () => {
    expect(normalizeMin("2")).toBe(2);
    expect(normalizeMin("2.6")).toBe(3);
    expect(normalizeMin("1.4")).toBe(1);
    expect(normalizeMin("0")).toBe(1);
    expect(normalizeMin("-3")).toBe(1);
    expect(normalizeMin("")).toBe(1);
    expect(normalizeMin("abc")).toBe(1);
    expect(normalizeMin(Number.POSITIVE_INFINITY)).toBe(1);
    expect(normalizeMin("999")).toBe(RULES.mainDeckSize);
  });

  it("reads an optional max cost", () => {
    expect(normalizeMaxCost("")).toBeUndefined();
    expect(normalizeMaxCost("  ")).toBeUndefined();
    expect(normalizeMaxCost("x")).toBeUndefined();
    expect(normalizeMaxCost("2.4")).toBe(2);
    expect(normalizeMaxCost("-1")).toBe(0);
  });
});

describe("rows → HandCondition[]", () => {
  it("maps each kind of row", () => {
    expect(rowToCondition(newConditionRow("1", { kind: "card", cardId: CHIDORI, min: "2" }))).toEqual({
      kind: "card",
      cardId: CHIDORI,
      min: 2,
    });
    expect(rowToCondition(newConditionRow("2", { kind: "cards", cardIds: [KARIN, HAWK, KARIN], min: "1.2" }), nameOf)).toEqual({
      kind: "cards",
      label: "Any of Karin, Hawk Summon",
      cardIds: [KARIN, HAWK],
      min: 1,
    });
    expect(rowToCondition(newConditionRow("3", { kind: "type", cardType: "jutsu", maxCost: "2", min: "2" }))).toEqual({
      kind: "type",
      type: "jutsu",
      min: 2,
      maxCost: 2,
    });
    expect(rowToCondition(newConditionRow("4", { kind: "type", cardType: "mission" }))).toEqual({ kind: "type", type: "mission", min: 1 });
  });

  it("skips incomplete rows and keeps row order", () => {
    const rows = [
      newConditionRow("a", { kind: "card" }),
      newConditionRow("b", { kind: "cards", cardIds: [] }),
      newConditionRow("c", { kind: "type", cardType: "character" }),
      newConditionRow("d", { kind: "card", cardId: KARIN }),
    ];
    expect(rowsToConditions(rows).map((condition) => condition.kind)).toEqual(["type", "card"]);
  });

  it("describes conditions in plain language", () => {
    expect(describeCondition({ kind: "card", cardId: CHIDORI, min: 1 }, nameOf)).toBe("At least 1 × Chidori");
    expect(describeCondition({ kind: "cards", label: "x", cardIds: [KARIN, HAWK], min: 2 }, nameOf)).toBe("At least 2 of Karin, Hawk Summon");
    expect(describeCondition({ kind: "type", type: "jutsu", min: 2, maxCost: 2 })).toBe("At least 2 Jutsus costing 2 or less");
    expect(describeCondition({ kind: "type", type: "character", min: 1 })).toBe("At least 1 Character");
  });
});

describe("horizon", () => {
  it("counts cards seen by each turn", () => {
    expect(horizonLabel(0)).toBe("Opening hand");
    expect(horizonLabel(3)).toBe("By turn 3");
    expect(drawsForHorizon(0, true)).toBe(RULES.openingHandSize);
    expect(drawsForHorizon(1, false)).toBe(RULES.openingHandSize + 1);
    expect(drawsForHorizon(3, true)).toBe(RULES.openingHandSize + 3 - (RULES.firstPlayerSkipsDraw ? 1 : 0));
  });
});

describe("evaluation", () => {
  it("is exact for disjoint conditions", () => {
    const result = exactResult(DECK, [{ kind: "card", cardId: CHIDORI, min: 1 }], 5);
    expect(result?.method).toBe("exact");
    expect(result?.probability).toBeCloseTo(probAtLeastOne(RULES.mainDeckSize, 4, 5), 10);
  });

  it("falls back to simulation for overlapping conditions, within the reported interval", () => {
    // "Chidori" overlaps "any of Chidori, Karin"; together they reduce to "at least one Chidori".
    const conditions = [
      { kind: "card" as const, cardId: CHIDORI, min: 1 },
      { kind: "cards" as const, label: "x", cardIds: [CHIDORI, KARIN], min: 1 },
    ];
    expect(exactResult(DECK, conditions, 7)).toBeNull();
    const result = simulatedResult(DECK, conditions, 7, 12345, 20_000);
    if (result.method !== "simulated") throw new Error("expected a simulated result");
    const truth = probAtLeastOne(RULES.mainDeckSize, 4, 7);
    expect(result.trials).toBe(20_000);
    expect(result.interval[0]).toBeLessThanOrEqual(truth + 0.005);
    expect(result.interval[1]).toBeGreaterThanOrEqual(truth - 0.005);
    expect(intervalMargin(result.interval)).toBeGreaterThan(0);
    expect(intervalMargin(result.interval)).toBeLessThan(0.01);
    // Same seed, same estimate.
    expect(simulatedResult(DECK, conditions, 7, 12345, 20_000).probability).toBe(result.probability);
  });
});
