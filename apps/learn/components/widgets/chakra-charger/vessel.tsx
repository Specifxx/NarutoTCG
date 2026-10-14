"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Icon } from "@/components/ui/icon";
import type { FxPalette } from "@/lib/accents";
import { cn } from "@/lib/cn";

export type VesselMood = "charging" | "ready" | "spending" | "zero-waste" | "wasted";

export interface VesselPop {
  id: number;
  text: string;
  tone: "drain" | "gain" | "waste";
}

export interface VesselVapor {
  id: number;
  /** Chakra points evaporating. */
  amount: number;
  /** Fill fraction (0..1) when the evaporation starts. */
  from: number;
}

interface Wisp {
  id: number;
  left: number;
  top: number;
  drift: number;
  rise: number;
  size: number;
  delay: number;
  duration: number;
  spark: boolean;
}

/** Deterministic bubbles: more of them show as the gauge fills. */
const BUBBLES = [
  { left: 22, size: 5, duration: 3.1, delay: 0 },
  { left: 64, size: 4, duration: 2.7, delay: 0.5 },
  { left: 41, size: 6, duration: 3.6, delay: 1.3 },
  { left: 78, size: 3, duration: 2.4, delay: 0.9 },
  { left: 31, size: 3, duration: 2.5, delay: 1.9 },
  { left: 54, size: 5, duration: 3.3, delay: 2.4 },
  { left: 70, size: 2, duration: 2.1, delay: 0.2 },
  { left: 47, size: 2, duration: 2.3, delay: 1.6 },
  { left: 15, size: 3, duration: 2.9, delay: 2.8 },
] as const;

const POP_TONES: Record<VesselPop["tone"], string> = {
  drain: "border-chakra-300/60 bg-chakra-500/90 text-shadow-950 shadow-[0_0_18px_rgba(255,122,26,0.7)]",
  gain: "border-energy-200/60 bg-energy-400/90 text-shadow-950 shadow-[0_0_18px_rgba(56,196,255,0.7)]",
  waste: "border-blood-400/60 bg-blood-500/90 text-white shadow-[0_0_18px_rgba(239,64,96,0.7)]",
};

const MOOD_GLOW: Record<VesselMood, string> = {
  charging: "rgba(56,196,255,0.55)",
  ready: "rgba(56,196,255,0.7)",
  spending: "rgba(56,196,255,0.5)",
  "zero-waste": "rgba(74,222,128,0.6)",
  wasted: "rgba(239,64,96,0.45)",
};

/** SVG arc for ring segment `i` of `n` around (100,100). */
function arcPath(i: number, n: number, r: number, gapDeg: number) {
  const step = 360 / n;
  const rad = (d: number) => (d * Math.PI) / 180;
  const a0 = rad(-90 + i * step + gapDeg / 2);
  const a1 = rad(-90 + (i + 1) * step - gapDeg / 2);
  const p = (a: number) => `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(a0)} A ${r} ${r} 0 ${step - gapDeg > 180 ? 1 : 0} 1 ${p(a1)}`;
}

/** One period of a sine-ish wave repeated so a -50% slide loops seamlessly. */
const WAVE_PATH = "M0 10 Q25 2 50 10 T100 10 T150 10 T200 10 T250 10 T300 10 T350 10 T400 10 V20 H0 Z";

export interface ChakraVesselProps {
  /** Current Chakra (may be fractional while orbs are landing). */
  level: number;
  max: number;
  mood: VesselMood;
  /** Word under the number. */
  caption: string;
  /** Increments as each orb lands: flashes the liquid surface. */
  splash: number;
  burst: number;
  burstPalette: FxPalette;
  pop: VesselPop | null;
  vapor: VesselVapor | null;
  /** Slow drain (evaporation) instead of a sloshy spring. */
  slowDrain?: boolean;
  reduce: boolean;
}

/**
 * The big Chakra gauge: a glass sphere whose liquid rises with a wavy surface,
 * rising bubbles and a glow that intensifies as it fills, wrapped in a ring of
 * one segment per Chakra point. The forwarded ref is the sphere, so particle
 * flights can aim at it.
 */
