"use client";

import { motion } from "framer-motion";
import { ChakraPool } from "@/components/game/chakra-pool";
import { EdgeToken } from "@/components/game/edge-token";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { GameState, Side } from "@/lib/game/types";

export type PhaseLabel = "action" | "opponent" | "evaluating" | "over";

function Plate({
  side,
  score,
  state,
  phase,
  registerPlate,
}: {
  side: Side;
  score: number;
  state: GameState;
  phase: PhaseLabel;
  registerPlate: (side: Side, el: HTMLElement | null) => void;
}) {
  const mine = side === "you";
  const hasEdge = state.edge === side;
  const passed = state.passed[side];
  const acting = phase === "action" && state.active === side && !passed;
  const thinking = phase === "opponent" && side === "opp" && !passed;

  return (
    <div
      ref={(el) => registerPlate(side, el)}
      className={cn(
        "relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border p-3",
        mine
          ? "border-energy-400/25 bg-gradient-to-br from-energy-500/10 via-shadow-900/60 to-shadow-900/60"
          : "border-blood-400/25 bg-gradient-to-bl from-blood-500/10 via-shadow-900/60 to-shadow-900/60",
        mine ? "items-start text-left" : "items-end text-right",
      )}
    >
      <div className={cn("flex w-full items-center gap-2", mine ? "justify-between" : "flex-row-reverse justify-between")}>
        <span className={cn("eyebrow !text-[10px]", mine ? "text-energy-300" : "text-blood-400")}>
          {mine ? "You" : "Opponent"}
        </span>
        <span className="relative flex h-[34px] w-[34px] items-center justify-center">
          {hasEdge ? (
            <EdgeToken size={34} layoutId="puzzle-edge-token" />
          ) : (
            <span
              className="h-[30px] w-[30px] rounded-full border border-dashed border-white/10"
              aria-hidden="true"
            />
          )}
        </span>
      </div>
      <p className="text-4xl font-black leading-none tabular-nums text-white">
        <AnimatedNumber value={score} />
        <span className="ml-1 text-xs font-bold text-ash-500">pts</span>
      </p>
      <div className={cn("flex flex-wrap items-center gap-1.5", mine ? "" : "justify-end")}>
        {hasEdge && (
          <span className="rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-bold text-gold-200">Edge holder</span>
        )}
        {passed ? (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-ash-300">Passed</span>
        ) : acting ? (
          <span className="flex items-center gap-1 rounded-full bg-energy-500/15 px-2 py-0.5 text-[10px] font-bold text-energy-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-energy-300" aria-hidden="true" />
            To act
          </span>
        ) : thinking ? (
          <span className="flex items-center gap-1 rounded-full bg-blood-500/15 px-2 py-0.5 text-[10px] font-bold text-blood-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blood-400" aria-hidden="true" />
            Acting
          </span>
        ) : (
          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-ash-400">Waiting</span>
        )}
      </div>
      {!mine && (
        <p className="text-[11px] text-ash-400">
          {state.hands.opp.length} in hand · {state.chakra.opp} Chakra
        </p>
      )}
    </div>
  );
}

export function Scoreboard({
  state,
  score,
  phase,
  maxChakra,
  projected,
  registerPlate,
}: {
  state: GameState;
  score: Record<Side, number>;
  phase: PhaseLabel;
  maxChakra: number;
  /** Final score if the Round ended right now. */
  projected: { score: Record<Side, number>; winner: Side; decidedByEdge: boolean } | null;
  registerPlate: (side: Side, el: HTMLElement | null) => void;
}) {
  const phaseText =
    phase === "evaluating"
      ? "Mission evaluation"
      : phase === "over"
        ? "Game over"
        : phase === "opponent"
          ? "Opponent's turn"
          : state.passed.opp
            ? "Your turns · opponent passed"
            : "Your turn";
  return (
    <section aria-label="Scoreboard" className="panel relative overflow-hidden p-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-energy-500/10 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-blood-500/10 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-1.5 !text-[10px] text-gold-300">
          <Icon name="clock" size={12} />
          Round {state.round} of 4{state.round === 4 ? " · Final" : ""}
        </p>
        <motion.p
          key={phaseText}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
            phase === "evaluating" || phase === "over"
              ? "border-gold-400/40 bg-gold-400/10 text-gold-200"
              : phase === "opponent"
                ? "border-blood-400/40 bg-blood-500/10 text-blood-400"
                : "border-energy-400/40 bg-energy-500/10 text-energy-200",
          )}
        >
          {phaseText}
        </motion.p>
      </div>
      <div className="relative mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Plate side="you" score={score.you} state={state} phase={phase} registerPlate={registerPlate} />
        <span className="text-xs font-black text-ash-500" aria-hidden="true">
          VS
        </span>
        <Plate side="opp" score={score.opp} state={state} phase={phase} registerPlate={registerPlate} />
      </div>
      <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2" aria-hidden="true">
        <ChakraPool value={state.chakra.you} max={maxChakra} label="Your Chakra" size="sm" />
        <span className="text-[11px] font-semibold text-ash-500">
          Unspent Chakra is discarded at the end of the Round
        </span>
      </div>
      {projected && (
        <p className="relative mt-3 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[12px] text-ash-400">
          <span>If the Round ended now:</span>
          <span className="font-black tabular-nums text-white">
            {projected.score.you}–{projected.score.opp}
          </span>
          <span
            className={cn("font-bold", projected.winner === "you" ? "text-leaf-300" : "text-blood-400")}
          >
            {projected.winner === "you" ? "you win" : "you lose"}
            {projected.decidedByEdge ? " (tie, Edge)" : ""}
          </span>
        </p>
      )}
    </section>
  );
}
