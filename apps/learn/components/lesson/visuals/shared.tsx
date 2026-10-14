"use client";

import { useInView, useReducedMotion } from "framer-motion";
import { useEffect, useState, type RefObject } from "react";
import type { IconName } from "@/components/ui/icon";
import type { TurnAction } from "@/content/schema";
import type { FxPalette } from "@/lib/accents";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import type { CardDef, EffectTrigger, Side } from "@/lib/game/types";

/**
 * True once mounted on the client and the user hasn't asked for reduced
 * motion. Gate looping or particle-heavy effects on it: it is `false` during
 * SSR and hydration, so server and client markup always match.
 */
export function useMotionOK(): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !reduce;
}

/**
 * Plays a one-shot timeline on mount. Returns how many cues (ms after mount)
 * have passed. With reduced motion it jumps straight to the end state.
 */
export function useTimeline(cues: readonly number[]): number {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const signature = cues.join(",");
  useEffect(() => {
    const times = signature ? signature.split(",").map(Number) : [];
    if (reduce) {
      setStep(times.length);
      return;
    }
    setStep(0);
    const timers = times.map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [reduce, signature]);
  return step;
}

/**
 * Cycles 0..length-1 every `periodMs` while the element is on screen. Holds at
 * 0 for reduced motion or when `enabled` is false.
 */
export function useLoopIndex(ref: RefObject<Element | null>, length: number, periodMs: number, enabled = true): number {
  const motionOK = useMotionOK();
  const inView = useInView(ref, { amount: 0.25 });
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!motionOK || !inView || !enabled || length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % length), periodMs);
    return () => clearInterval(t);
  }, [motionOK, inView, enabled, length, periodMs]);
  return index;
}

/** Looks up a practice card; undefined if the id is unknown. */
export function cardById(id: string): CardDef | undefined {
  return PRACTICE_CARDS[id];
}

/** Total Power tokens a card puts on itself when the given triggers fire. */
export function selfPowerup(card: CardDef, triggers: readonly EffectTrigger[]): number {
  return card.effects.reduce(
    (sum, e) => (triggers.includes(e.trigger) && e.spec.kind === "powerup" && e.spec.target === "self" ? sum + e.spec.amount : sum),
    0,
  );
}

export interface SideStyle {
  label: string;
  short: string;
  text: string;
  softBg: string;
  border: string;
  solid: string;
  bar: string;
  glow: string;
  palette: FxPalette;
}

/** You are cool blue, the opponent is red; every use also carries a text label. */
export const SIDE_STYLES: Record<Side, SideStyle> = {
  you: {
    label: "You",
    short: "You",
    text: "text-energy-300",
    softBg: "bg-energy-500/10",
    border: "border-energy-400/40",
    solid: "bg-gradient-to-br from-energy-300 to-energy-600 text-shadow-950",
    bar: "from-energy-600 via-energy-400 to-energy-200",
    glow: "shadow-[0_0_36px_-6px_rgba(56,196,255,0.75)]",
    palette: "energy",
  },
  opp: {
    label: "Opponent",
    short: "Opp",
    text: "text-blood-400",
    softBg: "bg-blood-500/10",
    border: "border-blood-400/40",
    solid: "bg-gradient-to-br from-chakra-300 to-blood-500 text-white",
    bar: "from-blood-400 via-blood-500 to-blood-600",
    glow: "shadow-[0_0_36px_-6px_rgba(239,64,96,0.75)]",
    palette: "blood",
  },
};

export const TURN_ACTION_META: Record<TurnAction, { label: string; verb: string; icon: IconName }> = {
  play: { label: "Play", verb: "plays a card face-up", icon: "hand" },
  hidden: { label: "Hidden", verb: "plays a card hidden", icon: "eye-off" },
  reveal: { label: "Reveal", verb: "reveals a hidden card", icon: "eye" },
  upgrade: { label: "Upgrade", verb: "upgrades a character", icon: "layers" },
  pass: { label: "Pass", verb: "passes", icon: "flag" },
};

/** Who wins a mission clash under the official rules (needs ≥ 1 Power; ties → Edge). */
export function clashWinner(you: number, opp: number, edge: Side): { winner: Side | null; byEdge: boolean } {
  if (you > opp) return { winner: you >= 1 ? "you" : null, byEdge: false };
  if (opp > you) return { winner: opp >= 1 ? "opp" : null, byEdge: false };
  return you >= 1 ? { winner: edge, byEdge: true } : { winner: null, byEdge: false };
}
