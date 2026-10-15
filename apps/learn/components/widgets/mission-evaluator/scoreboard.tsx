"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RefObject } from "react";
import { EdgeToken } from "@/components/game/edge-token";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/game/types";

export interface Gain {
  id: number;
  amount: number;
}

function ScoreSide({
  side,
  value,
  edgeHere,
  edgeLayoutId,
  gain,
  anchor,
}: {
  side: Side;
  value: number;
  edgeHere: boolean;
  edgeLayoutId: string;
  gain: Gain | null;
  anchor: RefObject<HTMLDivElement | null>;
}) {
  const you = side === "you";
  return (
    <div className={cn("flex min-w-0 items-center gap-2 sm:gap-3", !you && "flex-row-reverse")}>
      <div ref={anchor} className={cn("relative flex flex-col", you ? "items-start" : "items-end")}>
        <span className={cn("eyebrow !text-[9.5px]", you ? "text-energy-300" : "text-blood-400")}>{you ? "You" : "Opponent"}</span>
        <span className="text-[26px] font-black leading-none tabular-nums text-white sm:text-[30px]">
          <AnimatedNumber value={value} />
        </span>
        <span className="sr-only">Mission points</span>
        <AnimatePresence>
          {gain && (
            <motion.span
              key={gain.id}
              aria-hidden="true"
              initial={{ opacity: 0, y: 4, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1, 0], y: -22, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn(
                "pointer-events-none absolute top-0 text-sm font-black text-gold-200 drop-shadow-[0_0_8px_rgba(245,197,66,0.8)]",
                you ? "left-full ml-1" : "right-full mr-1",
              )}
            >
              +{gain.amount}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        {edgeHere && <EdgeToken size={28} layoutId={edgeLayoutId} />}
      </span>
    </div>
  );
}

/** Sticky Mission-point scoreboard with the Edge token parked beside its holder. */
export function Scoreboard({
  score,
  edge,
  edgeAway,
  edgeLayoutId,
  youAnchor,
  oppAnchor,
  gains,
  status,
  className,
}: {
  score: Record<Side, number>;
  edge: Side;
  /** The Edge token is out on a mission deciding a tie. */
  edgeAway: boolean;
  edgeLayoutId: string;
  youAnchor: RefObject<HTMLDivElement | null>;
  oppAnchor: RefObject<HTMLDivElement | null>;
  gains: Record<Side, Gain | null>;
  status: string;
  className?: string;
}) {
  // Must be a direct child of the tall widget panel: sticky only sticks within its parent.
  // Sits just below the sticky lesson header + stage tabs (~160px phones, 184px desktop).
  return (
    <div className={cn("sticky top-[164px] z-20 sm:top-[184px]", className)}>
      <div className="relative flex items-center justify-between gap-2 overflow-visible rounded-2xl border border-white/10 bg-shadow-900/90 px-3 py-2.5 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur-md sm:px-4">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-energy-500/[0.12] to-transparent" />
          <span className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-blood-500/[0.12] to-transparent" />
        </span>
        <ScoreSide
          side="you"
          value={score.you}
          edgeHere={edge === "you" && !edgeAway}
          edgeLayoutId={edgeLayoutId}
          gain={gains.you}
          anchor={youAnchor}
        />
        <div className="relative min-w-0 flex-1 px-1 text-center">
          <p className="eyebrow !text-[9px] text-gold-300 sm:!text-[10px]">
            <span className="hidden sm:inline">Round 4 · </span>Mission points
          </p>
          <p className="mt-0.5 hidden truncate text-[12px] text-ash-400 sm:block">{status}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-ash-500 sm:hidden">
            Edge: {edge === "you" ? "you" : "opp"}
          </p>
        </div>
        <ScoreSide
          side="opp"
          value={score.opp}
          edgeHere={edge === "opp" && !edgeAway}
          edgeLayoutId={edgeLayoutId}
          gain={gains.opp}
          anchor={oppAnchor}
        />
      </div>
    </div>
  );
}
