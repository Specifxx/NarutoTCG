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

const LEE = PRACTICE_CARDS["rock-lee"]!;

const STEPS: readonly DemoStep[] = [
  { label: "Rock Lee: printed Power 4", duration: 1300 },
  { label: "An effect resolves: POWERUP 3", duration: 1000 },
  { label: "Token 1 lands: Power 5", duration: 800 },
  { label: "Token 2 lands: Power 6", duration: 800 },
  { label: "Token 3 lands: Power 7", duration: 1800 },
  { label: "End phase: every Power token is removed", duration: 1800 },
];

const TOKEN_COUNT = 3;

function Coin({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 text-[9px] font-black text-shadow-950 ring-2 ring-shadow-950 shadow-[0_0_14px_rgba(245,197,66,0.9)]",
        className,
      )}
    >
      +1
    </span>
  );
}

function PowerupScene({ step, cycle }: DemoSceneState) {
  /** Tokens that should be on the card once this step's token has landed. */
  const target = step >= 2 && step <= 4 ? step - 1 : 0;
  const [landed, setLanded] = useState(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    setLanded(step >= 2 && step <= 4 ? step - 2 : 0);
  }, [step, cycle]);

  const power = LEE.power + landed;
  const ending = step === 5;

  return (
    <div className="absolute inset-0">
      <span className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/15 blur-3xl" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gold-300/[0.07]">
        <Emblem name="shuriken" size={240} className="animate-spin-slow" />
      </span>

      {/* Effect callout. */}
      <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2">
        <AnimatePresence mode="wait" initial={false}>
          {step >= 1 && !ending ? (
            <motion.div
              key="effect"
              initial={{ opacity: 0, x: -12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ type: "spring", stiffness: 340, damping: 22 }}
              className="flex flex-col items-start gap-1"
            >
              <span className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-gold-300/80">Effect</span>
              <span className="rounded-md border border-gold-400/50 bg-gold-400/15 px-1.5 py-1 text-[11px] font-black text-gold-200 shadow-[0_0_14px_-2px_rgba(245,197,66,0.6)]">
                POWERUP 3
              </span>
              <span className="flex gap-0.5">
                {Array.from({ length: TOKEN_COUNT }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all duration-300",
                      i < landed ? "scale-75 border border-gold-400/40" : "bg-gradient-to-br from-gold-200 to-gold-500 shadow-[0_0_6px_rgba(245,197,66,0.8)]",
                    )}
                  />
                ))}
              </span>
            </motion.div>
          ) : ending ? (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 1.3, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: -6 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="rounded-md border-2 border-blood-400/70 px-1.5 py-1 text-center text-[9.5px] font-black uppercase leading-tight tracking-wider text-blood-400"
            >
              End
              <br />
              phase
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* The card, with tokens dropping onto its corner. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <GameCard card={LEE} size="md" powerTokens={landed} highlight={landed > 0 ? "gold" : undefined} />
          <span className="pointer-events-none absolute -bottom-2 -right-2 z-20 h-6 w-6">
            <ParticleBurst fire={burst} palette="gold" count={14} spread={48} shape="star" duration={0.7} ring={false} />
            <AnimatePresence>
              {landed < target && (
                <motion.span
                  key={`drop-${cycle}-${step}`}
                  className="absolute inset-0"
                  initial={{ y: -230, opacity: 0, rotate: -40 }}
                  animate={{ y: [-230, 0, -12, 0], opacity: [0, 1, 1, 1], rotate: [-40, 0, 0, 0] }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.55, times: [0, 0.68, 0.84, 1], ease: "easeIn" }}
                  onAnimationComplete={() => {
                    setLanded(target);
                    setBurst((b) => b + 1);
                  }}
                >
                  <Coin />
                </motion.span>
              )}
            </AnimatePresence>
            {/* Tokens lifting off in the End phase. */}
            <AnimatePresence>
              {ending &&
                Array.from({ length: TOKEN_COUNT }, (_, i) => (
                  <motion.span
                    key={`lift-${cycle}-${i}`}
                    className="absolute inset-0"
                    initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                    animate={{ y: -90 - i * 18, x: (i - 1) * 22, opacity: 0, scale: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, delay: i * 0.12, ease: "easeOut" }}
                  >
                    <Coin />
                  </motion.span>
                ))}
            </AnimatePresence>
          </span>
        </div>
      </div>

      {/* Power readout. */}
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-end">
        <span className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-ash-400">Power</span>
        <span
          className={cn(
            "text-4xl font-black leading-none tabular-nums transition-colors duration-300",
            landed > 0 ? "text-leaf-300 drop-shadow-[0_0_12px_rgba(74,222,128,0.6)]" : "text-white",
          )}
        >
          <AnimatedNumber value={power} />
        </span>
        <span className="mt-1 text-[9.5px] font-semibold text-ash-500">printed {LEE.power}</span>
        <AnimatePresence>
          {landed > 0 && (
            <motion.span
              key={landed}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-0.5 text-[10px] font-black text-gold-300"
            >
              +{landed} token{landed === 1 ? "" : "s"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Looping demo: POWERUP 3 drops three Power tokens on Rock Lee, then the End phase clears them. */
export function PowerupDemo() {
  return (
    <DemoStage
      title="POWERUP"
      steps={STEPS}
      staticStep={4}
      accent="gold"
      description="Animation: Rock Lee has a printed Power of 4. A POWERUP 3 effect drops three Power tokens onto him one at a time, raising his Power to 5, 6 and then 7. In the End phase all Power tokens are removed and he is back to 4."
    >
      {(state) => <PowerupScene {...state} />}
    </DemoStage>
  );
}
