import type { CardType, NarutoCard } from "@naruto-tcg/types";
import { CARD_INDEX, CARDS } from "@/lib/data/cards";
import { normalizeName, similarity, similarityBound } from "./text";

export type CardMatchMethod = "id" | "exact" | "normalized" | "fuzzy" | "none";

export interface CardSuggestion {
  cardId: string;
  name: string;
  /** Similarity 0..1. */
  score: number;
}

export interface CardResolution {
  cardId: string | null;
  /** 0..1. Below 0.8 for typos and for names shared by several cards of the preferred type. */
  confidence: number;
  method: CardMatchMethod;
  /** Best first: the other candidates of an ambiguous name, or near misses of an unknown one. */
  suggestions: CardSuggestion[];
}

export interface ResolveCardOptions {
  /** Breaks ties between cards sharing a name, e.g. `"leader"` on a "Leader:" line. */
  preferType?: CardType;
}

/** Similarity a misspelled name needs to resolve on its own; below it only suggestions are returned. */
export const FUZZY_THRESHOLD = 0.82;
const SUGGESTION_FLOOR = 0.5;
/** Alternatives listed next to a fuzzy match must score within this of it. */
const ALTERNATIVE_MARGIN = 0.1;
/** Score for a query whose words all appear in a card name ("Sasuke"): suggested, never auto-resolved. */
const WORD_MATCH_SCORE = 0.75;
const MAX_SUGGESTIONS = 3;

interface NameForm {
  key: string;
  /** The full printed name, as opposed to a shortened form. */
  full: boolean;
}

/** Each card under its full name plus the short forms players write: "Pain", "Massive Rasengan". */
const INDEX: ReadonlyArray<{ card: NarutoCard; forms: NameForm[] }> = CARDS.map((card) => {
  const forms: NameForm[] = [{ key: normalizeName(card.name), full: true }];
  const dash = card.name.indexOf(" — ");
  if (dash > 0) forms.push({ key: normalizeName(card.name.slice(0, dash)), full: false });
  const colon = card.name.indexOf(": ");
  if (colon > 0) forms.push({ key: normalizeName(card.name.slice(colon + 2)), full: false });
  return { card, forms };
});

/**
 * Longest text read as a card: the longest card name is 54 characters, so anything much longer is
 * not a card and is rejected before any pattern runs.
 */
export const MAX_CARD_TEXT_LENGTH = 200;
/** Longest text read as a bare id ("NT02 - L 002" and the like are well under it). */
const MAX_ID_LENGTH = 24;

/** An id once its separators are collapsed to single dashes: "nt-02-l-2", "nt02001". */
const ID_PATTERN = /^nt-?(\d{1,2})-?(l)?-?(\d{1,3})$/i;
/**
 * An id inside longer text whose whitespace is already collapsed to single spaces. Every
 * quantifier is bounded, so the scan stays linear.
 */
const EMBEDDED_ID = /\bnt ?\d{2} ?[-_ ]? ?l?\d{1,3}\b/i;
/** A trailing "(…)" or "[…]" group, checked from the last opening bracket. */
const TRAILING_GROUP = /^[([][^()[\]]*[)\]]\s*$/;

/**
 * Canonical id for any common spelling ("NT02-001", "nt02 001", "NT02001", "NT02-L2"), or null
 * when `input` is not shaped like an id. Does not check that the card exists.
 */
export function parseCardId(input: string): string | null {
  const text = input.trim();
  if (text.length > MAX_ID_LENGTH) return null;
  const match = text.replace(/[\s._/-]+/g, "-").match(ID_PATTERN);
  if (!match) return null;
  const set = `NT${match[1]!.padStart(2, "0")}`;
  const number = Number(match[3]);
  return match[2] ? `${set}-L${String(number).padStart(2, "0")}` : `${set}-${String(number).padStart(3, "0")}`;
}

/** `text` without a trailing "(…)" or "[…]" group, e.g. "Konan (NT02-009)" → "Konan". */
function stripTrailingGroup(text: string): string {
  const open = Math.max(text.lastIndexOf("("), text.lastIndexOf("["));
  return open >= 0 && TRAILING_GROUP.test(text.slice(open)) ? text.slice(0, open).trim() : text;
}

/** "Konan (NT02-009)", or the bare id for unknown cards. */
export function cardLabel(cardId: string): string {
  const card = CARD_INDEX.get(cardId);
  return card ? `${card.name} (${card.id})` : cardId;
}