export const ChakraVessel = forwardRef<HTMLDivElement, ChakraVesselProps>(function ChakraVessel(
  { level, max, mood, caption, splash, burst, burstPalette, pop, vapor, slowDrain, reduce },
  ref,
) {
  const fill = max > 0 ? Math.max(0, Math.min(1, level / max)) : 0;
  const shown = Math.max(0, Math.floor(level + 1e-6));
  const segments = useMemo(() => Array.from({ length: max }, (_, i) => arcPath(i, max, 92, max > 12 ? 3 : 5)), [max]);
  const bubbleCount = reduce || fill < 0.04 ? 0 : Math.max(2, Math.ceil(fill * BUBBLES.length));
  const [wisps, setWisps] = useState<Wisp[]>([]);

  // Evaporation: wisps rise out of the liquid when leftover Chakra is discarded.
  useEffect(() => {
    if (!vapor || reduce) {
      setWisps([]);
      return;
    }
    const surface = 12 + (1 - vapor.from) * 76;
    const count = Math.min(40, 8 + vapor.amount * 6);
    setWisps(
      Array.from({ length: count }, (_, i) => ({
        id: vapor.id * 1000 + i,
        left: 24 + Math.random() * 52,
        top: surface + Math.random() * Math.max(4, (86 - surface) * 0.6),
        drift: (Math.random() - 0.5) * 70,
        rise: 80 + Math.random() * 110,
        size: i % 4 === 0 ? 3 + Math.random() * 2 : 8 + Math.random() * 12,
        delay: Math.random() * 1,
        duration: 1.3 + Math.random() * 0.9,
        spark: i % 4 === 0,
      })),
    );
    const t = setTimeout(() => setWisps([]), 3000);
    return () => clearTimeout(t);
  }, [vapor, reduce]);

  const liquidTransition: Transition = reduce
    ? { duration: 0 }
    : slowDrain
      ? { duration: 1.5, ease: [0.4, 0, 0.6, 1] }
      : { type: "spring", stiffness: 110, damping: 13, mass: 0.9 };

  return (
    <div
      role="img"
      aria-label={`Chakra gauge: ${shown} of ${max}`}
      className="relative aspect-square w-[11.5rem] shrink-0 sm:w-[13.5rem] lg:w-[15rem]"
    >
      {/* Glow that intensifies with the fill. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[16%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${MOOD_GLOW[mood]} 0%, transparent 62%)` }}
        initial={false}
        animate={{ opacity: mood === "zero-waste" ? 0.8 : 0.12 + fill * 0.78, scale: 0.86 + fill * 0.22 }}
        transition={{ duration: reduce ? 0 : 0.5 }}
      />
      {mood === "ready" && !reduce && (
        <div aria-hidden="true" className="pointer-events-none absolute -inset-[6%] animate-pulse-glow rounded-full bg-energy-400/35" />
      )}

      {/* Segmented ring: one arc per Chakra point. */}
      <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
        <circle cx="100" cy="100" r="99" fill="none" stroke="rgba(56,196,255,0.14)" strokeWidth="1" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
        {segments.map((d, i) => {
          const lit = i < shown;
          const spent = !lit && mood === "spending";
          return (
            <motion.path
              key={i}
              d={d}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              initial={false}
              animate={{
                stroke: lit
                  ? "#7ddcff"
                  : spent
                    ? "rgba(255,122,26,0.4)"
                    : mood === "zero-waste"
                      ? "rgba(74,222,128,0.35)"
                      : "rgba(255,255,255,0.09)",
                opacity: lit ? 1 : 0.9,
              }}
              transition={{ duration: reduce ? 0 : 0.35 }}
              style={{ filter: lit ? "drop-shadow(0 0 4px rgba(56,196,255,0.95))" : undefined }}
            />
          );
        })}
      </svg>

      {/* Slow chakra swirl. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-[7%] rounded-full border border-dashed transition-opacity duration-700",
          mood === "zero-waste" ? "border-leaf-300/40" : "border-energy-300/35",
          !reduce && "animate-spin-slow",
        )}
        style={{ opacity: 0.25 + fill * 0.75 }}
      />

      {/* Glass sphere with the liquid inside. */}
      <div
        ref={ref}
        className={cn(
          "absolute inset-[12%] overflow-hidden rounded-full ring-1 transition-shadow duration-700",
          "bg-[radial-gradient(circle_at_50%_35%,#0c2a40_0%,#070b14_70%)] shadow-[inset_0_0_30px_rgba(0,0,0,0.85)]",
          mood === "zero-waste" ? "ring-leaf-300/50" : mood === "wasted" ? "ring-blood-400/40" : "ring-energy-300/35",
        )}
        style={{ isolation: "isolate" }}
      >
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0"
          initial={false}
          animate={{ height: `${fill > 0 ? 8 + fill * 82 : 0}%` }}
          transition={liquidTransition}
        >
          {/* Waves ride on the surface. */}
          <div
            className={cn("absolute inset-x-0 bottom-[calc(100%-2px)] h-3 transition-opacity", fill > 0.005 ? "opacity-100" : "opacity-0")}
          >
            <motion.div
              className="absolute bottom-0 left-0 h-[13px] w-[200%]"
              animate={reduce ? undefined : { x: ["-50%", "0%"] }}
              transition={reduce ? undefined : { duration: 5.2, ease: "linear", repeat: Infinity }}
            >
              <svg viewBox="0 0 400 20" preserveAspectRatio="none" className="h-full w-full">
                <path d={WAVE_PATH} fill="#38c4ff" opacity="0.55" />
              </svg>
            </motion.div>
            <motion.div
              className="absolute -bottom-px left-0 h-[10px] w-[200%]"
              animate={reduce ? undefined : { x: ["0%", "-50%"] }}
              transition={reduce ? undefined : { duration: 3, ease: "linear", repeat: Infinity }}
            >
              <svg viewBox="0 0 400 20" preserveAspectRatio="none" className="h-full w-full">
                <path d={WAVE_PATH} fill="#7ddcff" />
              </svg>
            </motion.div>
          </div>
          {/* Liquid body. */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#7ddcff_0%,#38c4ff_22%,#0ea5e9_60%,#0369a1_100%)]" />
          <div className="absolute inset-0 opacity-25 [background:repeating-radial-gradient(circle_at_30%_120%,rgba(255,255,255,0.35)_0_1px,transparent_1px_10px)]" />
          <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/35 to-transparent" />
          {!reduce && splash > 0 && (
            <motion.span
              key={splash}
              className="absolute inset-x-[10%] -top-1 h-4 rounded-full bg-white blur-md"
              initial={{ opacity: 0.85, scaleX: 0.4 }}
              animate={{ opacity: 0, scaleX: 1.2 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          )}
          {BUBBLES.slice(0, bubbleCount).map((b, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full border border-white/60 bg-white/25"
              style={{ left: `${b.left}%`, width: b.size, height: b.size }}
              initial={{ top: "100%", opacity: 0 }}
              animate={{ top: ["100%", "4%"], opacity: [0, 0.9, 0.9, 0], x: [0, 3, -3, 1] }}
              transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: "easeIn" }}
            />
          ))}
        </motion.div>

        {/* Glass highlights. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_30%_18%,rgba(255,255,255,0.28),transparent_42%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_-10px_24px_rgba(0,0,0,0.45),inset_0_2px_0_rgba(255,255,255,0.12)]"
        />

        {/* Readout, on a soft dark lens so it stays legible over the liquid. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(3,10,22,0.55)_0%,rgba(3,10,22,0.25)_45%,transparent_70%)]" />
          <AnimatePresence initial={false}>
            {mood === "zero-waste" && (
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                className="relative mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-leaf-400 text-shadow-950 shadow-[0_0_16px_rgba(74,222,128,0.8)]"
              >
                <Icon name="check" size={16} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
          <span className="relative flex items-baseline gap-1 font-black tabular-nums text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]">
            <AnimatedNumber value={shown} stiffness={260} damping={24} className="text-[42px] leading-none sm:text-[50px] lg:text-[56px]" />
            <span className="text-sm font-bold text-ash-100/90">/ {max}</span>
          </span>
          <span className="eyebrow relative mt-1 !text-[9px] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">{caption}</span>
        </div>
      </div>

      {/* Floating "-4" / "+4" / "-3 wasted" tag. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-2 z-10 flex justify-center">
        <AnimatePresence>
          {pop && (
            <motion.span
              key={pop.id}
              className={cn("rounded-full border px-2.5 py-0.5 text-[13px] font-black tabular-nums tracking-wide", POP_TONES[pop.tone])}
              initial={{ opacity: 0, y: 14, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: [14, -6, -14, -30], scale: [0.5, 1.15, 1, 0.95] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7, times: [0, 0.18, 0.7, 1], ease: "easeOut" }}
            >
              {pop.text}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Evaporating leftover Chakra. */}
      {wisps.length > 0 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-visible">
          {wisps.map((w) => (
            <motion.span
              key={w.id}
              className="absolute rounded-full"
              style={{
                left: `${w.left}%`,
                top: `${w.top}%`,
                width: w.size,
                height: w.size,
                marginLeft: -w.size / 2,
                background: w.spark
                  ? "radial-gradient(circle, #fff 0%, #cdf3ff 50%, transparent 75%)"
                  : "radial-gradient(circle, rgba(205,243,255,0.85) 0%, rgba(56,196,255,0.45) 45%, transparent 72%)",
                filter: w.spark ? undefined : "blur(1.5px)",
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
              animate={{
                x: [0, w.drift * 0.4, w.drift],
                y: [0, -w.rise * 0.5, -w.rise],
                opacity: [0, 0.95, 0],
                scale: [0.5, 1.2, w.spark ? 0.4 : 2],
              }}
              transition={{ duration: w.duration, delay: w.delay, ease: "easeOut" }}
            />
          ))}
        </div>
      )}

      <ParticleBurst fire={burst} palette={burstPalette} count={34} spread={150} shape="mixed" duration={1.1} />
    </div>
  );
});
