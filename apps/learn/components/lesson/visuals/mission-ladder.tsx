"use client";

import { motion } from "framer-motion";
import { useId, useRef } from "react";
import { RankBadge, RANK_STYLES } from "@/components/game/mission-card";
import { Icon } from "@/components/ui/icon";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { RANK_BONUS, RANK_ORDER } from "@/lib/game/types";
import { useLoopIndex, useMotionOK } from "./shared";

const ORDINALS = ["1st", "2nd", "3rd", "4th"] as const;

/** D/C/B/A ladder: the Round each rank enters, its bonus, and the D → A evaluation order. */
export function MissionLadderVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "mission-ladder" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const uid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const motionOK = useMotionOK();
  // 0..3 sweep D → A, then one beat of rest.
  const loop = useLoopIndex(ref, RANK_ORDER.length + 1, 900);
  const scan = motionOK ? loop : -1;
  // A at the top of the ladder, D at the bottom.
  const rungs = RANK_ORDER.map((rank, order) => ({ rank, order })).reverse();

  return (
    <div ref={ref} className="flex flex-1 flex-col justify-center gap-3 px-4 pb-5 sm:px-6" aria-hidden="true">
      <div className="relative">
        {/* Order rail behind the ordinal markers */}
        <div className="absolute bottom-7 left-[15px] top-7 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-t from-leaf-400/70 via-mist-400/60 to-gold-300/80" />
        <span className="absolute -top-1 left-[15px] -translate-x-1/2 -translate-y-1/2 text-gold-300">
          <span className="block -rotate-90">
            <Icon name="arrow-right" size={14} strokeWidth={2.6} />
          </span>
        </span>

        <ol className="relative flex flex-col gap-2">
          {rungs.map(({ rank, order }, row) => {
            const isHighlight = visual.highlight === rank;
            const isScan = scan === order;
            const bonus = RANK_BONUS[rank];
            return (
              <motion.li
                key={rank}
                className="flex items-center gap-2.5"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + (rungs.length - 1 - row) * 0.09, type: "spring", stiffness: 320, damping: 26 }}
              >
                <span
                  className={cn(
                    "relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-shadow-800 text-[9.5px] font-black ring-2 transition-all duration-300",
                    isScan ? "scale-110 bg-white text-shadow-950 ring-white/60 shadow-[0_0_16px_rgba(255,255,255,0.6)]" : "text-ash-300 ring-white/10",
                  )}
                >
                  {ORDINALS[order]}
                </span>
                <div
                  className={cn(
                    "relative flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-shadow sm:gap-3 sm:px-3",
                    isHighlight ? cn(a.border, a.glow, "bg-white/[0.04]") : "border-white/[0.06] bg-black/20",
                  )}
                >
                  {isScan && (
                    <motion.span
                      layoutId={`ladder-scan-${uid}`}
                      className="absolute inset-0 rounded-xl bg-white/[0.06] ring-1 ring-white/15"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <motion.span
                    className="relative"
                    animate={isHighlight && motionOK ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                    transition={isHighlight && motionOK ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  >
                    <RankBadge rank={rank} size={34} />
                  </motion.span>
                  <div className="relative min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-[13px] font-black leading-tight text-white">
                      {rank}-rank
                      {isHighlight && (
                        <span className={cn("eyebrow rounded-full px-1.5 py-px !text-[8px] !tracking-[0.16em]", a.solidBg)}>This mission</span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-ash-400">Enters in Round {order + 1}</p>
                  </div>
                  <span className="relative hidden items-center gap-1 sm:flex">
                    {Array.from({ length: 4 }, (_, i) => (
                      <motion.span
                        key={i}
                        className={cn(
                          "h-3 w-2 origin-bottom rounded-[3px]",
                          i < bonus ? "bg-gradient-to-t from-gold-500 to-gold-200 shadow-[0_0_6px_rgba(245,197,66,0.7)]" : "border border-white/10",
                        )}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.4 + order * 0.08 + i * 0.05, type: "spring", stiffness: 400, damping: 20 }}
                      />
                    ))}
                  </span>
                  <span className={cn("relative w-9 text-right text-[19px] font-black tabular-nums", RANK_STYLES[rank].text)}>+{bonus}</span>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>

      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[11px] font-semibold text-ash-400">
        <span className="text-ash-200">Scored D → C → B → A</span>
        <span className="text-ash-500">·</span>
        <span>
          Winner gains printed base <span className="text-gold-300">+ rank bonus</span>
        </span>
      </p>
    </div>
  );
}
