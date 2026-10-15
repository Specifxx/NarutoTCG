"use client";

import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { EdgeToken } from "@/components/game/edge-token";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/game/types";
import { clashWinner, SIDE_STYLES, useTimeline } from "./shared";

// Cues: count-up + tug, verdict (or "tied!"), Edge lifts to the centre, Edge decides.
const CUES = [450, 1750, 2350, 3100] as const;

function Plate({
  side,
  power,
  counting,
  isWinner,
  isLoser,
  edgeHere,
  edgeLayoutId,
  burst,
}: {
  side: Side;
  power: number;
  counting: boolean;
  isWinner: boolean;
  isLoser: boolean;
  edgeHere: boolean;
  edgeLayoutId: string;
  burst: number;
}) {
  const s = SIDE_STYLES[side];
  return (
    <motion.div
      className={cn(
        "relative flex min-w-0 flex-col items-center rounded-2xl border px-2 pb-2.5 pt-3 transition-shadow duration-500",
        s.border,
        s.softBg,
        isWinner && s.glow,
      )}
      initial={{ opacity: 0, x: side === "you" ? -24 : 24 }}
      animate={{ opacity: isLoser ? 0.55 : 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: isLoser ? 0 : 0.1 }}
    >
      <span className={cn("eyebrow !text-[10px]", s.text)}>{s.label}</span>
      <span className="mt-1 text-[38px] font-black leading-none tabular-nums text-white sm:text-[44px]">
        <AnimatedNumber value={counting ? power : 0} stiffness={120} damping={20} />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ash-500">Power</span>
      <span className="mt-1.5 flex h-8 items-center justify-center gap-1.5">
        {edgeHere && (
          <>
            <EdgeToken size={28} layoutId={edgeLayoutId} />
            <span className="text-[10px] font-bold text-gold-300">Edge</span>
          </>
        )}
      </span>
      <AnimatePresence>
        {isWinner && (
          <motion.span
            className={cn("eyebrow absolute -top-2.5 left-1/2 -ml-[26px] w-[52px] rounded-full py-0.5 text-center !text-[9.5px]", s.solid)}
            initial={{ opacity: 0, y: 8, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            Wins
          </motion.span>
        )}
      </AnimatePresence>
      <ParticleBurst fire={burst} palette={s.palette} count={24} spread={100} shape="mixed" />
    </motion.div>
  );
}

/** Tug-of-war over one mission: Power totals, the bar settles, and on a tie the Edge token decides. */
export function PowerClashVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "power-clash" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const { you, opp, edge, label } = visual;
  const uid = useId();
  const edgeLayoutId = `clash-edge-${uid}`;
  const reduce = useReducedMotion();
  const step = useTimeline(CUES);
  const { winner, byEdge } = clashWinner(you, opp, edge);
  const tie = you === opp;
  const target = you + opp === 0 ? 50 : Math.min(90, Math.max(10, (you / (you + opp)) * 100));

  // One motion value drives both fills and the knot, so they never drift apart.
  const knot = useMotionValue(50);
  const leftWidth = useTransform(knot, (v) => `${v}%`);
  const rightWidth = useTransform(knot, (v) => `${100 - v}%`);
  const started = step >= 1;
  useEffect(() => {
    if (!started) {
      knot.set(50);
      return;
    }
    if (reduce) {
      knot.set(target);
      return;
    }
    const w = 9;
    const controls = animate(knot, [50, 50 + w, 50 - w * 0.7, 50 + w * 0.4, target], { duration: 1.25, ease: "easeInOut" });
    return () => controls.stop();
  }, [started, reduce, target, knot]);

  const verdictShown = tie && winner ? step >= 4 : step >= 2;
  const edgeAtCentre = tie && winner !== null && step === 3;
  const [bursts, setBursts] = useState({ you: 0, opp: 0 });
  useEffect(() => {
    if (verdictShown && winner) setBursts((b) => ({ ...b, [winner]: b[winner] + 1 }));
  }, [verdictShown, winner]);

  const winnerLabel = winner === "you" ? "You win the mission" : winner === "opp" ? "Opponent wins the mission" : "";
  const edgeHolder = edge === "you" ? "You" : "Opponent";

  return (
    <div className="flex flex-1 flex-col justify-center gap-3.5 px-4 pb-5 sm:gap-4 sm:px-6" aria-hidden="true">
      {label && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-center text-[13px] font-black text-white"
        >
          <span className={a.text}>
            <Emblem name="target" size={16} />
          </span>
          {label}
        </motion.p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <Plate
          side="you"
          power={you}
          counting={step >= 1}
          isWinner={verdictShown && winner === "you"}
          isLoser={verdictShown && winner === "opp"}
          edgeHere={edge === "you" && !edgeAtCentre}
          edgeLayoutId={edgeLayoutId}
          burst={bursts.you}
        />
        <div className="flex h-12 w-12 items-center justify-center">
          {edgeAtCentre ? (
            <EdgeToken size={44} layoutId={edgeLayoutId} />
          ) : (
            <span className="text-[13px] font-black italic tracking-widest text-ash-500">VS</span>
          )}
        </div>
        <Plate
          side="opp"
          power={opp}
          counting={step >= 1}
          isWinner={verdictShown && winner === "opp"}
          isLoser={verdictShown && winner === "you"}
          edgeHere={edge === "opp" && !edgeAtCentre}
          edgeLayoutId={edgeLayoutId}
          burst={bursts.opp}
        />
      </div>

      {/* Tug-of-war bar */}
      <div className="px-1">
        <div className="relative">
          <div className="relative h-3.5 overflow-hidden rounded-full bg-shadow-800 ring-1 ring-white/10">
            <motion.div className={cn("absolute inset-y-0 left-0 bg-gradient-to-r", SIDE_STYLES.you.bar)} style={{ width: leftWidth }} />
            <motion.div className={cn("absolute inset-y-0 right-0 bg-gradient-to-l", SIDE_STYLES.opp.bar)} style={{ width: rightWidth }} />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.25),transparent_60%)]" />
          </div>
          <motion.span
            className={cn(
              "absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-shadow-950 transition-colors duration-300",
              step >= 2 && tie ? "bg-gold-300 shadow-[0_0_18px_rgba(245,197,66,0.9)]" : "bg-white shadow-[0_0_14px_rgba(255,255,255,0.7)]",
            )}
            style={{ left: leftWidth }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className={SIDE_STYLES.you.text}>You</span>
          <span className="text-ash-500">Power share</span>
          <span className={SIDE_STYLES.opp.text}>Opp</span>
        </div>
      </div>

      {/* Verdict */}
      <div className="flex min-h-[46px] items-center justify-center">
        <AnimatePresence mode="wait">
          {step < 2 ? (
            <motion.span key="wait" className="text-[12px] font-semibold text-ash-500" exit={{ opacity: 0 }}>
              Comparing total Power…
            </motion.span>
          ) : verdictShown ? (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              className="flex flex-col items-center text-center"
            >
              {winner ? (
                <>
                  <span className={cn("flex items-center gap-1.5 text-[15px] font-black", SIDE_STYLES[winner].text)}>
                    <Icon name="trophy" size={16} />
                    {winnerLabel}
                  </span>
                  <span className="text-[11.5px] text-ash-400">
                    {byEdge
                      ? `Tied at ${you}: the Edge holder (${edgeHolder}) wins.`
                      : winner !== edge
                        ? `${you} vs ${opp}. The Edge only breaks ties.`
                        : `${you} vs ${opp}: more Power wins.`}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-[15px] font-black text-ash-200">
                    <Icon name="x" size={16} />
                    Nobody wins
                  </span>
                  <span className="text-[11.5px] text-ash-400">You need at least 1 Power to win, even with the Edge.</span>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tie"
              initial={{ opacity: 0, scale: 1.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="flex flex-col items-center text-center"
            >
              <span className="text-[15px] font-black text-gold-300">Tied at {you}!</span>
              <span className="text-[11.5px] text-ash-400">The Edge token decides…</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
