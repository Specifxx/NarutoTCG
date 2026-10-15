"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { cn } from "@/lib/cn";
import { DemoStage, type DemoSceneState, type DemoStep } from "./demo-stage";

const STEPS: readonly DemoStep[] = [
  { label: "Start: 7 Chakra (5 + 2 in play)", duration: 1600 },
  { label: "Play Rock Lee face-up: exhaust 3", duration: 1500 },
  { label: "Play a card hidden: exhaust 1", duration: 1400 },
  { label: "End phase: 3 unspent Chakra discarded", duration: 1700 },
  { label: "Nothing carries over to the next Round", duration: 1300 },
];

const ORB_COUNT = 7;
const POOL_X = [10, 20.5, 31, 41.5];
const TRAY_X = [58.5, 69, 79.5, 90];
const ROW_Y = [56, 76];
/** The order orbs are spent in, by orb index. */
const SPEND_ORDER = [6, 5, 4, 3];
const SPENT_BY_STEP = [0, 3, 4, 4, 4];
const CHAKRA_BY_STEP = [7, 4, 3, 0, 0];
const TRAY_BY_STEP = [0, 3, 4, 4, 0];

type OrbState = "pool" | "spent" | "discarded" | "gone";

function orbAt(i: number, step: number): { state: OrbState; x: number; y: number; order: number } {
  const order = SPEND_ORDER.indexOf(i);
  const spent = order !== -1 && order < (SPENT_BY_STEP[step] ?? 0);
  if (spent) {
    return { state: step >= 4 ? "gone" : "spent", x: TRAY_X[order % 4]!, y: ROW_Y[Math.floor(order / 4)]!, order };
  }
  const row = i < 4 ? 0 : 1;
  const col = i < 4 ? i : i - 4;
  return { state: step >= 3 ? "discarded" : "pool", x: POOL_X[col]!, y: ROW_Y[row]!, order: i };
}

const STAMPS: Array<{ text: string; tone: "energy" | "blood" } | null> = [
  { text: "+7 Chakra", tone: "energy" },
  { text: "EXHAUST 3", tone: "blood" },
  { text: "EXHAUST 1", tone: "blood" },
  { text: "DISCARD 3", tone: "blood" },
  null,
];

function ExhaustScene({ step, cycle }: DemoSceneState) {
  const [refill, setRefill] = useState(0);
  useEffect(() => {
    if (step === 0 && cycle > 0) setRefill((r) => r + 1);
  }, [step, cycle]);

  const stamp = STAMPS[step] ?? null;
  const tray = TRAY_BY_STEP[step] ?? 0;

  return (
    <div className="absolute inset-0">
      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-dashed border-blood-400/60 bg-blood-500/15 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-blood-400">
        Not an official keyword
      </span>

      <AnimatePresence mode="wait" initial={false}>
        {stamp && (
          <motion.span
            key={`${cycle}-${step}`}
            initial={{ opacity: 0, scale: 1.6, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className={cn(
              "absolute left-1/2 top-[34px] z-20 -ml-12 w-24 rounded-md border-2 py-0.5 text-center text-[11px] font-black tracking-wider",
              stamp.tone === "energy"
                ? "border-energy-300/70 bg-energy-900/60 text-energy-200 shadow-[0_0_16px_-2px_rgba(56,196,255,0.7)]"
                : "border-blood-400/70 bg-blood-600/30 text-chakra-200 shadow-[0_0_16px_-2px_rgba(239,64,96,0.7)]",
            )}
          >
            {stamp.text}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Your Chakra. */}
      <div className="absolute bottom-3 left-3 right-[calc(50%+5px)] top-[60px] rounded-xl border border-energy-400/30 bg-energy-900/25 shadow-[inset_0_0_24px_rgba(14,165,233,0.18)]">
        <div className="flex items-center gap-1.5 px-2.5 pt-2">
          <span className="text-energy-300">
            <Emblem name="chakra" size={13} />
          </span>
          <span className="text-[8.5px] font-extrabold uppercase tracking-[0.18em] text-energy-300/90">Chakra</span>
          <span className="ml-auto text-base font-black leading-none tabular-nums text-white">
            <AnimatedNumber value={CHAKRA_BY_STEP[step] ?? 0} />
          </span>
        </div>
        <span className="absolute inset-0">
          <ParticleBurst fire={refill} palette="energy" count={20} spread={70} shape="orb" ring={false} />
        </span>
      </div>

      {/* Exhausted tray. */}
      <div className="absolute bottom-3 left-[calc(50%+5px)] right-3 top-[60px] rounded-xl border border-dashed border-white/15 bg-black/25">
        <div className="flex items-center gap-1.5 px-2.5 pt-2">
          <span className="text-[8.5px] font-extrabold uppercase tracking-[0.18em] text-ash-400">Exhausted</span>
          <span className="ml-auto text-base font-black leading-none tabular-nums text-ash-300">
            <AnimatedNumber value={tray} />
          </span>
        </div>
      </div>

      {/* Chakra orbs. A fresh set fills the pool every loop. */}
      <AnimatePresence initial={false}>
        {Array.from({ length: ORB_COUNT }, (_, i) => {
          const orb = orbAt(i, step);
          const lit = orb.state === "pool";
          const visible = orb.state === "pool" || orb.state === "spent";
          return (
            <motion.span
              key={`${cycle}-${i}`}
              className="absolute z-10 -ml-2.5 -mt-2.5 h-5 w-5"
              initial={{ left: `${orb.x}%`, top: `${orb.y}%`, opacity: 0, scale: 0 }}
              animate={{
                left: `${orb.x}%`,
                top: `${orb.state === "discarded" ? orb.y - 10 : orb.y}%`,
                opacity: visible ? 1 : 0,
                scale: orb.state === "spent" ? 0.8 : visible ? 1 : 0.35,
              }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 17,
                delay: orb.state === "spent" ? (orb.order % 4) * 0.12 : orb.state === "pool" ? i * 0.05 : (i % 4) * 0.08,
              }}
            >
              <span className="absolute inset-0 rounded-full border border-ash-400/50 bg-shadow-700" />
              <motion.span
                className="absolute inset-0 rounded-full bg-gradient-to-br from-energy-200 via-energy-400 to-energy-600 shadow-[0_0_12px_2px_rgba(56,196,255,0.75)]"
                initial={false}
                animate={{ opacity: lit ? 1 : 0 }}
                transition={{ duration: 0.35 }}
              />
              <motion.span
                className="absolute inset-0 rounded-full bg-blood-400 shadow-[0_0_10px_rgba(239,64,96,0.8)]"
                initial={false}
                animate={{ opacity: orb.state === "discarded" ? 0.9 : 0 }}
                transition={{ duration: 0.25 }}
              />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Looping demo of this platform's EXHAUST shorthand: Chakra drains as it's spent, and leftovers are discarded. */
export function ExhaustDemo() {
  return (
    <DemoStage
      title="EXHAUST"
      steps={STEPS}
      staticStep={2}
      accent="blood"
      description="Animation of this site's EXHAUST shorthand, which is not an official keyword: you start the Round with 7 Chakra, spend 3 to play Rock Lee and 1 to play a card hidden, and those orbs move to an exhausted tray. In the End phase the 3 unspent Chakra are discarded, so nothing carries over."
    >
      {(state) => <ExhaustScene {...state} />}
    </DemoStage>
  );
}
