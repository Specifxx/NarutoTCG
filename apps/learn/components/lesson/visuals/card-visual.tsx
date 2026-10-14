"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { GameCard, TRIGGER_STYLES } from "@/components/game/game-card";
import { Icon } from "@/components/ui/icon";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { cardById, selfPowerup, useMotionOK, useTimeline } from "./shared";

const MIST_HEX = "#8b5cf6";
const TOKEN_FIRST_MS = 900;
const TOKEN_GAP_MS = 380;
const TOKEN_FALL_MS = 450;

function Pill({ tone, children }: { tone: "energy" | "mist" | "gold" | "leaf" | "ash" | "blood"; children: ReactNode }) {
  const tones = {
    energy: "border-energy-400/40 bg-energy-500/15 text-energy-200",
    mist: "border-mist-400/40 bg-mist-500/15 text-mist-200",
    gold: "border-gold-400/40 bg-gold-400/15 text-gold-200",
    leaf: "border-leaf-400/40 bg-leaf-500/15 text-leaf-300",
    ash: "border-white/10 bg-white/5 text-ash-200",
    blood: "border-blood-400/40 bg-blood-500/15 text-chakra-200",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

/** A large practice card: face-up, hidden, or looping a hidden → revealed AMBUSH flip. */
export function CardVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "card" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const card = cardById(visual.cardId);
  const face = visual.face ?? "up";
  const tokens = visual.tokens ?? 0;
  const motionOK = useMotionOK();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.3 });

  const landed = useTimeline(Array.from({ length: tokens }, (_, i) => TOKEN_FIRST_MS + i * TOKEN_GAP_MS));

  // Flip mode: auto-loops until the learner takes over with the button.
  const [revealed, setRevealed] = useState(false);
  const [manual, setManual] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (face !== "flip" || manual || !motionOK || !inView) return;
    const t = setTimeout(() => setRevealed((r) => !r), revealed ? 3400 : 1900);
    return () => clearTimeout(t);
  }, [face, manual, motionOK, inView, revealed]);

  useEffect(() => {
    if (face === "flip" && revealed) setBurst((b) => b + 1);
  }, [face, revealed]);

  if (!card) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 pb-6 text-sm text-ash-400">Unknown practice card “{visual.cardId}”.</div>
    );
  }

  const hasAmbush = card.effects.some((e) => e.trigger === "AMBUSH");
  const faceDown = face === "hidden" || (face === "flip" && !revealed);
  const revealTokens = selfPowerup(card, ["MAIN", "AMBUSH"]);
  const shownTokens = landed + (face === "flip" && revealed ? revealTokens : 0);
  const power = faceDown ? shownTokens : card.power + shownTokens;
  const glowHex = faceDown ? MIST_HEX : a.hex[1];
  const stateKey = face === "flip" ? (revealed ? "revealed" : "hidden") : face;
  const fired = card.effects.filter((e) => e.trigger === "MAIN" || e.trigger === "AMBUSH");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-4 pb-4">
      <div ref={stageRef} aria-hidden="true" className="flex flex-col items-center gap-3">
        <div
          className={cn("relative", face === "flip" && "cursor-pointer")}
          onClick={
            face === "flip"
              ? () => {
                  setManual(true);
                  setRevealed((r) => !r);
                }
              : undefined
          }
        >
          {/* Halo + slow conic ring */}
          <motion.div
            className="pointer-events-none absolute -inset-12 rounded-full blur-2xl"
            style={{ background: `radial-gradient(circle, ${MIST_HEX}66 0%, transparent 65%)` }}
            initial={false}
            animate={{ opacity: faceDown ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          />
          <motion.div
            className="pointer-events-none absolute -inset-12 rounded-full blur-2xl"
            style={{ background: `radial-gradient(circle, ${a.hex[1]}66 0%, transparent 65%)` }}
            initial={false}
            animate={{ opacity: faceDown ? 0 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <div
            className="pointer-events-none absolute -inset-3 animate-spin-slow rounded-[28px] opacity-50 blur-md"
            style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${glowHex} 60deg, transparent 140deg, transparent 220deg, ${glowHex} 280deg, transparent 360deg)` }}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, rotateX: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.1 }}
            className="relative"
          >
            <GameCard card={card} size="lg" faceDown={faceDown} powerTokens={shownTokens} />
          </motion.div>

          {/* Gold token chips dropping onto the card */}
          {motionOK &&
            Array.from({ length: tokens }, (_, i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute -right-2 bottom-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 to-gold-500 text-[10px] font-black text-shadow-950 ring-2 ring-shadow-950 shadow-[0_0_14px_rgba(245,197,66,0.9)]"
                initial={{ y: -260, x: -40, opacity: 0, rotate: -90, scale: 1.2 }}
                animate={{ y: [-260, 0], x: [-40, 0], opacity: [0, 1, 1, 0], rotate: [-90, 0], scale: [1.2, 1, 1, 0.6] }}
                transition={{
                  duration: TOKEN_FALL_MS / 1000,
                  delay: (TOKEN_FIRST_MS + i * TOKEN_GAP_MS - TOKEN_FALL_MS) / 1000,
                  ease: "easeIn",
                  opacity: { duration: TOKEN_FALL_MS / 1000 + 0.2, times: [0, 0.2, 0.8, 1], delay: (TOKEN_FIRST_MS + i * TOKEN_GAP_MS - TOKEN_FALL_MS) / 1000 },
                }}
              >
                +1
              </motion.span>
            ))}

          {/* AMBUSH stamp on reveal */}
          <AnimatePresence>
            {face === "flip" && revealed && hasAmbush && (
              <motion.span
                key="stamp"
                className="eyebrow pointer-events-none absolute left-1/2 top-[38%] z-30 -ml-[58px] w-[116px] rounded-lg border-2 border-white/70 bg-gradient-to-br from-mist-400 to-mist-600 py-1.5 text-center !text-[13px] !tracking-[0.2em] text-white shadow-[0_0_30px_rgba(139,92,246,0.9)]"
                initial={{ opacity: 0, scale: 2.2, rotate: -18 }}
                animate={{ opacity: 1, scale: 1, rotate: -9 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.25 }}
              >
                Ambush!
              </motion.span>
            )}
          </AnimatePresence>
          <ParticleBurst fire={burst} palette="mist" count={30} spread={150} shape="mixed" />
        </div>

        {/* Status line */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stateKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex max-w-full flex-wrap items-center justify-center gap-1.5"
          >
            {faceDown ? (
              <>
                <Pill tone="mist">
                  <Icon name="eye-off" size={11} /> Hidden · paid 1 Chakra
                </Pill>
                <Pill tone={power > 0 ? "gold" : "ash"}>
                  Power {power}
                  {shownTokens > 0 ? " (tokens)" : ""}
                </Pill>
                <Pill tone="ash">Effects off</Pill>
              </>
            ) : face === "flip" ? (
              <>
                <Pill tone="energy">
                  <Icon name="eye" size={11} /> Revealed · paid {card.cost} Chakra
                </Pill>
                {fired.map((e, i) => (
                  <span key={i} className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", TRIGGER_STYLES[e.trigger].className)}>
                    {TRIGGER_STYLES[e.trigger].label} fires
                  </span>
                ))}
                <Pill tone="leaf">Power {power}</Pill>
              </>
            ) : (
              <>
                <Pill tone="energy">Face-up · paid {card.cost} Chakra</Pill>
                <Pill tone={shownTokens > 0 ? "leaf" : "ash"}>Power {power}</Pill>
                {card.chakraBonus ? <Pill tone="gold">+{1 + card.chakraBonus} Chakra each Round</Pill> : null}
                {hasAmbush && <Pill tone="blood">AMBUSH skipped: played from hand</Pill>}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {face === "flip" && (
        <>
          <button
            type="button"
            onClick={() => {
              setManual(true);
              setRevealed((r) => !r);
            }}
            aria-pressed={revealed}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mist-300",
              revealed
                ? "border-white/10 bg-white/5 text-ash-200 hover:bg-white/10"
                : "border-mist-400/50 bg-mist-500/20 text-mist-200 hover:bg-mist-500/30",
            )}
          >
            <Icon name={revealed ? "eye-off" : "eye"} size={14} />
            {revealed ? "Hide it again" : `Reveal for ${card.cost} Chakra`}
          </button>
          <span className="sr-only" aria-live="polite">
            {manual
              ? revealed
                ? `${card.name} revealed for ${card.cost} Chakra. ${hasAmbush ? "MAIN and AMBUSH effects fire." : "MAIN effects fire."} Power ${power}.`
                : `${card.name} is hidden again: 0 Power, effects off.`
              : ""}
          </span>
        </>
      )}
    </div>
  );
}
