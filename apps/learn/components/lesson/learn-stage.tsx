"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { StepVisual } from "@/components/lesson/step-visual";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { TutorialLesson } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { plainText } from "@/lib/rich-text";
import { StepCard, VisualFallback } from "./step-card";

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 56 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.25 } },
  },
  exit: (dir: number) => ({ opacity: 0, x: dir * -56, transition: { duration: 0.16, ease: "easeIn" } }),
};

/** Keys typed into these elements never move the step player. */
const LOCAL_KEYS = "input, textarea, select, [role='tablist'], [role='slider'], [role='listbox'], [role='menu'], [role='tooltip']";

/** Combined offset of the sticky site header and the stage tabs. */
const STICKY_OFFSET = 184;

/**
 * Step player: segmented progress, a direction-aware slide between steps
 * (text card beside the animated StepVisual), Prev/Next with ← → keys, and a
 * Finish button that hands off to Train.
 */
export function LearnStage({
  lesson,
  index,
  maxSeen,
  learned,
  onGo,
  onFinish,
}: {
  lesson: TutorialLesson;
  index: number;
  /** Furthest step reached this visit. */
  maxSeen: number;
  /** Learn star already earned: every segment shows as visited. */
  learned: boolean;
  onGo: (to: number) => void;
  onFinish: () => void;
}) {
  const reduce = useReducedMotion();
  const a = ACCENT_STYLES[lesson.accent];
  const steps = lesson.steps;
  const total = steps.length;
  const safeIndex = Math.min(Math.max(index, 0), total - 1);
  const step = steps[safeIndex]!;
  const isLast = safeIndex === total - 1;
  const [dir, setDir] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= total || to === safeIndex) return;
      setDir(to > safeIndex ? 1 : -1);
      onGo(to);
      // If the learner has scrolled past the top of the step, bring the new one into view.
      const el = topRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top;
        if (top < STICKY_OFFSET - 40) {
          window.scrollTo({ top: window.scrollY + top - STICKY_OFFSET, behavior: reduce ? "auto" : "smooth" });
        }
      }
    },
    [safeIndex, total, onGo, reduce],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest(LOCAL_KEYS))) return;
      const to = e.key === "ArrowRight" ? safeIndex + 1 : safeIndex - 1;
      if (to < 0 || to >= total) return;
      e.preventDefault();
      go(to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, safeIndex, total]);

  return (
    <div>
      <div ref={topRef} className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-ash-400">
            Step <span className={a.text}>{safeIndex + 1}</span> of {total}
          </p>
          <p className="hidden items-center gap-1.5 text-[11px] font-medium text-ash-500 sm:flex">
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] text-ash-300">←</kbd>
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] text-ash-300">→</kbd>
            to move between steps
          </p>
        </div>
        <ol className="flex gap-1 sm:gap-1.5" aria-label="Lesson steps">
          {steps.map((s, i) => {
            const current = i === safeIndex;
            const visited = learned || i <= maxSeen;
            const label = plainText(s.title);
            return (
              <li key={s.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Step ${i + 1}: ${label}${visited && !current ? " (visited)" : ""}`}
                  aria-current={current ? "step" : undefined}
                  title={label}
                  className="group flex h-6 w-full items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span
                    className={cn(
                      "relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08] transition-all group-hover:bg-white/15",
                      current && "h-2",
                    )}
                    style={current ? { boxShadow: `0 0 14px -2px ${a.hex[1]}` } : undefined}
                  >
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full"
                      style={{ background: `linear-gradient(90deg, ${a.hex[2]}, ${a.hex[1]})` }}
                      initial={false}
                      animate={{ scaleX: visited || current ? 1 : 0, opacity: current ? 1 : visited ? 0.5 : 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 26 }}
                    />
                    {current && (
                      <span className="absolute inset-0 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] bg-[length:200%_100%]" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Step {safeIndex + 1} of {total}: {plainText(step.title)}
      </p>

      <div className="relative -mx-4 mt-5 overflow-x-clip px-4 sm:-mx-6 sm:px-6">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step.id}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-7"
          >
            <StepCard step={step} index={safeIndex} total={total} accent={lesson.accent} />
            <div className="order-first min-w-0 lg:sticky lg:top-[184px] lg:order-none lg:self-start">
              {step.visual ? (
                <StepVisual visual={step.visual} accent={lesson.accent} />
              ) : (
                <VisualFallback emblem={lesson.emblem} accent={lesson.accent} index={safeIndex} />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-3 z-20 mt-6 sm:bottom-5">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-shadow-950/85 p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          <Button variant="secondary" onClick={() => go(safeIndex - 1)} disabled={safeIndex === 0} aria-label="Previous step">
            <Icon name="chevron-left" size={16} />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <div className="flex min-w-0 flex-1 flex-col items-center px-1 text-center">
            <span className="text-sm font-black tabular-nums text-white">
              {safeIndex + 1}
              <span className="font-bold text-ash-500"> / {total}</span>
            </span>
            <span className="hidden max-w-full truncate text-[11px] text-ash-500 sm:block">{plainText(step.title)}</span>
          </div>
          {isLast ? (
            <Button variant="gold" onClick={onFinish}>
              <Icon name={learned ? "arrow-right" : "sparkles"} size={16} />
              {learned ? "Go to Train" : "Finish lesson"}
            </Button>
          ) : (
            <Button onClick={() => go(safeIndex + 1)}>
              Next
              <Icon name="chevron-right" size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
