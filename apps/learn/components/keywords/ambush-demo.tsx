"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { GameCard } from "@/components/game/game-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import { cn } from "@/lib/cn";
import { DemoStage, type DemoSceneState, type DemoStep } from "./demo-stage";

const KAKASHI = PRACTICE_CARDS["kakashi-copy"]!;

const STEPS: readonly DemoStep[] = [
  { label: "Played hidden for 1: 0 Power, no effects", duration: 1800 },
  { label: "Reveal it: pay the printed cost of 4", duration: 1300 },
  { label: "Flipped face-up: AMBUSH fires", duration: 1400 },
  { label: "AMBUSH: POWERUP 2, Power 3 → 5", duration: 2400 },
];

const ORBS = [0, 1, 2, 3];

function AmbushScene({ step, cycle }: DemoSceneState) {
  const revealed = step >= 2;
  const tokens = step >= 3 ? 2 : 0;
  const chakra = step >= 1 ? 2 : 6;
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (step === 2) setBurst((b) => b + 1);
  }, [step, cycle]);

  return (
    <div className="absolute inset-0">
      {/* Mission lane and a slow spiral seal behind the card. */}
      <div className="absolute inset-x-4 top-1/2 h-[212px] -translate-y-1/2 rounded-2xl border border-dashed border-mist-400/20 bg-gradient-to-b from-mist-900/30 to-transparent" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-mist-400/10">
        <Emblem name="spiral" size={230} className="animate-spin-slow" />
      </span>

      {/* Chakra pool. */}
      <div className="absolute left-2.5 top-2.5 z-10 flex flex-col items-center gap-0.5 rounded-lg border border-energy-400/30 bg-energy-900/60 px-1.5 py-1 shadow-[inset_0_0_12px_rgba(14,165,233,0.25)]">
        <span className="text-[7.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-energy-300/80">Chakra</span>
        <span className="flex items-center gap-1 leading-none">
          <span className="text-energy-300 drop-shadow-[0_0_6px_rgba(56,196,255,0.9)]">
            <Emblem name="chakra" size={13} />
          </span>
          <span className="text-base font-black tabular-nums text-white">
            <AnimatedNumber value={chakra} />
          </span>
        </span>
      </div>
      <AnimatePresence>
        {step === 1 && (
          <motion.span
            key={`cost-${cycle}`}
            initial={{ opacity: 0, y: -4, scale: 1.4 }}
            animate={{ opacity: 1, y: 6, scale: 1 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className="absolute left-5 top-14 z-10 text-lg font-black text-blood-400 drop-shadow-[0_0_8px_rgba(239,64,96,0.7)]"
          >
            −4
          </motion.span>
        )}
      </AnimatePresence>

      {/* Chakra orbs flying from the pool into the hidden card. */}
      <AnimatePresence>
        {step === 1 &&
          ORBS.map((i) => (
            <motion.span
              key={`orb-${cycle}-${i}`}
              className="absolute z-20 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-energy-200 to-energy-500 shadow-[0_0_12px_3px_rgba(56,196,255,0.75)]"
              initial={{ left: "11%", top: "10%", opacity: 0, scale: 0.5 }}
              animate={{
                left: ["11%", `${28 + i * 3}%`, "50%"],
                top: ["10%", `${2 + i * 2}%`, "50%"],
                opacity: [0, 1, 0.9],
                scale: [0.5, 1.1, 0.5],
              }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.62, delay: 0.1 + i * 0.11, ease: [0.4, 0, 0.2, 1] }}
            />
          ))}
      </AnimatePresence>

      {/* The card. A fresh hidden copy deals in each loop. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={cycle}
              initial={{ opacity: 0, scale: 0.86, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <GameCard
                card={KAKASHI}
                size="md"
                faceDown={!revealed}
                powerTokens={tokens}
                highlight={revealed ? "mist" : undefined}
                power={revealed ? undefined : 0}
              />
            </motion.div>
          </AnimatePresence>
          <ParticleBurst fire={burst} palette="mist" count={30} spread={150} shape="mixed" duration={1} />
        </div>
      </div>

      {/* Card state readout. */}
      <div className="absolute bottom-3 left-3 z-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={revealed ? (tokens ? "boosted" : "up") : "hidden"}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex flex-col rounded-lg border px-2 py-1 text-[10px] font-bold leading-tight",
              revealed ? "border-leaf-400/30 bg-leaf-500/10 text-leaf-300" : "border-mist-400/30 bg-mist-900/50 text-mist-200",
            )}
          >
            <span className="text-[8px] font-extrabold uppercase tracking-[0.18em] opacity-80">{revealed ? "Face-up" : "Hidden"}</span>
            <span className="text-[13px] font-black tabular-nums text-white">Power {revealed ? 3 + tokens : 0}</span>
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Effect callout. */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            key={`fx-${cycle}`}
            initial={{ opacity: 0, x: 14, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-end gap-1"
          >
            <span className="rounded bg-mist-500 px-1.5 py-px text-[9.5px] font-black tracking-wide text-white">AMBUSH</span>
            <span className="flex items-center gap-1 rounded-md border border-gold-400/40 bg-gold-400/15 px-1.5 py-1 text-[11px] font-black text-gold-200">
              POWERUP 2
            </span>
            <span className="flex gap-1">
              {[0, 1].map((i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 500, damping: 16 }}
                  className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-gold-200 to-gold-500 shadow-[0_0_8px_rgba(245,197,66,0.8)] ring-1 ring-shadow-950"
                />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The "AMBUSH!" slash across the stage on reveal. */}
      <AnimatePresence>
        {step === 2 && (
          <motion.div
            key={`slash-${cycle}`}
            className="pointer-events-none absolute inset-x-[-12%] top-1/2 z-30 -translate-y-1/2"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            <div className="-rotate-[11deg]">
              <motion.div
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 0.32, ease: [0.2, 0.9, 0.2, 1] }}
                className="relative flex h-14 items-center justify-center bg-gradient-to-r from-transparent via-mist-600/90 to-transparent"
              >
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-mist-200 to-transparent" />
                <motion.span
                  initial={{ letterSpacing: "0.6em", opacity: 0 }}
                  animate={{ letterSpacing: "0.22em", opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="text-3xl font-black italic text-white drop-shadow-[0_0_14px_rgba(167,139,250,1)]"
                >
                  AMBUSH!
                </motion.span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Looping demo: a hidden Kakashi is revealed, AMBUSH fires and adds 2 Power tokens. */
export function AmbushDemo() {
  return (
    <DemoStage
      title="AMBUSH"
      steps={STEPS}
      staticStep={3}
      accent="mist"
      description="Animation: Kakashi Hatake sits face-down as a hidden character with 0 Power. You pay his printed cost of 4 Chakra to reveal him, the card flips face-up, and his AMBUSH effect fires: POWERUP 2, raising his Power from 3 to 5."
    >
      {(state) => <AmbushScene {...state} />}
    </DemoStage>
  );
}
