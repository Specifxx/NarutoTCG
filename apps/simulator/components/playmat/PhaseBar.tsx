"use client";

import { motion } from "framer-motion";
import { Hourglass } from "lucide-react";
import { FORMAT } from "@/lib/game-engine/format";
import { useGameStore } from "@/lib/game-engine/store";
import type { Phase } from "@/lib/game-engine/types";
import { cx } from "../ui/Button";
import { PLAYER_COLORS } from "./MissionLane";

const STEPS: Array<{ phase: Phase; label: string; hint: string }> = [
  { phase: "setup", label: "Setup", hint: "Mulligan" },
  { phase: "start", label: "Start", hint: "+Chakra · draw 2" },
  { phase: "action", label: "Action", hint: "Alternate plays" },
  { phase: "mission", label: "Mission", hint: "Evaluate & score" },
  { phase: "end", label: "End", hint: "Clear tokens" },
];

export function PhaseBar() {
  const game = useGameStore((s) => s.game)!;
  const current = game.phase === "gameover" ? "end" : game.phase;
  const idx = STEPS.findIndex((s) => s.phase === current);
  const active = game.players[game.activePlayer];
  const status =
    game.phase === "gameover"
      ? "Game over"
      : game.phase === "setup"
        ? `${active.name} decides on a mulligan`
        : game.phase === "action"
          ? active.controller === "ai"
            ? `${active.name} is thinking…`
            : `${active.name}'s turn`
          : "Resolving…";

  return (
    <div className="panel flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-2.5">
      <div className="flex items-center gap-2" aria-label={`Round ${game.round} of ${FORMAT.rounds}`}>
        <span className="font-display text-[11px] uppercase tracking-[0.2em] text-ash-500">Round</span>
        <span className="font-display text-xl font-bold text-ash-50">{game.round}</span>
        <div className="flex gap-1">
          {Array.from({ length: FORMAT.rounds }, (_, i) => (
            <span
              key={i}
              className={cx("h-1.5 w-5 rounded-full transition-colors", i < game.round - 1 ? "bg-chakra-500/60" : i === game.round - 1 ? "bg-chakra-400 shadow-[0_0_8px_rgba(255,122,26,0.8)]" : "bg-white/10")}
            />
          ))}
        </div>
      </div>

      <ol className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-thin" aria-label="Phase">
        {STEPS.map((step, i) => {
          const on = i === idx;
          const done = i < idx;
          if (step.phase === "setup" && game.round > 1) return null;
          return (
            <li key={step.phase} className="flex items-center gap-1">
              {i > 0 && !(i === 1 && game.round > 1) && <span className={cx("h-px w-4", done || on ? "bg-chakra-400/60" : "bg-white/10")} />}
              <div className={cx("relative rounded-lg px-3 py-1.5", on ? "text-ash-50" : done ? "text-ash-300" : "text-ash-500")} aria-current={on ? "step" : undefined}>
                {on && (
                  <motion.span
                    layoutId="phase-pill"
                    className="absolute inset-0 rounded-lg border border-chakra-400/50 bg-chakra-500/15 shadow-[0_0_20px_-6px_rgba(255,122,26,0.8)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative block font-display text-xs font-bold uppercase tracking-[0.14em]">{step.label}</span>
                <span className="relative hidden text-[10px] text-ash-500 lg:block">{step.hint}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-ash-300">
          {game.phase === "action" && active.controller === "ai" && <Hourglass className="h-3.5 w-3.5 animate-spin text-chakra-400 [animation-duration:2s]" />}
          <span style={{ color: game.phase === "action" || game.phase === "setup" ? PLAYER_COLORS[game.activePlayer] : undefined }}>{status}</span>
        </span>
        <span className="flex items-center gap-2 rounded-lg border border-white/5 bg-shadow-950/60 px-3 py-1 font-display text-lg font-bold">
          <span style={{ color: PLAYER_COLORS[0] }}>{game.players[0].score}</span>
          <span className="text-xs text-ash-500">vs</span>
          <span style={{ color: PLAYER_COLORS[1] }}>{game.players[1].score}</span>
        </span>
      </div>
    </div>
  );
}
