"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { RankBadge } from "@/components/game/mission-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { GameState, MissionOutcome, RoundEvaluation, Side } from "@/lib/game/types";
import { SIDE_STYLE } from "./sides";

const reasonLabel = (o: MissionOutcome, edge: Side) =>
  o.reason === "power"
    ? "More Power"
    : o.reason === "edge-tiebreak"
      ? `Tie: Edge to ${edge === "you" ? "you" : "rival"}`
      : "Nobody had Power";

/** Mission-by-mission scoring, the final score and why you won or lost. */
export function DuelResult({
  evaluation,
  state,
  explanation,
  scoreLabel,
  isFinalRound,
  onRetry,
  onNext,
  nextLabel,
}: {
  evaluation: RoundEvaluation;
  state: GameState;
  explanation: string;
  scoreLabel: string;
  isFinalRound: boolean;
  onRetry: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const won = evaluation.winner === "you";
  const [fire, setFire] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(
      () => {
        setSettled(true);
        if (won) setFire(1);
      },
      220 + evaluation.outcomes.length * 260,
    );
    return () => window.clearTimeout(t);
  }, [won, evaluation.outcomes.length]);

  const shownScore = settled ? evaluation.scoreAfter : evaluation.scoreBefore;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={cn(
        "relative rounded-2xl border p-4 sm:p-5",
        won
          ? "border-leaf-400/35 bg-gradient-to-b from-leaf-500/[0.12] to-black/30 shadow-[0_0_40px_-12px_rgba(74,222,128,0.5)]"
          : "border-blood-400/35 bg-gradient-to-b from-blood-500/[0.12] to-black/30",
      )}
      aria-labelledby="edge-duel-result-title"
    >
      <ParticleBurst fire={fire} palette="leaf" shape="mixed" count={30} spread={150} />
      <p className="eyebrow flex items-center gap-1.5 text-ash-400">
        <Icon name="target" size={13} />
        Mission evaluation
      </p>

      <ol className="mt-3 space-y-2">
        {evaluation.outcomes.map((o, i) => {
          const mission = state.missions.find((m) => m.def.id === o.missionId);
          return (
            <motion.li
              key={o.missionId}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.26, type: "spring", stiffness: 300, damping: 26 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2"
            >
              <RankBadge rank={o.rank} size={26} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">{mission?.def.name ?? o.missionId}</p>
                <p className="text-[11.5px] text-ash-400">
                  <span className="font-bold text-energy-300">You {o.power.you}</span>
                  {" · "}
                  <span className="font-bold text-blood-400">Rival {o.power.opp}</span>
                  {" · "}
                  <span className={cn(o.reason === "edge-tiebreak" && "font-bold text-gold-200")}>
                    {reasonLabel(o, state.edge)}
                  </span>
                </p>
              </div>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-black",
                  o.winner
                    ? cn(SIDE_STYLE[o.winner].border, SIDE_STYLE[o.winner].soft, SIDE_STYLE[o.winner].text)
                    : "border-white/10 text-ash-500",
                )}
              >
                {o.reason === "edge-tiebreak" && <Emblem name="edge" size={12} />}
                {o.winner ? `${SIDE_STYLE[o.winner].label} +${o.points}` : "No one"}
              </span>
            </motion.li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
        <span className="text-[11.5px] font-semibold text-ash-400">{scoreLabel}</span>
        <span className="flex items-center gap-3 text-sm font-black tabular-nums">
          <span className="text-energy-300">
            You <AnimatedNumber value={shownScore.you} className="text-white" />
          </span>
          <span className="text-ash-500">vs</span>
          <span className="text-blood-400">
            Rival <AnimatedNumber value={shownScore.opp} className="text-white" />
          </span>
        </span>
      </div>
      {isFinalRound && settled && evaluation.decidedByEdge && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-gold-200">
          <Emblem name="edge" size={14} />
          Level after Round 4: the Edge holder ({state.edge === "you" ? "you" : "your rival"}) wins the game.
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={settled ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="mt-4"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              won
                ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950"
                : "bg-blood-500/20 text-blood-400 ring-1 ring-blood-400/40",
            )}
            aria-hidden="true"
          >
            <Icon name={won ? "trophy" : "rotate"} size={20} strokeWidth={2.2} />
          </span>
          <h3
            id="edge-duel-result-title"
            className={cn("text-xl font-black", won ? "text-leaf-300" : "text-blood-400")}
          >
            {won ? "Duel won!" : "Duel lost"}
          </h3>
        </div>
        <p className="mt-2 min-h-[2.5em] text-[14px] leading-relaxed text-ash-200">{settled ? explanation : ""}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {onNext && won && (
            <Button variant="success" onClick={onNext}>
              {nextLabel ?? "Next duel"}
              <Icon name="arrow-right" size={16} />
            </Button>
          )}
          <Button variant={won ? "secondary" : "primary"} onClick={onRetry}>
            <Icon name="refresh" size={15} />
            {won ? "Play it again" : "Retry this duel"}
          </Button>
        </div>
      </motion.div>
    </motion.section>
  );
}
