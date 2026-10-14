/**
 * Deck construction and tournament rules used across the platform.
 * All seed data, legality checks and probability math read from here.
 */
export const RULES = {
  /** Exactly one Leader, kept outside the main deck. */
  leaderCount: 1,
  mainDeckSize: 50,
  maxCopies: 4,
  openingHandSize: 5,
  /** One free full mulligan: shuffle the hand back and draw a fresh 5. */
  freeMulligans: 1,
  /** The player going first skips their turn-1 draw. */
  firstPlayerSkipsDraw: true,
} as const;

export const MATCH_POINTS = { win: 3, draw: 1, loss: 0 } as const;

/** Opponents' match-win percentage floor used for tiebreakers. */
export const OMW_FLOOR = 0.33;
