"use client";

import { motion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { CardDef } from "@/lib/game/types";
import type { PathResult } from "./scenarios";

export type PlayPath = "hidden" | "faceup";

function Row({
  title,
  icon,
  cost,
  result,
  why,
  taken,
  accent,
}: {
  title: string;
  icon: IconName;
  cost: string;
  result: PathResult;
  why: string;
  taken: boolean;
  accent: "mist" | "energy";
}) {
  const win = result.outcome.winner === "you";
  return (
    <motion.li
      layout
      className={cn(
        "relative rounded-2xl border p-3 transition-colors duration-300",
        taken
          ? win
            ? "border-leaf-400/50 bg-leaf-500/[0.08] shadow-[0_0_28px_-10px_rgba(74,222,128,0.8)]"
            : "border-blood-400/50 bg-blood-500/[0.08] shadow-[0_0_28px_-10px_rgba(239,64,96,0.8)]"
          : "border-white/[0.07] bg-white/[0.025]",
      )}
    >
      {taken && (
        <span className="eyebrow absolute -top-2 right-3 rounded-full border border-white/15 bg-shadow-800 px-2 py-0.5 !text-[8.5px] text-ash-200">
          Your line
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-[13px] font-bold leading-tight",
            accent === "mist" ? "text-mist-200" : "text-energy-200",
          )}
        >
          <Icon name={icon} size={15} className="shrink-0" />
          {title}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[12px] font-black",
            win ? "bg-leaf-500/15 text-leaf-300" : "bg-blood-500/15 text-blood-400",
          )}
        >
          <Icon name={win ? "check" : "x"} size={12} strokeWidth={3} />
          {win ? "Win" : "Lose"} {result.power.you}–{result.power.opp}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] font-bold">
        <span className="inline-flex items-center gap-1 rounded-lg border border-energy-400/30 bg-energy-500/10 px-2 py-1 text-energy-200">
          <span className="h-2 w-2 rounded-full bg-energy-400 shadow-[0_0_6px_rgba(56,196,255,0.9)]" aria-hidden="true" />
          {cost} Chakra
        </span>
        <Icon name="arrow-right" size={14} className="text-ash-500" />
        <span className="inline-flex items-center gap-1 rounded-lg border border-chakra-400/30 bg-chakra-500/10 px-2 py-1 text-chakra-200">
          {result.power.you} Power
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-ash-400">{why}</p>
    </motion.li>
  );
}

/** Side-by-side maths of the two ways to play the same card. */
export function PathCompare({
  hero,
  faceUp,
  ambush,
  faceUpWhy,
  ambushWhy,
  taken,
}: {
  hero: CardDef;
  faceUp: PathResult;
  ambush: PathResult;
  faceUpWhy: string;
  ambushWhy: string;
  taken: PlayPath | null;
}) {
  return (
    <div>
      <p className="eyebrow text-ash-400">Two ways to play {hero.name.split(" ")[0]}</p>
      <ul className="mt-3 space-y-2.5">
        <Row
          title="Face-up from hand"
          icon="hand"
          cost={`${faceUp.chakraSpent}`}
          result={faceUp}
          why={faceUpWhy}
          taken={taken === "faceup"}
          accent="energy"
        />
        <Row
          title="Hidden, then revealed"
          icon="eye-off"
          cost={`1 + ${ambush.chakraSpent - 1} = ${ambush.chakraSpent}`}
          result={ambush}
          why={ambushWhy}
          taken={taken === "hidden"}
          accent="mist"
        />
      </ul>
    </div>
  );
}
