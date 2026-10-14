"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export interface DemoStep {
  label: string;
  /** How long the step holds while looping, in ms. */
  duration: number;
}

export type DemoAccent = "mist" | "gold" | "blood";

export interface DemoSceneState {
  step: number;
  /** Increments every time the loop wraps, so scenes can re-key fresh props. */
  cycle: number;
  playing: boolean;
}

const ACCENT: Record<DemoAccent, { bg: string; dot: string; ring: string; text: string }> = {
  mist: {
    bg: "bg-[radial-gradient(120%_90%_at_50%_0%,rgba(139,92,246,0.28),transparent_60%),radial-gradient(80%_60%_at_50%_110%,rgba(46,16,101,0.6),transparent_70%)]",
    dot: "bg-mist-300",
    ring: "focus-visible:ring-mist-300",
    text: "text-mist-200",
  },
  gold: {
    bg: "bg-[radial-gradient(120%_90%_at_50%_0%,rgba(245,197,66,0.22),transparent_60%),radial-gradient(80%_60%_at_50%_110%,rgba(161,98,7,0.4),transparent_70%)]",
    dot: "bg-gold-300",
    ring: "focus-visible:ring-gold-300",
    text: "text-gold-200",
  },
  blood: {
    bg: "bg-[radial-gradient(120%_90%_at_50%_0%,rgba(56,196,255,0.18),transparent_60%),radial-gradient(80%_60%_at_50%_110%,rgba(143,15,32,0.55),transparent_70%)]",
    dot: "bg-chakra-300",
    ring: "focus-visible:ring-chakra-300",
    text: "text-chakra-200",
  },
};

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true" focusable="false">
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * A looping, captioned mini-animation. Loops only while on screen, starts
 * paused for reduced motion (showing `staticStep`), and can be paused or
 * stepped through with the dots.
 */
export function DemoStage({
  title,
  steps,
  staticStep,
  accent,
  description,
  children,
  className,
}: {
  title: string;
  steps: readonly DemoStep[];
  staticStep: number;
  accent: DemoAccent;
  /** Screen-reader summary of the whole animation. */
  description: string;
  children: (state: DemoSceneState) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const a = ACCENT[accent];

  useEffect(() => setMounted(true), []);

  // Reduced motion: hold on the most telling frame instead of looping.
  useEffect(() => {
    if (mounted && reduce && choice === null) setStep(staticStep);
  }, [mounted, reduce, choice, staticStep]);

  const wantsPlay = choice ?? (mounted && !reduce);
  const playing = wantsPlay && inView;

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      const next = (step + 1) % steps.length;
      setStep(next);
      if (next === 0) setCycle((c) => c + 1);
    }, steps[step]?.duration ?? 1500);
    return () => window.clearTimeout(t);
  }, [playing, step, steps]);

  const current = steps[step];

  return (
    <div ref={ref} className={cn("relative h-72 overflow-hidden border-b border-white/[0.06] bg-shadow-950/60", a.bg, className)}>
      {/* Faint grid for depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <p className="sr-only">{description}</p>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-16 top-0">
        {children({ step, cycle, playing })}
      </div>

      <button
        type="button"
        onClick={() => setChoice(!wantsPlay)}
        aria-label={`${wantsPlay ? "Pause" : "Play"} the ${title} animation`}
        className={cn(
          "absolute right-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition hover:border-white/30 hover:bg-black/60 focus:outline-none focus-visible:ring-2",
          a.ring,
        )}
      >
        {wantsPlay ? <PauseGlyph /> : <Icon name="play" size={14} />}
      </button>

      <div className="absolute inset-x-0 bottom-0 z-30 flex min-h-16 items-center gap-3 border-t border-white/[0.06] bg-black/45 px-4 backdrop-blur-sm">
        <div className="relative min-w-0 flex-1 overflow-hidden" aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="line-clamp-2 py-2 text-[12.5px] font-semibold leading-snug text-ash-100"
            >
              <span className={cn("mr-1.5 font-black tabular-nums", a.text)}>{step + 1}</span>
              {current?.label}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={`${title} animation steps`}>
          {steps.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setChoice(false);
                setStep(i);
              }}
              aria-label={`Step ${i + 1} of ${steps.length}: ${s.label}`}
              aria-current={i === step ? "step" : undefined}
              className={cn("group/dot flex h-7 w-5 items-center justify-center rounded focus:outline-none focus-visible:ring-2", a.ring)}
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === step ? cn("w-4", a.dot) : "w-1.5 bg-white/25 group-hover/dot:bg-white/50",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
