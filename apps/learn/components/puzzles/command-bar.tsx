"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type Ref } from "react";
import { ChakraPool } from "@/components/game/chakra-pool";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/game/types";
import type { Feedback } from "./types";

const TONE: Record<Feedback["tone"], { text: string; dot: string }> = {
  info: { text: "text-ash-200", dot: "bg-energy-300" },
  good: { text: "text-leaf-300", dot: "bg-leaf-400" },
  warn: { text: "text-blood-400", dot: "bg-blood-400" },
  opp: { text: "text-chakra-200", dot: "bg-blood-400" },
};

/** The live feedback line. Announced politely to screen readers. */
export function FeedbackLine({ feedback, className }: { feedback: Feedback; className?: string }) {
  const tone = TONE[feedback.tone];
  return (
    <p aria-live="polite" aria-atomic="true" className={cn("flex min-w-0 items-start gap-2 text-[12.5px] leading-snug", className)}>
      <span className={cn("mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={feedback.text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className={cn("min-w-0", tone.text)}
        >
          {feedback.text}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}

/** Compact live score. Scoring flights aim here because the bar is always on screen. */
function ScorePill({
  score,
  register,
  variant,
}: {
  score: Record<Side, number>;
  register: (key: string, el: HTMLElement | null) => void;
  variant: "m" | "d";
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[12px] font-black tabular-nums">
      <span className="sr-only">
        Score: you {score.you}, opponent {score.opp}
      </span>
      <span
        ref={(el) => register(`you:${variant}`, el)}
        aria-hidden="true"
        className="flex items-center gap-1 text-energy-200"
      >
        <span className="text-[10px] font-bold text-energy-300/80">You</span>
        <AnimatedNumber value={score.you} />
      </span>
      <span className="text-ash-500" aria-hidden="true">
        –
      </span>
      <span ref={(el) => register(`opp:${variant}`, el)} aria-hidden="true" className="flex items-center gap-1 text-blood-400">
        <AnimatedNumber value={score.opp} />
        <span className="text-[10px] font-bold text-blood-400/80">Opp</span>
      </span>
    </span>
  );
}

export function CommandBar({
  poolRef,
  chakra,
  maxChakra,
  feedback,
  score,
  scoreOnMobile,
  registerScore,
  canUndo,
  canPass,
  passLabel,
  passHint,
  locked,
  showResultButton,
  showSkip,
  onUndo,
  onReset,
  onPass,
  onShowResult,
  onSkip,
}: {
  poolRef: Ref<HTMLDivElement>;
  chakra: number;
  maxChakra: number;
  feedback: Feedback;
  score: Record<Side, number>;
  /** Small screens show the score only while missions are being scored. */
  scoreOnMobile: boolean;
  registerScore: (key: string, el: HTMLElement | null) => void;
  canUndo: boolean;
  canPass: boolean;
  passLabel: string;
  passHint: string;
  locked: boolean;
  showResultButton: boolean;
  /** While missions are being scored, the main button skips to the result. */
  showSkip: boolean;
  onUndo: () => void;
  onReset: () => void;
  onPass: () => void;
  onShowResult: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="panel flex flex-col gap-2 border-white/10 px-2.5 py-2 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.9)] sm:flex-row sm:items-center sm:gap-3 sm:px-3">
      <div className="flex items-start gap-2 px-1 sm:hidden">
        <FeedbackLine feedback={feedback} className="flex-1" />
        {scoreOnMobile && <ScorePill score={score} register={registerScore} variant="m" />}
      </div>
      <div className="flex items-center gap-2 sm:contents">
        <ChakraPool ref={poolRef} value={chakra} max={maxChakra} size="sm" className="shrink-0" />
        <FeedbackLine feedback={feedback} className="hidden flex-1 sm:flex" />
        <span className="hidden sm:flex">
          <ScorePill score={score} register={registerScore} variant="d" />
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={onUndo} disabled={!canUndo} aria-label="Undo last move" title="Undo last move">
            <Icon name="undo" size={15} />
            <span className="hidden md:inline">Undo</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} aria-label="Reset puzzle" title="Reset puzzle">
            <Icon name="refresh" size={15} />
            <span className="hidden md:inline">Reset</span>
          </Button>
          {showResultButton ? (
            <Button variant="gold" size="sm" onClick={onShowResult}>
              <Icon name="trophy" size={15} />
              Result
            </Button>
          ) : showSkip ? (
            <Button variant="secondary" size="sm" onClick={onSkip}>
              Skip
              <Icon name="chevron-right" size={15} />
            </Button>
          ) : (
            <Button
              variant="gold"
              size="sm"
              onClick={onPass}
              disabled={!canPass || locked}
              title={passHint}
              aria-label={`${passLabel}. ${passHint}`}
            >
              <Icon name="flag" size={15} />
              <span className="sm:hidden">Pass</span>
              <span className="hidden sm:inline">{passLabel}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CoachPanel({
  poolRef,
  chakra,
  maxChakra,
  step,
  total,
  headline,
  why,
  busy,
  finished,
  error,
  onNext,
  onExit,
}: {
  poolRef: Ref<HTMLDivElement>;
  chakra: number;
  maxChakra: number;
  /** 0-based index of the step about to be played. */
  step: number;
  total: number;
  headline: string;
  why: string;
  busy: boolean;
  finished: boolean;
  error: string | null;
  onNext: () => void;
  onExit: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Focus "Next step" once the panel appears (after any dialog that opened it has restored focus).
  useEffect(() => {
    const t = window.setTimeout(() => root.current?.querySelector<HTMLElement>("[data-coach-next]")?.focus(), 120);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      ref={root}
      role="region"
      aria-label="Solution walkthrough"
      className="panel relative flex flex-col gap-3 overflow-hidden border-gold-400/30 p-3 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.9)] sm:p-4"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/70 to-transparent" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-2 !text-[10px] text-gold-300">
          <Icon name="lightbulb" size={13} />
          Sensei walkthrough · {finished ? "complete" : `step ${step + 1} of ${total}`}
        </p>
        <div className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i < step ? "w-4 bg-gold-400" : i === step && !finished ? "w-6 bg-gold-200" : "w-3 bg-white/10",
              )}
            />
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={finished ? "done" : step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="max-h-[32vh] overflow-y-auto pr-1"
          aria-live="polite"
        >
          <p className="text-[15px] font-black text-white">{headline}</p>
          <RichText as="p" text={why} className="mt-1 text-[13px] leading-relaxed text-ash-300" />
          {error && <p className="mt-2 text-[12px] font-semibold text-blood-400">{error}</p>}
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center gap-2">
        <ChakraPool ref={poolRef} value={chakra} max={maxChakra} size="sm" className="shrink-0" />
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <Icon name="x" size={14} />
            <span>{finished ? "Close" : "Exit"}</span>
          </Button>
          {!finished && (
            <Button variant="gold" size="sm" onClick={onNext} disabled={busy} data-coach-next>
              {step + 1 === total ? "Play final step" : "Next step"}
              <Icon name="arrow-right" size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