/** Higher is better: the preferred type first, then anything that can go in the main deck. */
function typeRank(card: NarutoCard, preferType: CardType | undefined): number {
  return (preferType && card.type === preferType ? 2 : 0) + (card.type === "leader" ? 0 : 1);
}

const suggestion = (card: NarutoCard, score: number): CardSuggestion => ({
  cardId: card.id,
  name: card.name,
  score: Math.round(score * 100) / 100,
});

/**
 * Resolves free text to a card. Tries, in order: an id (alone, or embedded as in
 * "Konan (NT02-009)"); the full name or a short form, ignoring case, diacritics and
 * punctuation; then fuzzy matching for typos. Names shared by several cards ("Sasuke Uchiha"
 * is a Leader and a Character) resolve to `preferType` first, then to a non-Leader. Text longer
 * than {@link MAX_CARD_TEXT_LENGTH} resolves to nothing.
 */
export function resolveCard(input: string, options: ResolveCardOptions = {}): CardResolution {
  const none: CardResolution = { cardId: null, confidence: 0, method: "none", suggestions: [] };
  // Whitespace runs are collapsed and the length bounded before any pattern runs.
  const text = input.trim().replace(/\s+/g, " ");
  if (!text || text.length > MAX_CARD_TEXT_LENGTH) return none;

  const wholeId = parseCardId(text);
  if (wholeId) return CARD_INDEX.has(wholeId) ? { cardId: wholeId, confidence: 1, method: "id", suggestions: [] } : none;
  const embedded = text.match(EMBEDDED_ID);
  const embeddedId = embedded ? parseCardId(embedded[0]) : null;
  if (embeddedId && CARD_INDEX.has(embeddedId)) return { cardId: embeddedId, confidence: 1, method: "id", suggestions: [] };

  const name = stripTrailingGroup(text) || text;
  const query = normalizeName(name);
  if (!query) return none;
  const { preferType } = options;

  const candidates = INDEX.flatMap(({ card, forms }) => {
    const hits = forms.filter((form) => form.key === query);
    return hits.length > 0 ? [{ card, full: hits.some((form) => form.full) }] : [];
  }).sort(
    (a, b) => typeRank(b.card, preferType) - typeRank(a.card, preferType) || Number(b.full) - Number(a.full),
  );
  if (candidates.length > 0) {
    const best = candidates[0]!;
    const second = candidates[1];
    const tie = second !== undefined && typeRank(second.card, preferType) === typeRank(best.card, preferType) && second.full === best.full;
    return {
      cardId: best.card.id,
      confidence: tie ? 0.6 : best.full ? 1 : second ? 0.85 : 0.95,
      method: best.full && best.card.name === name ? "exact" : "normalized",
      suggestions: candidates.slice(1).map(({ card }) => suggestion(card, 1)),
    };
  }

  const words = query.split(" ");
  const scored = INDEX.map(({ card, forms }) => {
    let score = 0;
    for (const form of forms) {
      // Scores under the suggestion floor are never used, so a form that cannot reach it is skipped.
      if (similarityBound(query.length, form.key.length) >= SUGGESTION_FLOOR) {
        score = Math.max(score, similarity(query, form.key, Math.max(SUGGESTION_FLOOR, score)));
      }
      const formWords = form.key.split(" ");
      if (words.every((word) => formWords.includes(word))) score = Math.max(score, WORD_MATCH_SCORE);
    }
    return { card, score };
  }).sort((a, b) => b.score - a.score || typeRank(b.card, preferType) - typeRank(a.card, preferType));

  const near = scored.filter((s) => s.score >= SUGGESTION_FLOOR);
  const best = scored[0];
  if (best && best.score >= FUZZY_THRESHOLD) {
    return {
      cardId: best.card.id,
      confidence: Math.round(best.score * 100) / 100,
      method: "fuzzy",
      suggestions: near
        .slice(1, MAX_SUGGESTIONS + 1)
        .filter((s) => s.score >= best.score - ALTERNATIVE_MARGIN)
        .map((s) => suggestion(s.card, s.score)),
    };
  }
  return { ...none, suggestions: near.slice(0, MAX_SUGGESTIONS).map((s) => suggestion(s.card, s.score)) };
}

/** "Konan (NT02-009) or Asura Path (NT02-010)" for issue messages; empty when none. */
export function describeSuggestions(suggestions: readonly CardSuggestion[]): string {
  const labels = suggestions.map((s) => `${s.name} (${s.cardId})`);
  return labels.length <= 1 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}
