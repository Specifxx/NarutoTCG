"use client";

import { useEffect } from "react";
import { chooseAiAction } from "@/lib/game-engine/ai";
import { SPEEDS, useGameStore } from "@/lib/game-engine/store";

/** Drives the automatic parts of the game: phase resolution steps and AI turns. */
export function useGameDirector() {
  const game = useGameStore((s) => s.game);
  const speed = useGameStore((s) => s.speed);

  useEffect(() => {
    if (!game) return;
    const { phase: phaseDelay, ai: aiDelay } = SPEEDS[speed];
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (game.phase === "start" || game.phase === "mission" || game.phase === "end") {
      const delay = game.phase === "mission" ? phaseDelay * 1.8 : phaseDelay;
      timer = setTimeout(() => {
        const { game: current, dispatch } = useGameStore.getState();
        if (current === game) dispatch({ type: "ADVANCE" });
      }, delay);
    } else if ((game.phase === "setup" || game.phase === "action") && game.players[game.activePlayer].controller === "ai") {
      timer = setTimeout(() => {
        const { game: current, ctx, dispatch } = useGameStore.getState();
        if (current !== game || !ctx) return;
        const error = dispatch(chooseAiAction(current, ctx, current.activePlayer));
        if (error) {
          console.error("AI chose an illegal action:", error);
          dispatch({ type: "PASS", player: current.activePlayer });
        }
      }, game.phase === "setup" ? aiDelay * 0.6 : aiDelay);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [game, speed]);
}
