"use client";

import { motion } from "framer-motion";
import type { RefObject } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { EdgeToken } from "@/components/game/edge-token";
import { RankBadge } from "@/components/game/mission-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  PREDICTION_LABEL,
  outcomeReason,
  toPrediction,
  type BuiltScenario,
  type Prediction,
} from "./scenarios";

/** End-of-evaluation report: each call marked right or wrong, with the reason. */
export function ResultsPanel({
  built,
  predictions,
  onRetry,
  onSwitch,
  otherTitle,
  headingRef,
  burst,
}: {
  built: BuiltScenario;
  predictions: Partial<Record<string, Prediction>>;
  onRetry: () => void;
  onSwitch: () => void;
  otherTitle: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  burst: number;
}) {
  const { scenario, evaluation, state } = built;
  const rows = evaluation.outcomes.map((o) => {
    const spec = scenario.missions.find((m) => m.missionId === o.missionId)!;
    const def = state.missions.find((m) => m.def.id === o.missionId)!.def;
    const call = predictions[o.missionId];
    const answer = toPrediction(o.winner);
    return { o, spec, def, call, answer, right: call === answer };
  });
  const rightCount = rows.filter((r) => r.right).length;
  const perfect = rightCount === rows.length;
  const { scoreAfter, winner, decidedByEdge } = evaluation;
  const hi = Math.max(scoreAfter.you, scoreAfter.opp);
  const lo = Math.min(scoreAfter.you, scoreAfter.opp);
  const finalLine = decidedByEdge
    ? `Final score ${scoreAfter.you}–${scoreAfter.opp}. A tied game goes to the Edge holder: ${winner === "you" ? "you win" : "your opponent wins"}.`
    : `Final score ${hi}–${lo}: ${winner === "you" ? "you win the game" : "your opponent wins the game"}.`;

  return (
    <motion.section
      aria-labelledby={`${scenario.id}-results`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className={cn(
        "relative mt-5 rounded-3xl border p-4 sm:p-6",
        perfect
          ? "border-leaf-400/40 bg-gradient-to-b from-leaf-500/[0.10] to-transparent shadow-[0_0_60px_-24px_rgba(74,222,128,0.7)]"
          : "border-gold-400/30 bg-gradient-to-b from-gold-400/[0.07] to-transparent",
      )}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              perfect
                ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950"
                : "bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950",
            )}
          >
            <Icon name={perfect ? "trophy" : "target"} size={24} strokeWidth={2.2} />
            <ParticleBurst fire={burst} palette="leaf" shape="mixed" count={34} spread={150} />
          </span>
          <div className="min-w-0">
            <h3 ref={headingRef} tabIndex={-1} id={`${scenario.id}-results`} className="scroll-mt-48 text-xl font-black text-white outline-none">
              {perfect ? "Perfect read!" : `${rightCount} of ${rows.length} calls right`}
            </h3>
            <p className="text-[13.5px] text-ash-400">
              {perfect
                ? "You scored every mission exactly as the rules do."
                : "Check the misses below, then make your calls again."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {perfect ? (
            <>
              <Button variant="gold" onClick={onSwitch}>
                <Icon name="layers" size={16} />
                Try “{otherTitle}”
              </Button>
              <Button variant="secondary" onClick={onRetry}>
                <Icon name="refresh" size={16} />
                Replay
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={onRetry}>
                <Icon name="undo" size={16} />
                Try again
              </Button>
              <Button variant="secondary" onClick={onSwitch}>
                <Icon name="layers" size={16} />
                Other board
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-[13px] font-semibold text-ash-200">
        {decidedByEdge ? <EdgeToken size={22} spin={false} /> : <Icon name="flag" size={16} className="shrink-0 text-gold-300" />}
        <span className="min-w-0">{finalLine}</span>
      </p>

      <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
        {rows.map(({ o, spec, def, call, answer, right }, i) => (
          <motion.li
            key={o.missionId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i + 0.1, type: "spring", stiffness: 260, damping: 24 }}
            className={cn(
              "flex gap-3 rounded-2xl border p-3",
              right ? "border-leaf-400/25 bg-leaf-500/[0.05]" : "border-blood-400/30 bg-blood-500/[0.06]",
            )}
          >
            <RankBadge rank={o.rank} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-bold text-white">{def.name}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-black",
                    right ? "bg-leaf-500/15 text-leaf-300" : "bg-blood-500/15 text-blood-400",
                  )}
                >
                  <Icon name={right ? "check" : "x"} size={12} strokeWidth={3} />
                  {right ? "Right" : "Wrong"}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-ash-400">
                Your call: <span className="font-bold text-ash-200">{call ? PREDICTION_LABEL[call] : "none"}</span>
                {!right && (
                  <>
                    {" "}
                    · Result: <span className="font-bold text-leaf-300">{PREDICTION_LABEL[answer]}</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-ash-200">{outcomeReason(o, scenario.edge)}</p>
              <p className="mt-1 text-[12px] leading-snug text-ash-400">
                <span className="font-bold text-gold-200">{spec.focus}.</span> {spec.insight}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
