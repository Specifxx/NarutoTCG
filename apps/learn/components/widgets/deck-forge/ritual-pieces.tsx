"use client";

import { motion } from "framer-motion";
import { Emblem } from "@/components/ui/emblem";
import { PRACTICE_MISSIONS, type PracticeMissionId } from "@/lib/game/cards";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/game/types";

export const OWNER_STYLE: Record<
  Side,
  { label: string; text: string; border: string; back: string; solid: string; emblem: "leaf" | "cloud" }
> = {
  you: {
    label: "You",
    text: "text-energy-300",
    border: "border-energy-400/40",
    back: "from-energy-500/60 via-shadow-800 to-energy-900",
    solid: "from-energy-300 to-energy-600",
    emblem: "leaf",
  },
  opp: {
    label: "Rival",
    text: "text-blood-400",
    border: "border-blood-400/40",
    back: "from-blood-500/55 via-shadow-800 to-blood-600/50",
    solid: "from-chakra-300 to-blood-500",
    emblem: "cloud",
  },
};

/** A small Mission card that flips face-down and can fly between seat and Mission deck (layoutId). */
export function MissionTile({
  id,
  owner,
  faceDown,
  layoutId,
  aside,
  glow,
}: {
  id: PracticeMissionId;
  owner: Side;
  faceDown: boolean;
  layoutId?: string;
  /** Set aside, unused for this game. */
  aside?: boolean;
  glow?: boolean;
}) {
  const def = PRACTICE_MISSIONS[id];
  const o = OWNER_STYLE[owner];
  return (
    <motion.div
      layoutId={layoutId}
      layout
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      animate={{ rotate: aside ? 8 : 0, opacity: aside ? 0.55 : 1 }}
      className="perspective-1000 relative h-[52px] w-[72px] shrink-0 sm:h-[60px] sm:w-[96px]"
      role="img"
      aria-label={
        faceDown
          ? `${owner === "you" ? "Your" : "Rival's"} Mission, face-down${aside ? ", set aside and unused" : ""}`
          : `${def.name}, base ${def.basePoints} points`
      }
    >
      <motion.div
        className={cn(
          "preserve-3d relative h-full w-full rounded-lg",
          glow && "shadow-[0_0_20px_-2px_rgba(245,197,66,0.7)]",
        )}
        initial={false}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 170, damping: 20 }}
      >
        {/* Front */}
        <div className="backface-hidden absolute inset-0 rounded-lg bg-gradient-to-br from-gold-200 via-gold-500 to-chakra-600 p-[1.5px]">
          <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[7px] bg-gradient-to-br from-shadow-800 to-shadow-900 px-1.5 py-1">
            <span className="line-clamp-2 text-[9.5px] font-bold leading-tight text-white sm:text-[10.5px]">
              {def.name}
            </span>
            <span className="flex items-center justify-between text-[8.5px] font-semibold text-ash-400 sm:text-[9.5px]">
              <span>Base {def.basePoints}</span>
              <Emblem name="scroll" size={11} className="text-gold-300/70" />
            </span>
          </div>
        </div>
        {/* Back */}
        <div
          className={cn(
            "backface-hidden absolute inset-0 rounded-lg border bg-gradient-to-br [transform:rotateY(180deg)]",
            o.border,
            o.back,
          )}
        >
          <div className="absolute inset-0 rounded-lg opacity-40 [background:repeating-linear-gradient(135deg,rgba(255,255,255,0.12)_0_2px,transparent_2px_8px)]" />
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-0.5">
            <Emblem name="scroll" size={18} className="text-white/80" />
            <span className={cn("text-[8px] font-black uppercase tracking-widest", o.text)}>{o.label}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** One face of the flipping Edge coin. */
function CoinFace({ side, back }: { side: Side; back?: boolean }) {
  const o = OWNER_STYLE[side];
  return (
    <div
      className={cn(
        "backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 text-shadow-950 ring-2 ring-gold-200/70 shadow-[0_0_36px_rgba(245,197,66,0.6)]",
        back && "[transform:rotateY(180deg)]",
      )}
    >
      <span className="absolute inset-[5px] rounded-full border border-shadow-950/25" />
      <Emblem name="edge" size={34} />
      <span
        className={cn(
          "mt-0.5 rounded-full bg-gradient-to-br px-2 text-[9px] font-black uppercase tracking-widest text-shadow-950",
          o.solid,
        )}
      >
        {o.label}
      </span>
    </div>
  );
}

/**
 * The Edge token tossed like a coin: it spins on its vertical axis and lands
 * showing the side that leads. `turns` is the final rotation in degrees.
 */
export function FlipCoin({ turns, flipping }: { turns: number; flipping: boolean }) {
  return (
    <div className="perspective-1000 relative h-[92px] w-[92px]">
      <motion.div
        className="preserve-3d relative h-full w-full"
        initial={false}
        animate={{ rotateY: turns, y: flipping ? [0, -80, -90, 0] : 0, scale: flipping ? [1, 1.15, 1.15, 1] : 1 }}
        transition={{ duration: flipping ? 1.4 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <CoinFace side="you" />
        <CoinFace side="opp" back />
      </motion.div>
      <motion.span
        aria-hidden="true"
        className="absolute -bottom-3 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-black/50 blur-[3px]"
        animate={{ scaleX: flipping ? [1, 0.5, 0.5, 1] : 1, opacity: flipping ? [0.6, 0.25, 0.25, 0.6] : 0.6 }}
        transition={{ duration: flipping ? 1.4 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
