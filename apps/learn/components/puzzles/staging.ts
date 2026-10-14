import { applyAction, bothPassed, createGame, type ScriptedAction } from "@/lib/game/engine";
import type { PuzzleDef, PuzzleRun } from "@/lib/game/puzzle";
import type { ActionResult, CardCatalog, GameAction, GameEvent, GameState, Side } from "@/lib/game/types";

/** One visible beat of a step: the state right after a single action, and what it caused. */
export interface StageFrame {
  side: Side;
  /** The action as taken (the opponent's is rebuilt from the script). */
  action: GameAction;
  /** State before this action (for describing it). */
  before: GameState;
  state: GameState;
  events: GameEvent[];
}

/**
 * Mirrors `autoplayOpponent` but keeps every intermediate state, so the
 * opponent's replies can be shown one at a time instead of all at once.
 */
export function opponentFrames(
  state: GameState,
  catalog: CardCatalog,
  script: readonly ScriptedAction[],
  cursor: number,
): StageFrame[] {
  const frames: StageFrame[] = [];
  let current = state;
  let guard = 0;
  while (!bothPassed(current) && current.active === "opp" && !current.passed.opp && guard++ < 64) {
    const entry = script[cursor];
    let action: GameAction | null = null;
    let result: ActionResult | null = null;
    if (entry && entry.type !== "pass") {
      action = { ...entry, side: "opp" } as GameAction;
      result = applyAction(current, action, catalog);
      if (result.ok) cursor += 1;
    }
    if (!result || !result.ok) {
      action = { type: "pass", side: "opp" };
      result = applyAction(current, action, catalog);
      cursor = script.length;
    }
    if (!result.ok || !action) break;
    frames.push({ side: "opp", action, before: current, state: result.state, events: result.events });
    current = result.state;
  }
  return frames;
}

/** Splits one of your steps into frames: your action, then each opponent reply. */
export function stepFrames(puzzle: PuzzleDef, run: PuzzleRun, action: GameAction): StageFrame[] {
  const mine = applyAction(run.state, action, puzzle.cards);
  if (!mine.ok) return [];
  return [
    { side: action.side, action, before: run.state, state: mine.state, events: mine.events },
    ...opponentFrames(mine.state, puzzle.cards, puzzle.opponentScript, run.cursor),
  ];
}

/** Frames the opponent plays before your first turn (when the setup starts on their turn). */
export function openingFrames(puzzle: PuzzleDef): StageFrame[] {
  return opponentFrames(createGame(puzzle.setup), puzzle.cards, puzzle.opponentScript, 0);
}
