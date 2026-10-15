import type { Decklist } from "@naruto-tcg/types";
import { drawHand } from "@/lib/probability/simulate";
import { createRng } from "@/lib/random";
import { RULES } from "@/lib/rules";

/**
 * Sample-hand state machine for the opening-hand drawer: draw an opening hand, take the free
 * mulligan, then draw turn by turn. Randomness arrives as a seed in the action, so the reducer
 * stays pure and replayable.
 */

export interface SampleHandDraw {
  cardId: string;
  /** The turn whose draw step produced the card. */
  turn: number;
}

export interface SampleHandState {
  /** The main deck, one id per physical card. */
  deck: string[];
  /** Mulligan targets: an opening hand with one of them is keepable. */
  targets: string[];
  onThePlay: boolean;
  /** Opening hand of the current game; empty until the first draw. */
  opening: string[];
  /** Cards drawn after the opening hand, in draw order. */
  draws: SampleHandDraw[];
  /** The shuffled rest of the deck; its first card is the next draw. */
  library: string[];
  /** 0 while only the opening hand is out, then the latest turn whose draw step happened. */
  turn: number;
  mulligansUsed: number;
  /** Opening hands drawn this session (mulligans included) and how many held a mulligan target. */
  tally: { hands: number; keepable: number };
}

export type SampleHandAction =
  | { type: "draw"; seed: number }
  | { type: "mulligan"; seed: number }
  | { type: "next" }
  | { type: "setOnThePlay"; onThePlay: boolean }
  | { type: "resetTally" };

export function createSampleHand({
  deck,
  targets,
  onThePlay = true,
}: {
  deck: readonly string[];
  targets: readonly string[];
  onThePlay?: boolean;
}): SampleHandState {
  return {
    deck: [...deck],
    targets: [...targets],
    onThePlay,
    opening: [],
    draws: [],
    library: [],
    turn: 0,
    mulligansUsed: 0,
    tally: { hands: 0, keepable: 0 },
  };
}

export interface MulliganTargets {
  cardIds: string[];
  /** Where the targets came from: the archetype's mulligan guide, or the deck's key cards as a fallback. */
  source: "archetype" | "key-cards" | "none";
}

/**
 * The mulligan targets this list actually runs: the archetype's targets present in the main deck,
 * else the deck's key cards (off-meta lists rarely share the archetype's openers).
 */
export function mulliganTargetsFor(decklist: Decklist, archetypeTargets: readonly string[], keyCardIds: readonly string[]): MulliganTargets {
  const inDeck = new Set(decklist.cards.filter((entry) => entry.quantity > 0).map((entry) => entry.cardId));
  const fromArchetype = [...new Set(archetypeTargets)].filter((id) => inDeck.has(id));
  if (fromArchetype.length > 0) return { cardIds: fromArchetype, source: "archetype" };
  const fromKeyCards = [...new Set(keyCardIds)].filter((id) => inDeck.has(id));
  return fromKeyCards.length > 0 ? { cardIds: fromKeyCards, source: "key-cards" } : { cardIds: [], source: "none" };
}

/** True when the hand holds at least one of the targets. */
export function hasTarget(hand: readonly string[], targets: readonly string[]): boolean {
  return hand.some((cardId) => targets.includes(cardId));
}

/** Cards currently in hand: the opening hand, then every draw. */
export function handCards(state: SampleHandState): string[] {
  return [...state.opening, ...state.draws.map((draw) => draw.cardId)];
}

/** True when the player on the play skips their turn-1 draw under the rules. */
export function skipsFirstDraw(onThePlay: boolean): boolean {
  return onThePlay && RULES.firstPlayerSkipsDraw;
}

/** The turn the next "draw" button press reaches: turn 1 is skipped on the play. */
export function nextDrawTurn(state: SampleHandState): number {
  const next = state.turn + 1;
  return next === 1 && skipsFirstDraw(state.onThePlay) ? 2 : next;
}

export function freeMulligansLeft(state: SampleHandState): number {
  return Math.max(0, RULES.freeMulligans - state.mulligansUsed);
}

/** A mulligan is only possible on an opening hand, before any draw, while free mulligans remain. */
export function canMulligan(state: SampleHandState): boolean {
  return state.opening.length > 0 && state.turn === 0 && freeMulligansLeft(state) > 0;
}

export function canDrawNext(state: SampleHandState): boolean {
  return state.opening.length > 0 && state.library.length > 0;
}

/**
 * Text for the sample-hand panel's live region. `lastDraw` (the panel's "Turn N draw: …") only
 * stands while draws are on the table: a turn-order change rewinds them, and the region then falls
 * back to the opening hand, naming the new turn order, so the switch is announced and an undone
 * draw is never repeated. Empty before the first hand.
 */
export function sampleHandStatus(
  state: SampleHandState,
  lastDraw: string,
  describeHand: (hand: readonly string[]) => string,
): string {
  if (state.draws.length > 0 && lastDraw) return lastDraw;
  if (state.opening.length === 0) return "";
  const after = state.mulligansUsed > 0 ? " after mulligan" : "";
  return `Opening hand${after}, ${state.onThePlay ? "on the play" : "on the draw"}: ${describeHand(state.opening)}`;
}

function dealOpeningHand(state: SampleHandState, seed: number, mulligansUsed: number): SampleHandState {
  const { hand, library } = drawHand(state.deck, RULES.openingHandSize, createRng(seed));
  return {
    ...state,
    opening: hand,
    library,
    draws: [],
    turn: 0,
    mulligansUsed,
    tally: {
      hands: state.tally.hands + 1,
      keepable: state.tally.keepable + (hasTarget(hand, state.targets) ? 1 : 0),
    },
  };
}

export function sampleHandReducer(state: SampleHandState, action: SampleHandAction): SampleHandState {
  switch (action.type) {
    case "draw":
      return dealOpeningHand(state, action.seed, 0);
    case "mulligan":
      return canMulligan(state) ? dealOpeningHand(state, action.seed, state.mulligansUsed + 1) : state;
    case "next": {
      if (!canDrawNext(state)) return state;
      const turn = nextDrawTurn(state);
      const [cardId, ...library] = state.library;
      return { ...state, turn, library, draws: [...state.draws, { cardId, turn }] };
    }
    case "setOnThePlay":
      if (action.onThePlay === state.onThePlay) return state;
      // Rewind to the opening hand; drawn cards go back on top in order, so the same draws replay.
      return {
        ...state,
        onThePlay: action.onThePlay,
        turn: 0,
        draws: [],
        library: [...state.draws.map((draw) => draw.cardId), ...state.library],
      };
    case "resetTally":
      return { ...state, tally: { hands: 0, keepable: 0 } };
  }
}
