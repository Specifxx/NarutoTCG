import {
  applyAction,
  autoplayOpponent,
  bothPassed,
  createGame,
  evaluateRound,
  getLegalActions,
  type ScriptedAction,
} from "./engine";
import type {
  CardCatalog,
  EmblemName,
  GameAction,
  GameEvent,
  GameSetup,
  GameState,
  RoundEvaluation,
} from "./types";

export type PuzzleDifficulty = "Genin" | "Chunin" | "Jonin";

export interface PuzzleSolutionStep {
  action: GameAction;
  /** Why this play is correct; supports RichText markup. */
  why: string;
}

export interface PuzzleDef {
  /** URL slug, e.g. "ambush-at-the-gate". */
  id: string;
  order: number;
  title: string;
  difficulty: PuzzleDifficulty;
  emblem: EmblemName;
  tagline: string;
  /** Scenario briefing (RichText markup). */
  briefing: string;
  /** One-line win condition shown above the board. */
  objective: string;
  /** Keyword ids this puzzle practises. */
  teaches: string[];
  /** Progressive hints, weakest first (RichText markup). */
  hints: string[];
  /** Every card the puzzle references, keyed by id. */
  cards: CardCatalog;
  setup: GameSetup;
  /** What the opponent does on each of their turns; an empty script means they pass. */
  opponentScript: ScriptedAction[];
  /** The unique winning line (verified by `scripts/verify-puzzles.ts`). */
  solution: PuzzleSolutionStep[];
  xp: number;
}

/** A puzzle attempt: the live state plus history for undo. */
export interface PuzzleRun {
  state: GameState;
  cursor: number;
  /** Your actions so far. */
  actions: GameAction[];
  /** States before each of your actions (for undo). */
  history: Array<{ state: GameState; cursor: number }>;
  /** Events from the latest step (your action + the opponent's replies). */
  lastEvents: GameEvent[];
  evaluation: RoundEvaluation | null;
}

export function startRun(puzzle: PuzzleDef): PuzzleRun {
  const initial = autoplayOpponent(createGame(puzzle.setup), puzzle.cards, puzzle.opponentScript, 0);
  return {
    state: initial.state,
    cursor: initial.cursor,
    actions: [],
    history: [],
    lastEvents: initial.events,
    evaluation: bothPassed(initial.state) ? evaluateRound(initial.state, puzzle.cards) : null,
  };
}

export function stepRun(
  puzzle: PuzzleDef,
  run: PuzzleRun,
  action: GameAction,
): { ok: true; run: PuzzleRun } | { ok: false; reason: string } {
  if (run.evaluation) return { ok: false, reason: "This attempt is over. Undo or reset to try again." };
  const result = applyAction(run.state, action, puzzle.cards);
  if (!result.ok) return result;
  const opp = autoplayOpponent(result.state, puzzle.cards, puzzle.opponentScript, run.cursor);
  return {
    ok: true,
    run: {
      state: opp.state,
      cursor: opp.cursor,
      actions: [...run.actions, action],
      history: [...run.history, { state: run.state, cursor: run.cursor }],
      lastEvents: [...result.events, ...opp.events],
      evaluation: bothPassed(opp.state) ? evaluateRound(opp.state, puzzle.cards) : null,
    },
  };
}

export function undoRun(run: PuzzleRun): PuzzleRun {
  const previous = run.history[run.history.length - 1];
  if (!previous) return run;
  return {
    state: previous.state,
    cursor: previous.cursor,
    actions: run.actions.slice(0, -1),
    history: run.history.slice(0, -1),
    lastEvents: [],
    evaluation: null,
  };
}

export interface SolveReport {
  /** Every winning sequence of your actions (each ends with a pass). */
  wins: GameAction[][];
  /** Terminal lines explored. */
  lines: number;
  truncated: boolean;
}

/**
 * Exhaustively explores your possible action sequences against the scripted
 * opponent and returns every line that wins the game.
 */
export function solvePuzzle(
  puzzle: Pick<PuzzleDef, "cards" | "setup" | "opponentScript">,
  limit = 2_000_000,
): SolveReport {
  const { cards, opponentScript } = puzzle;
  const wins: GameAction[][] = [];
  let lines = 0;
  let truncated = false;
  const start = autoplayOpponent(createGame(puzzle.setup), cards, opponentScript, 0);

  const visit = (state: GameState, cursor: number, path: GameAction[]) => {
    if (truncated) return;
    if (bothPassed(state)) {
      lines += 1;
      if (lines > limit) truncated = true;
      if (evaluateRound(state, cards).winner === "you") wins.push(path);
      return;
    }
    for (const action of getLegalActions(state, cards, "you")) {
      const result = applyAction(state, action, cards);
      if (!result.ok) continue;
      const opp = autoplayOpponent(result.state, cards, opponentScript, cursor);
      visit(opp.state, opp.cursor, [...path, action]);
    }
  };

  visit(start.state, start.cursor, []);
  return { wins, lines, truncated };
}

/** Stable string form of an action, for comparing sequences. */
export function actionKey(action: GameAction): string {
  switch (action.type) {
    case "play":
      return `play:${action.cardId}@${action.missionId}${action.hidden ? ":hidden" : ""}`;
    case "reveal":
      return `reveal:${action.uid}`;
    case "upgrade":
      return `upgrade:${action.cardId}>${action.uid}`;
    case "pass":
      return "pass";
  }
}
