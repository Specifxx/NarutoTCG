"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { EdgeToken } from "@/components/game/edge-token";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/game/types";
import { SIDE_STYLES, useTimeline } from "./shared";

const POWERS: ReadonlyArray<{ icon: IconName; text: string }> = [
  { icon: "play", text: "Takes the first turn" },
  { icon: "swords", text: "Wins tied missions" },
  { icon: "trophy", text: "Wins a tied game" },
];

function PlayerPlate({ side, holds, settled, layoutId }: { side: Side; holds: boolean; settled: boolean; layoutId: string }) {
  const s = SIDE_STYLES[side];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: side === "you" ? 0.08 : 0.16 }}
      className={cn(
        "relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-3 pb-3 pt-4 transition-[border-color,box-shadow] duration-500",
        holds ? "border-gold-400/60 bg-gold-400/[0.07] shadow-[0_0_40px_-8px_rgba(245,197,66,0.6)]" : "border-white/[0.07] bg-black/20",
      )}
    >
      {/* Spotlight from above on the holder */}
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-28 rounded-t-2xl transition-opacity duration-700",
          holds ? "opacity-100" : "opacity-0",
        )}
        style={{ background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(245,197,66,0.3), transparent 75%)" }}
      />
      <span className={cn("relative flex h-10 w-10 items-center justify-center rounded-full ring-2", s.softBg, s.text, holds ? "ring-gold-300/70" : "ring-white/10")}>
        <Emblem name="kage" size={22} />
      </span>
      <span className={cn("eyebrow relative !text-[10px]", s.text)}>{s.label}</span>
      <span className="relative flex h-[60px] items-center justify-center">
        {holds ? (
          <span className={cn("block", settled && "animate-float")}>
            <EdgeToken size={52} layoutId={layoutId} />
          </span>
        ) : (
          <span className="h-[52px] w-[52px] rounded-full border border-dashed border-white/10" />
        )}
      </span>
      <span className={cn("relative text-[11px] font-bold", holds ? "text-gold-300" : "text-ash-500")}>
        {holds ? "Holds the Edge" : "No Edge"}
      </span>
    </motion.div>
  );
}

/** Two player plates; the Edge token flies from the centre to its holder. */
export function EdgeTokenVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "edge-token" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const uid = useId();
  const layoutId = `edge-visual-${uid}`;
  const step = useTimeline([700, 1350]);
  const at: Side | "centre" = step >= 1 ? visual.holder : "centre";
  const settled = step >= 2;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-4 pb-5 sm:gap-4 sm:px-6" aria-hidden="true">
      {/* Starting point above the plates */}
      <div className="relative flex h-[60px] items-center justify-center">
        <span
          className={cn(
            "absolute h-[60px] w-[60px] rounded-full border border-dashed transition-opacity duration-500",
            a.border,
            at === "centre" ? "opacity-100" : "opacity-30",
          )}
        />
        {at === "centre" && <EdgeToken size={52} layoutId={layoutId} />}
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-5">
        <PlayerPlate side="you" holds={at === "you"} settled={settled} layoutId={layoutId} />
        <PlayerPlate side="opp" holds={at === "opp"} settled={settled} layoutId={layoutId} />
      </div>

      <ul className="flex max-w-md flex-wrap items-center justify-center gap-1.5">
        {POWERS.map((p, i) => (
          <motion.li
            key={p.text}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={settled ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.9 }}
            transition={{ delay: settled ? i * 0.1 : 0, type: "spring", stiffness: 400, damping: 24 }}
            className="flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-2.5 py-1 text-[11px] font-bold text-gold-200"
          >
            <Icon name={p.icon} size={12} />
            {p.text}
          </motion.li>
        ))}
      </ul>

      {visual.caption && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="max-w-md text-balance text-center text-[12.5px] font-semibold leading-snug text-ash-200"
        >
          {visual.caption}
        </motion.p>
      )}
    </div>
  );
}
