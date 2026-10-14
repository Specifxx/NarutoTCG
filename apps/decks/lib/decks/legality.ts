import type { Decklist } from "@naruto-tcg/types";
import { CARD_INDEX, isCardLegalOn } from "@/lib/data/cards";
import { RULES } from "@/lib/rules";

export type LegalityCode =
  | "unknown-leader"
  | "leader-not-a-leader"
  | "unknown-card"
  | "leader-in-main-deck"
  | "wrong-deck-size"
  | "too-many-copies"
  | "invalid-quantity"
  | "not-legal-yet";

export interface LegalityIssue {
  code: LegalityCode;
  message: string;
  cardId?: string;
}

export function mainDeckSize(decklist: Decklist): number {
  return decklist.cards.reduce((sum, entry) => sum + entry.quantity, 0);
}

/**
 * Checks a list against {@link RULES}: a known Leader, exactly 50 main-deck cards, at most
 * 4 copies of each card, no Leaders in the main deck and, when `date` is given, only cards
 * from sets released on or before that date.
 */
export function checkDecklistLegality(decklist: Decklist, options: { date?: string } = {}): LegalityIssue[] {
  const issues: LegalityIssue[] = [];
  const leader = CARD_INDEX.get(decklist.leaderId);
  if (!leader) {
    issues.push({ code: "unknown-leader", message: `Unknown Leader "${decklist.leaderId}".`, cardId: decklist.leaderId });
  } else if (leader.type !== "leader") {
    issues.push({ code: "leader-not-a-leader", message: `${leader.name} is not a Leader card.`, cardId: leader.id });
  } else if (options.date && !isCardLegalOn(leader.id, options.date)) {
    issues.push({ code: "not-legal-yet", message: `${leader.name} was not legal on ${options.date}.`, cardId: leader.id });
  }

  const copies = new Map<string, number>();
  for (const entry of decklist.cards) {
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      issues.push({ code: "invalid-quantity", message: `Invalid quantity ${entry.quantity} for ${entry.cardId}.`, cardId: entry.cardId });
      continue;
    }
    copies.set(entry.cardId, (copies.get(entry.cardId) ?? 0) + entry.quantity);
  }

  for (const [cardId, quantity] of copies) {
    const card = CARD_INDEX.get(cardId);
    if (!card) {
      issues.push({ code: "unknown-card", message: `Unknown card "${cardId}".`, cardId });
      continue;
    }
    if (card.type === "leader") {
      issues.push({ code: "leader-in-main-deck", message: `${card.name} is a Leader and cannot be in the main deck.`, cardId });
    }
    if (quantity > RULES.maxCopies) {
      issues.push({ code: "too-many-copies", message: `${quantity} copies of ${card.name} (max ${RULES.maxCopies}).`, cardId });
    }
    if (options.date && !isCardLegalOn(cardId, options.date)) {
      issues.push({ code: "not-legal-yet", message: `${card.name} was not legal on ${options.date}.`, cardId });
    }
  }

  const size = mainDeckSize(decklist);
  if (size !== RULES.mainDeckSize) {
    issues.push({ code: "wrong-deck-size", message: `Main deck has ${size} cards; exactly ${RULES.mainDeckSize} required.` });
  }
  return issues;
}

export function isDecklistLegal(decklist: Decklist, options: { date?: string } = {}): boolean {
  return checkDecklistLegality(decklist, options).length === 0;
}
