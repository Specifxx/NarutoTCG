import { chooseAiAction } from "./ai";
import { applyAction, createGame } from "./engine";
import type { EngineContext, GameSetup, GameState } from "./types";

const MAX_STEPS = 5000;

/** Plays a full AI-vs-AI game and returns the final state. */
export function simulateGame(setup: GameSetup, ctx: EngineContext): GameState {
  let s = createGame(setup, ctx);
  for (let step = 0; step < MAX_STEPS; step++) {
    if (s.phase === "gameover") return s;
    const action =
      s.phase === "start" || s.phase === "mission" || s.phase === "end"
        ? ({ type: "ADVANCE" } as const)
        : chooseAiAction(s, ctx, s.activePlayer);
    s = applyAction(s, action, ctx);
  }
  throw new Error(`Game did not finish within ${MAX_STEPS} steps (seed ${setup.seed}).`);
}
