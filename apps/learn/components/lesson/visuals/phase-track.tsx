"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import type { Accent, Phase, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { EmblemName } from "@/lib/game/types";
import { useMotionOK } from "./shared";

export const PHASE_META: ReadonlyArray<{
  id: Phase;
  label: string;
  hint: string;
  emblem: EmblemName;
  details: [string, string, string];
}> = [
  {
    id: "start",
    label: "Start",
    hint: "New mission, gain Chakra, draw 2",
    emblem: "chakra",
    details: ["Reveal the next mission; this Round sets its rank", "Gain 5 + 1 per character + CHAKRA +X", "Each player draws 2 cards"],
  },
  {
    id: "action",
    label: "Action",
    hint: "Alternate: one card or pass",
    emblem: "shuriken",
    details: ["The Edge holder takes the first turn", "Play face-up, hidden, reveal or upgrade, or pass", "The first player to pass takes the Edge"],
  },
  {
    id: "mission",
    label: "Mission",
    hint: "Score D → A, most Power wins",
    emblem: "target",
    details: ["Every mission in play resolves, D first", "Most Power wins; a tie goes to the Edge holder", "Winner gains base + rank points and fires SCORE"],
  },
  {
    id: "end",
    label: "End",
    hint: "Discard Chakra and Power tokens",
    emblem: "seal",
    details: ["Leftover Chakra is discarded", "Every Power token is removed", "After Round 4, most Mission points wins"],
  },
];

/** Start → Action → Mission → End, with the active phase glowing and an energy pulse on the track. */
export function PhaseTrackVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "phase-track" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const motionOK = useMotionOK();
  const activeIndex = Math.max(
    0,
    PHASE_META.findIndex((p) => p.id === visual.active),
  );
  const active = PHASE_META[activeIndex]!;

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 px-4 pb-4 sm:gap-5 sm:px-6 sm:pb-6" aria-hidden="true">
      <div className="relative">
        {/* Track line (desktop): progress fill up to the active node + a travelling pulse. */}
        <div className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-[3px] -translate-y-1/2 rounded-full bg-white/[0.07] sm:block">
          <motion.div
            className={cn("absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r", a.gradient)}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: activeIndex / 3 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          />
          {motionOK && (
            <motion.span
              className="absolute top-1/2 h-[7px] w-16 -translate-y-1/2 rounded-full blur-[1.5px]"
              style={{ background: `linear-gradient(90deg, transparent, ${a.hex[0]}, ${a.hex[1]}, transparent)` }}
              initial={{ left: "-10%", opacity: 0 }}
              animate={{ left: ["-10%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
            />
          )}
        </div>

        <ol className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-2">
          {PHASE_META.map((p, i) => {
            const isActive = i === activeIndex;
            const done = i < activeIndex;
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, type: "spring", stiffness: 320, damping: 24 }}
                className={cn(
                  "relative flex flex-col items-center rounded-2xl px-2 py-2.5 text-center transition-colors sm:bg-transparent sm:p-0",
                  isActive ? cn("border sm:border-0", a.border, a.softBg) : "border border-white/5 bg-white/[0.02] sm:border-0",
                )}
              >
                <div className="relative flex h-14 w-14 items-center justify-center">
                  {isActive && (
                    <span
                      className="absolute -inset-3 animate-pulse-glow rounded-full"
                      style={{ background: `radial-gradient(circle, ${a.hex[1]}88, transparent 70%)` }}
                    />
                  )}
                  <motion.span
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-full ring-2 sm:h-14 sm:w-14",
                      isActive
                        ? cn("bg-gradient-to-br text-shadow-950 ring-white/40", a.gradient)
                        : done
                          ? cn("bg-shadow-800 ring-white/15", a.text)
                          : "bg-shadow-800 text-ash-500 ring-white/10",
                    )}
                    animate={isActive && motionOK ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                    transition={isActive && motionOK ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  >
                    <Emblem name={p.emblem} size={24} />
                    <span
                      className={cn(
                        "absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ring-2 ring-shadow-900",
                        isActive ? "bg-white text-shadow-950" : "bg-shadow-700 text-ash-300",
                      )}
                    >
                      {i + 1}
                    </span>
                  </motion.span>
                </div>
                <span className={cn("mt-2 text-[13px] font-black tracking-wide", isActive ? "text-white" : "text-ash-300")}>
                  {p.label}
                </span>
                <span className={cn("mt-0.5 max-w-[16ch] text-[11px] leading-snug", isActive ? "text-ash-200" : "hidden text-ash-500 sm:block")}>
                  {p.hint}
                </span>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 18 }}
                    className={cn("eyebrow absolute -top-2 right-1 rounded-full px-1.5 py-0.5 !text-[8.5px] sm:-top-3 sm:right-auto", a.solidBg)}
                  >
                    Now
                  </motion.span>
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>

      {/* What happens in the active phase. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className={cn("relative overflow-hidden rounded-2xl border bg-black/25 p-3 sm:p-4", a.border)}
        >
          <span className={cn("pointer-events-none absolute -right-4 -top-5 opacity-[0.07]", a.text)}>
            <Emblem name={active.emblem} size={96} />
          </span>
          <p className={cn("eyebrow mb-2", a.text)}>{active.label} phase</p>
          <ul className="relative flex flex-col gap-1.5">
            {active.details.map((d, i) => (
              <motion.li
                key={d}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-2 text-[12.5px] leading-snug text-ash-200"
              >
                <span className={cn("mt-[3px] shrink-0", a.text)}>
                  <Icon name="chevron-right" size={12} strokeWidth={3} />
                </span>
                {d}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>

      <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ash-500">
        <Icon name="rotate" size={13} />
        Repeat every Round · exactly 4 Rounds
      </p>
    </div>
  );
}
