import type { CardType, Decklist, NarutoCard } from "@naruto-tcg/types";
import { CARD_INDEX } from "@/lib/data/cards";
import { cardCounts } from "@/lib/decks/deck-utils";
import { mainDeckSize } from "@/lib/decks/legality";
import { cardsSeenByTurn, multiGroupProbability, probAtLeastOne, withMulligan } from "@/lib/probability/hypergeometric";
import { RULES } from "@/lib/rules";

/** A serializable hand requirement: at least `min` cards that match it. */
export type HandCondition =
  | { kind: "card"; cardId: string; min: number }
  | { kind: "cards"; label: string; cardIds: string[]; min: number }
  | { kind: "type"; type: CardType; min: number; maxCost?: number };

export type CardIndex = ReadonlyMap<string, NarutoCard>;

/** A condition resolved against a decklist. */
export interface ConditionGroup {
  condition: HandCondition;
  /** Distinct main-deck card ids that count toward the condition. */
  cardIds: string[];
  /** Copies of those cards in the main deck. */
  size: number;
  min: number;
}

export interface ProbabilityRow {
  cardId: string;
  copies: number;
  /** P(at least one copy in the opening hand). */
  pOpening: number;
  /** P(at least one copy seen by each requested turn), in the order of `turns`. */
  pByTurn: number[];
}

export const DEFAULT_TABLE_TURNS: readonly number[] = [0, 1, 2, 3, 4, 5];

/** True when the card counts toward the condition. Unknown cards only match by id. */
export function cardMatchesCondition(cardId: string, condition: HandCondition, cardIndex: CardIndex = CARD_INDEX): boolean {
  switch (condition.kind) {
    case "card":
      return cardId === condition.cardId;
    case "cards":
      return condition.cardIds.includes(cardId);
    case "type": {
      const card = cardIndex.get(cardId);
      return card?.type === condition.type && (condition.maxCost === undefined || (card.cost ?? 0) <= condition.maxCost);
    }
  }
}

/** Resolves each condition to the main-deck cards that satisfy it and their total copies. */
export function resolveConditionGroups(
  decklist: Decklist,
  conditions: readonly HandCondition[],
  cardIndex: CardIndex = CARD_INDEX,
): ConditionGroup[] {
  const counts = cardCounts(decklist);
  return conditions.map((condition) => {
    const cardIds = [...counts.keys()].filter((cardId) => cardMatchesCondition(cardId, condition, cardIndex));
    const size = cardIds.reduce((sum, cardId) => sum + counts.get(cardId)!, 0);
    return { condition, cardIds, size, min: condition.min };
  });
}

/** True when no deck card counts toward more than one group, so the exact multi-group math applies. */
export function conditionsAreDisjoint(groups: readonly ConditionGroup[]): boolean {
  const seen = new Set<string>();
  for (const { cardIds } of groups) {
    for (const cardId of cardIds) {
      if (seen.has(cardId)) return false;
      seen.add(cardId);
    }
  }
  return true;
}

/**
 * Exact P(every condition holds) after seeing `draws` cards (capped at the deck size), or
 * `null` when conditions share cards and only simulation can answer.
 */
export function exactConditionProbability(
  decklist: Decklist,
  conditions: readonly HandCondition[],
  draws: number,
  cardIndex: CardIndex = CARD_INDEX,
): number | null {
  const groups = resolveConditionGroups(decklist, conditions, cardIndex);
  if (!conditionsAreDisjoint(groups)) return null;
  const deckSize = mainDeckSize(decklist);
  return multiGroupProbability({ deckSize, draws: Math.min(draws, deckSize), groups });
}

/**
 * P(at least one copy) of every distinct main-deck card in the opening hand and by each of
 * `turns` (see {@link cardsSeenByTurn}); most likely first, then by card name.
 */
export function probabilityTable(
  decklist: Decklist,
  { onThePlay, turns = DEFAULT_TABLE_TURNS }: { onThePlay: boolean; turns?: readonly number[] },
): ProbabilityRow[] {
  const deckSize = mainDeckSize(decklist);
  const opening = Math.min(RULES.openingHandSize, deckSize);
  const seen = turns.map((turn) => Math.min(cardsSeenByTurn(turn, { onThePlay }), deckSize));
  const name = (cardId: string) => CARD_INDEX.get(cardId)?.name ?? cardId;
  return [...cardCounts(decklist)]
    .map(([cardId, copies]) => ({
      cardId,
      copies,
      pOpening: probAtLeastOne(deckSize, copies, opening),
      pByTurn: seen.map((draws) => probAtLeastOne(deckSize, copies, draws)),
    }))
    .sort((a, b) => b.pOpening - a.pOpening || name(a.cardId).localeCompare(name(b.cardId)) || a.cardId.localeCompare(b.cardId));
}

/** P(at least one mulligan target in the opening hand), before and after the free mulligan. */
export function keepableHandOdds(
  decklist: Decklist,
  mulliganTargets: readonly string[],
): { pOpening: number; pWithMulligan: number } {
  const counts = cardCounts(decklist);
  const copies = [...new Set(mulliganTargets)].reduce((sum, cardId) => sum + (counts.get(cardId) ?? 0), 0);
  const deckSize = mainDeckSize(decklist);
  const pOpening = probAtLeastOne(deckSize, copies, Math.min(RULES.openingHandSize, deckSize));
  return { pOpening, pWithMulligan: withMulligan(pOpening) };
}
