import type { Decklist } from "@naruto-tcg/types";
import { expandDecklist } from "@/lib/decks/deck-utils";
import { exactConditionProbability, type HandCondition } from "@/lib/probability/conditions";
import { cardsSeenByTurn } from "@/lib/probability/hypergeometric";
import { evaluateConditions, simulateHands } from "@/lib/probability/simulate";
import { createRng } from "@/lib/random";
import { RULES } from "@/lib/rules";

/** Condition builder model for the Odds tab: editable rows → {@link HandCondition}s → a probability. */

export type ConditionKind = "card" | "cards" | "type";
export type ConditionCardType = "character" | "jutsu" | "mission";

export const CONDITION_KIND_LABELS: Record<ConditionKind, string> = {
  card: "Specific card",
  cards: "Any of several cards",
  type: "Card type",
};

export const CONDITION_TYPE_LABELS: Record<ConditionCardType, { one: string; many: string }> = {
  character: { one: "Character", many: "Characters" },
  jutsu: { one: "Jutsu", many: "Jutsus" },
  mission: { one: "Mission", many: "Missions" },
};

/** One editable row. Number fields keep the raw input so typing is never fought; they are normalized on use. */
export interface ConditionRow {
  id: string;
  kind: ConditionKind;
  cardId: string;
  cardIds: string[];
  cardType: ConditionCardType;
  /** Empty for no cost limit. */
  maxCost: string;
  min: string;
}

/** Hands sampled when overlapping conditions rule out the exact math. */
export const SIMULATION_TRIALS = 20_000;

/** Latest turn the horizon picker offers. */
export const MAX_HORIZON_TURN = 6;

export type ConditionResult =
  | { method: "exact"; probability: number; draws: number }
  | { method: "simulated"; probability: number; interval: [number, number]; trials: number; draws: number };

export function newConditionRow(id: string, init: Partial<Omit<ConditionRow, "id">> = {}): ConditionRow {
  return { id, kind: "card", cardId: "", cardIds: [], cardType: "character", maxCost: "", min: "1", ...init };
}

/** A minimum copy count: a whole number from 1 to the deck size; anything unreadable is 1. */
export function normalizeMin(raw: string | number): number {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isFinite(value)) return 1;
  return Math.min(RULES.mainDeckSize, Math.max(1, Math.round(value)));
}

/** A cost ceiling: a whole number of at least 0, or undefined when empty or unreadable. */
export function normalizeMaxCost(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

/** The condition a row describes, or null while it is incomplete (no card picked yet). */
export function rowToCondition(row: ConditionRow, nameOf: (cardId: string) => string = (id) => id): HandCondition | null {
  const min = normalizeMin(row.min);
  switch (row.kind) {
    case "card":
      return row.cardId ? { kind: "card", cardId: row.cardId, min } : null;
    case "cards": {
      const cardIds = [...new Set(row.cardIds)].filter(Boolean);
      if (cardIds.length === 0) return null;
      return { kind: "cards", label: `Any of ${cardIds.map(nameOf).join(", ")}`, cardIds, min };
    }
    case "type": {
      const maxCost = normalizeMaxCost(row.maxCost);
      return maxCost === undefined ? { kind: "type", type: row.cardType, min } : { kind: "type", type: row.cardType, min, maxCost };
    }
  }
}

/** Complete rows as hand conditions, in row order. */
export function rowsToConditions(rows: readonly ConditionRow[], nameOf?: (cardId: string) => string): HandCondition[] {
  return rows.map((row) => rowToCondition(row, nameOf)).filter((condition): condition is HandCondition => condition !== null);
}

/** Plain-language reading of a condition, e.g. "At least 2 Jutsus costing 2 or less". */
export function describeCondition(condition: HandCondition, nameOf: (cardId: string) => string = (id) => id): string {
  const atLeast = `At least ${condition.min}`;
  switch (condition.kind) {
    case "card":
      return `${atLeast} × ${nameOf(condition.cardId)}`;
    case "cards":
      return `${atLeast} of ${condition.cardIds.map(nameOf).join(", ")}`;
    case "type": {
      const labels = CONDITION_TYPE_LABELS[condition.type as ConditionCardType];
      const noun = labels ? (condition.min === 1 ? labels.one : labels.many) : condition.type;
      return `${atLeast} ${noun}${condition.maxCost === undefined ? "" : ` costing ${condition.maxCost} or less`}`;
    }
  }
}

/** "Opening hand" or "By turn N". */
export function horizonLabel(turn: number): string {
  return turn === 0 ? "Opening hand" : `By turn ${turn}`;
}

/** Cards seen by the horizon: the opening hand, plus one per turn (turn 1 skipped on the play). */
export function drawsForHorizon(turn: number, onThePlay: boolean): number {
  return cardsSeenByTurn(turn, { onThePlay });
}

/** Exact P(every condition) after `draws` cards, or null when the conditions overlap. */
export function exactResult(decklist: Decklist, conditions: readonly HandCondition[], draws: number): ConditionResult | null {
  const probability = exactConditionProbability(decklist, conditions, draws);
  return probability === null ? null : { method: "exact", probability, draws };
}

/** Monte Carlo estimate of P(every condition) after `draws` cards, with a 95% interval. */
export function simulatedResult(
  decklist: Decklist,
  conditions: readonly HandCondition[],
  draws: number,
  seed: number,
  trials: number = SIMULATION_TRIALS,
): ConditionResult {
  const result = simulateHands({
    deck: expandDecklist(decklist),
    draws,
    trials,
    rng: createRng(seed),
    condition: (hand) => evaluateConditions(hand, conditions),
  });
  return { method: "simulated", probability: result.rate, interval: result.interval, trials, draws };
}

/** Half the interval width: the "±" printed next to a simulated estimate. */
export function intervalMargin(interval: readonly [number, number]): number {
  return (interval[1] - interval[0]) / 2;
}
