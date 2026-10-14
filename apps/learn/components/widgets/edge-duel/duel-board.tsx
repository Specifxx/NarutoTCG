"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/cn";
import type { GameState } from "@/lib/game/types";
import { ActionPanel } from "./action-panel";
import { DuelLog } from "./duel-log";
import { DuelResult } from "./duel-result";
import type { DuelDef } from "./duels";
import { MissionLane } from "./mission-lane";
import { Seat } from "./seat";
import { useDuel, type DuelPhase } from "./use-duel";
import { useMediaQuery } from "./use-media";

function turnLabel(phase: DuelPhase, state: GameState): { text: string; tone: "you" | "opp" | "neutral" } {
  switch (phase) {
    case "over":
      return { text: "Round over", tone: "neutral" };
    case "scoring":
      return { text: "Mission evaluation", tone: "neutral" };
    case "rival-turn":
      return { text: state.passed.you ? "Rival's turns (you passed)" : "Rival's turn", tone: "opp" };
    case "resolving":
      return { text: "Resolving…", tone: "you" };
    case "your-turn":
      return { text: state.passed.opp ? "Your turns (rival passed)" : "Your turn", tone: "you" };
  }
}

function TurnIndicator({ phase, state }: { phase: DuelPhase; state: GameState }) {
  const { text, tone } = turnLabel(phase, state);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.07] bg-black/25 px-3 py-2.5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "flex items-center gap-2 text-sm font-black",
            tone === "you" ? "text-energy-300" : tone === "opp" ? "text-blood-400" : "text-ash-200",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              tone === "you"
                ? "bg-energy-300 shadow-[0_0_8px_rgba(56,196,255,0.9)]"
                : tone === "opp"
                  ? "bg-blood-400 shadow-[0_0_8px_rgba(239,64,96,0.9)]"
                  : "bg-ash-400",
            )}
          />
          {text}
        </motion.span>
      </AnimatePresence>
      <span className="flex items-center gap-1.5 text-[12px] font-bold text-gold-200">
        <Emblem name="edge" size={14} />
        Edge: {state.edge === "you" ? "You" : "Rival"}
      </span>
    </div>
  );
}

/** One playable duel: briefing, board, actions, log and the scored result. Remount to retry. */
export function DuelBoard({
  duel,
  index,
  total,
  hintsShown,
  onHint,
  onFinish,
  onRetry,
  onNext,
  nextLabel,
}: {
  duel: DuelDef;
  index: number;
  total: number;
  hintsShown: number;
  onHint: () => void;
  onFinish: (won: boolean) => void;
  onRetry: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const { state, phase, log, evaluation, firstPasser, flourish, fresh, yourActions, act } = useDuel(duel);
  const compact = useMediaQuery("(max-width: 479px)");
  const reported = useRef(false);

  useEffect(() => {
    if (phase !== "over" || !evaluation || reported.current) return;
    reported.current = true;
    onFinish(evaluation.winner === "you");
  }, [phase, evaluation, onFinish]);

  const outcome = evaluation ? { evaluation, state, firstPasser, yourActions, won: evaluation.winner === "you" } : null;
  const explanation = outcome ? duel.explain(outcome) : "";
  const latest = log[log.length - 1];
  const announcement = outcome ? `${outcome.won ? "Duel won." : "Duel lost."} ${explanation}` : (latest?.text ?? "");
  const score = evaluation && phase === "over" ? evaluation.scoreAfter : state.score;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1 text-gold-300">
            <Emblem name={duel.emblem} size={14} />
            Duel {index + 1} of {total}
            <span className="text-ash-500">·</span>
            <span className="text-ash-400">{duel.roundLabel}</span>
          </p>
          <h3 className="mt-1.5 text-xl font-black tracking-tight text-white sm:text-2xl">{duel.title}</h3>
          <p className="mt-0.5 text-sm text-ash-400">{duel.tagline}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-ash-500">{duel.scoreLabel}</span>
          <span className="flex items-baseline gap-1 text-energy-300">
            <span className="text-[11px] font-black">You</span>
            <AnimatedNumber value={score.you} className="text-xl font-black tabular-nums text-white" />
          </span>
          <span className="text-ash-500">:</span>
          <span className="flex items-baseline gap-1 text-blood-400">
            <AnimatedNumber value={score.opp} className="text-xl font-black tabular-nums text-white" />
            <span className="text-[11px] font-black">Rival</span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4">
        <RichText as="p" text={duel.briefing} className="text-[14px] leading-relaxed text-ash-300" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/[0.08] px-3 py-1 text-[12.5px] font-bold text-gold-200">
            <Icon name="target" size={13} />
            Goal: {duel.objective}
          </span>
          <Button variant="ghost" size="sm" onClick={onHint} disabled={hintsShown >= duel.hints.length}>
            <Icon name="lightbulb" size={14} />
            {hintsShown >= duel.hints.length ? "No more hints" : `Hint ${hintsShown + 1} of ${duel.hints.length}`}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {duel.hints.slice(0, hintsShown).map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mt-2 flex gap-2 rounded-xl border border-gold-400/15 bg-gold-400/[0.05] px-3 py-2 text-[13px] leading-relaxed text-ash-200">
                <Icon name="lightbulb" size={14} className="mt-0.5 shrink-0 text-gold-300" />
                <RichText text={hint} />
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <LayoutGroup id={`edge-duel-${duel.id}`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="min-w-0 space-y-3">
            <Seat
              side="opp"
              chakra={state.chakra.opp}
              passed={state.passed.opp}
              holdsEdge={state.edge === "opp"}
              flourish={flourish}
              active={phase === "rival-turn"}
              hand={state.hands.opp}
              cards={duel.cards}
            />
            {state.missions.map((m) => (
              <MissionLane
                key={m.def.id}
                mission={m}
                state={state}
                cards={duel.cards}
                fresh={fresh}
                compact={compact}
              />
            ))}
            <Seat
              side="you"
              chakra={state.chakra.you}
              passed={state.passed.you}
              holdsEdge={state.edge === "you"}
              flourish={flourish}
              active={phase === "your-turn"}
              cards={duel.cards}
            />
          </div>

          <div className="min-w-0 space-y-3">
            <TurnIndicator phase={phase} state={state} />
            <AnimatePresence mode="wait" initial={false}>
              {phase === "over" && evaluation ? (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DuelResult
                    evaluation={evaluation}
                    state={state}
                    explanation={explanation}
                    scoreLabel={duel.scoreLabel}
                    isFinalRound={state.round === 4}
                    onRetry={onRetry}
                    onNext={onNext}
                    nextLabel={nextLabel}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <ActionPanel state={state} cards={duel.cards} phase={phase} onAct={act} compact={compact} />
                </motion.div>
              )}
            </AnimatePresence>
            <DuelLog log={log} />
          </div>
        </div>
      </LayoutGroup>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
