"use client";

import { create } from "zustand";
import { applyAction, createGame, IllegalActionError } from "./engine";
import type { EngineContext, GameAction, GameSetup, GameState } from "./types";

export type Speed = "slow" | "normal" | "fast";

export const SPEEDS: Record<Speed, { phase: number; ai: number; label: string }> = {
  slow: { phase: 1700, ai: 1300, label: "Slow" },
  normal: { phase: 1000, ai: 750, label: "Normal" },
  fast: { phase: 450, ai: 280, label: "Fast" },
};

interface GameStore {
  game: GameState | null;
  ctx: EngineContext | null;
  setup: GameSetup | null;
  speed: Speed;
  /** Starts a game; returns an error message if the setup is invalid. */
  start: (setup: GameSetup, ctx: EngineContext) => string | null;
  /** Applies an action; returns the rule violation if it is illegal. */
  dispatch: (action: GameAction) => string | null;
  rematch: () => void;
  exit: () => void;
  setSpeed: (speed: Speed) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  ctx: null,
  setup: null,
  speed: "normal",
  start: (setup, ctx) => {
    try {
      set({ game: createGame(setup, ctx), ctx, setup });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  },
  dispatch: (action) => {
    const { game, ctx } = get();
    if (!game || !ctx) return "No game in progress.";
    try {
      set({ game: applyAction(game, action, ctx) });
      return null;
    } catch (e) {
      if (e instanceof IllegalActionError) return e.message;
      throw e;
    }
  },
  rematch: () => {
    const { setup, ctx } = get();
    if (!setup || !ctx) return;
    const next = { ...setup, seed: (Math.random() * 0xffffffff) >>> 0 || 1 };
    set({ game: createGame(next, ctx), setup: next });
  },
  exit: () => set({ game: null }),
  setSpeed: (speed) => set({ speed }),
}));
