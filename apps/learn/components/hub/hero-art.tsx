"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { EdgeToken } from "@/components/game/edge-token";
import { GameCard } from "@/components/game/game-card";
import { Emblem } from "@/components/ui/emblem";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { CardDef } from "@/lib/game/types";
import { useCalmMotion } from "./primitives";
import type { HubLesson } from "./types";

const BASE_CHAKRA = 5;
const SEAL_TEXT = "NARUTO MYTHOS TCG • THE WAY OF THE KAGE • CHAKRA • MISSIONS • EDGE • ";

/** Deterministic glow orbs (no randomness during render). */
const ORBS = [
  { left: "12%", top: "30%", size: 10, color: "#ffa95c", delay: "-1s", dur: "7s" },
  { left: "86%", top: "56%", size: 8, color: "#a78bfa", delay: "-3s", dur: "6s" },
  { left: "22%", top: "12%", size: 6, color: "#7ddcff", delay: "-2s", dur: "8s" },
  { left: "64%", top: "92%", size: 7, color: "#fcd96a", delay: "-5s", dur: "6.5s" },
  { left: "48%", top: "4%", size: 5, color: "#ffd8b0", delay: "-4s", dur: "9s" },
  { left: "4%", top: "74%", size: 6, color: "#a78bfa", delay: "-1.5s", dur: "7.5s" },
  { left: "94%", top: "24%", size: 5, color: "#ff7a1a", delay: "-2.5s", dur: "8.5s" },
] as const;

/** Sparks rising off the core (deterministic offsets). */
const SPARKS = [
  { x: -18, delay: 0, dur: 2.6 },
  { x: 14, delay: 0.7, dur: 2.2 },
  { x: -6, delay: 1.3, dur: 2.9 },
  { x: 22, delay: 1.9, dur: 2.4 },
  { x: -26, delay: 2.4, dur: 2.7 },
  { x: 4, delay: 3.1, dur: 2.3 },
] as const;

function Parallax({
  x,
  y,
  depth,
  className,
  children,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth: number;
  className?: string;
  children: ReactNode;
}) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return (
    <motion.div className={className} style={{ x: tx, y: ty }}>
      {children}
    </motion.div>
  );
}

/** A full-size layer spinning forever (static for reduced motion). */
function Spinner({
  duration,
  reverse,
  reduce,
  className,
  children,
}: {
  duration: number;
  reverse?: boolean;
  reduce: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className={cn("absolute", className)}
      animate={reduce ? undefined : { rotate: reverse ? -360 : 360 }}
      transition={reduce ? undefined : { duration, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}

function OuterRing() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" focusable="false">
      <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(255,169,92,0.32)" strokeWidth="0.6" />
      <circle cx="100" cy="100" r="93.5" fill="none" stroke="rgba(255,216,176,0.22)" strokeWidth="0.5" strokeDasharray="1 2.6" />
      {Array.from({ length: 36 }, (_, i) => (
        <line
          key={i}
          x1="100"
          y1={i % 3 === 0 ? 2.5 : 4}
          x2="100"
          y2="8"
          stroke={i % 9 === 0 ? "rgba(255,122,26,0.9)" : "rgba(255,216,176,0.35)"}
          strokeWidth={i % 9 === 0 ? 1.4 : 0.7}
          strokeLinecap="round"
          transform={`rotate(${i * 10} 100 100)`}
        />
      ))}
    </svg>
  );
}

function TextRing() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" focusable="false">
      <defs>
        <path id="dojo-seal-text" d="M100,100 m-86,0 a86,86 0 1,1 172,0 a86,86 0 1,1 -172,0" />
      </defs>
      <circle cx="100" cy="100" r="93" fill="none" stroke="rgba(255,122,26,0.18)" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="79" fill="none" stroke="rgba(255,122,26,0.18)" strokeWidth="0.5" />
      <text fill="rgba(255,216,176,0.55)" fontSize="7" fontWeight="800" letterSpacing="1.2">
        <textPath href="#dojo-seal-text" textLength="536" lengthAdjust="spacing">
          {SEAL_TEXT}
        </textPath>
      </text>
    </svg>
  );
}

function Hexagram() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" focusable="false">
      <defs>
        <linearGradient id="dojo-hex-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd8b0" />
          <stop offset="0.5" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth="0.8" strokeDasharray="6 4" />
      <polygon points="100,10 177.94,145 22.06,145" fill="rgba(255,122,26,0.04)" stroke="url(#dojo-hex-stroke)" strokeWidth="1.1" strokeLinejoin="round" />
      <polygon points="100,190 22.06,55 177.94,55" fill="rgba(139,92,246,0.04)" stroke="url(#dojo-hex-stroke)" strokeWidth="1.1" strokeLinejoin="round" />
      {[
        [100, 10],
        [177.94, 145],
        [22.06, 145],
        [100, 190],
        [22.06, 55],
        [177.94, 55],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill="#0d0d14" stroke="#ffa95c" strokeWidth="1" />
      ))}
      <circle cx="100" cy="100" r="52" fill="none" stroke="rgba(255,216,176,0.25)" strokeWidth="0.6" />
    </svg>
  );
}

/** Lesson emblems orbiting the seal, kept upright while the ring turns. */
function EmblemRing({ lessons, reduce }: { lessons: readonly HubLesson[]; reduce: boolean }) {
  const duration = 48;
  return (
    <Spinner duration={duration} reduce={reduce} className="inset-[15%]">
      {lessons.map((l, i) => {
        const angle = (360 / Math.max(1, lessons.length)) * i;
        const accent = ACCENT_STYLES[l.accent];
        return (
          <div key={l.id} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
            <motion.div
              className="absolute left-1/2 top-0 -ml-[7%] -mt-[7%] aspect-square w-[14%]"
              initial={{ rotate: -angle }}
              animate={reduce ? undefined : { rotate: [-angle, -angle - 360] }}
              transition={reduce ? undefined : { duration, repeat: Infinity, ease: "linear" }}
            >
              <span
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-full border bg-shadow-900/90 backdrop-blur",
                  accent.border,
                  accent.text,
                  accent.glow,
                )}
              >
                <Emblem name={l.emblem} size="58%" />
              </span>
            </motion.div>
          </div>
        );
      })}
    </Spinner>
  );
}

/** Five Chakra segments around the core; tapping the core fills them. */
function ChargeArc({ charge }: { charge: number }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" focusable="false" aria-hidden="true">
      {Array.from({ length: BASE_CHAKRA }, (_, i) => {
        const lit = i < charge;
        return (
          <circle
            key={i}
            cx="50"
            cy="50"
            r="46"
            fill="none"
            pathLength={100}
            strokeDasharray="17.6 82.4"
            strokeDashoffset={-(i * 20 + 1.2)}
            strokeLinecap="round"
            strokeWidth={lit ? 4.2 : 3}
            stroke={lit ? "#38c4ff" : "rgba(255,255,255,0.1)"}
            style={{
              filter: lit ? "drop-shadow(0 0 3px rgba(56,196,255,0.95))" : undefined,
              transition: "stroke 300ms ease, stroke-width 300ms ease",
            }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Hero art: a layered chakra seal spinning behind floating practice cards.
 * Pointer parallax is driven by the hero (`px`/`py` in -1..1). Tapping the core
 * charges the 5 base Chakra every player gains in each Start phase.
 */
export function HeroArt({
  lessons,
  cards,
  px,
  py,
}: {
  lessons: readonly HubLesson[];
  cards: readonly CardDef[];
  px: MotionValue<number>;
  py: MotionValue<number>;
}) {
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { margin: "-10% 0px" });
  const sx = useSpring(px, { stiffness: 55, damping: 16, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 55, damping: 16, mass: 0.6 });
  const rotateY = useTransform(sx, (v) => v * 7);
  const rotateX = useTransform(sy, (v) => v * -7);

  const [charge, setCharge] = useState(0);
  const [tap, setTap] = useState(0);
  const [fullBurst, setFullBurst] = useState(0);
  const [message, setMessage] = useState("");

  const [ambusherHidden, setAmbusherHidden] = useState(false);
  const [reveals, setReveals] = useState(0);
  const hiddenRef = useRef(false);

  // The ambusher keeps slipping into hiding and springing out again.
  useEffect(() => {
    if (reduce || !inView) return;
    const id = window.setInterval(() => {
      hiddenRef.current = !hiddenRef.current;
      setAmbusherHidden(hiddenRef.current);
      if (!hiddenRef.current) setReveals((r) => r + 1);
    }, 3400);
    return () => window.clearInterval(id);
  }, [reduce, inView]);

  const channel = () => {
    const next = charge >= BASE_CHAKRA ? 1 : charge + 1;
    setCharge(next);
    setTap((t) => t + 1);
    if (next === BASE_CHAKRA) {
      setFullBurst((b) => b + 1);
      setMessage("Fully charged: 5 Chakra, the base every player gains in each Start phase, plus 1 per character in play.");
    } else {
      setMessage(`${next} of ${BASE_CHAKRA} Chakra channeled.`);
    }
  };

  const [front, ambusher, support] = cards;
  const full = charge >= BASE_CHAKRA;

  return (
    <motion.div
      ref={root}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.25 }}
      className="relative mx-auto w-full max-w-[460px]"
    >
      <motion.div className="relative aspect-square w-full" style={{ rotateX, rotateY, transformPerspective: 1100 }}>
        {/* Back glows */}
        <div
          aria-hidden="true"
          className="absolute inset-[6%] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,26,0.42),rgba(242,92,0,0.12)_55%,transparent)] animate-pulse-glow"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[18%] rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.34),transparent)] blur-2xl"
        />

        {/* The seal */}
        <Parallax x={sx} y={sy} depth={6} className="absolute inset-0">
          <Spinner duration={120} reduce={reduce} className="inset-[1%]">
            <OuterRing />
          </Spinner>
          <Spinner duration={90} reverse reduce={reduce} className="inset-[7%]">
            <TextRing />
          </Spinner>
          <Spinner duration={70} reverse reduce={reduce} className="inset-[26%]">
            <Hexagram />
          </Spinner>
          <Spinner duration={30} reduce={reduce} className="inset-[30%] opacity-25">
            <span className="flex h-full w-full items-center justify-center text-chakra-300">
              <Emblem name="spiral" size="100%" />
            </span>
          </Spinner>
          <EmblemRing lessons={lessons} reduce={reduce} />

          {/* Charge arc + core */}
          <div className="absolute inset-[35%]">
            <ChargeArc charge={charge} />
          </div>
          {!reduce && (
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
              {SPARKS.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-chakra-200 shadow-[0_0_8px_2px_rgba(255,122,26,0.8)]"
                  initial={{ x: s.x, y: 0, opacity: 0 }}
                  animate={inView ? { x: s.x * 1.4, y: -110, opacity: [0, 1, 0] } : { opacity: 0 }}
                  transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeOut" }}
                />
              ))}
            </div>
          )}
          <div className="absolute inset-[39%]">
            <span aria-hidden="true" className="absolute -inset-3 rounded-full bg-chakra-500/30 blur-xl" />
            <motion.button
              type="button"
              onClick={channel}
              aria-label={`Channel Chakra into the seal (${charge} of ${BASE_CHAKRA})`}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className={cn(
                "relative flex h-full w-full items-center justify-center rounded-full border text-chakra-100 outline-none transition-colors duration-300",
                "bg-[radial-gradient(circle_at_35%_30%,#ffa95c_0%,#ff7a1a_35%,#8f2a00_75%,#2a0d00_100%)]",
                "shadow-[0_0_40px_-4px_rgba(255,122,26,0.85),inset_0_2px_10px_rgba(255,241,227,0.5)]",
                "focus-visible:ring-4 focus-visible:ring-energy-300/70",
                full ? "border-energy-200/80" : "border-chakra-200/60",
              )}
            >
              <span className="pointer-events-none flex h-[52%] w-[52%] items-center justify-center drop-shadow-[0_0_10px_rgba(255,241,227,0.9)]">
                <Emblem name="chakra" size="100%" />
              </span>
              <AnimatePresence>
                {tap > 0 && (
                  <motion.span
                    key={tap}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-energy-300"
                    initial={{ scale: 0.9, opacity: 0.9 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
              <ParticleBurst fire={tap} palette="energy" count={14} spread={70} shape="orb" ring={false} />
              <ParticleBurst fire={fullBurst} palette="chakra" count={36} spread={170} shape="mixed" duration={1.2} />
            </motion.button>
          </div>
        </Parallax>

        {/* Floating orbs */}
        <Parallax x={sx} y={sy} depth={26} className="pointer-events-none absolute inset-0">
          {ORBS.map((o, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn("absolute rounded-full", !reduce && "animate-float")}
              style={{
                left: o.left,
                top: o.top,
                width: o.size,
                height: o.size,
                background: o.color,
                boxShadow: `0 0 ${o.size * 2.4}px ${o.size * 0.6}px ${o.color}`,
                animationDelay: o.delay,
                animationDuration: o.dur,
              }}
            />
          ))}
        </Parallax>

        {/* Floating cards */}
        <Parallax x={sx} y={sy} depth={18} className="pointer-events-none absolute inset-0">
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute left-[4%] top-[5%]">
              <div className={cn(!reduce && "animate-float")} style={{ animationDelay: "-3s" }}>
                <EdgeToken size={40} className="scale-75 sm:scale-100" />
              </div>
            </div>
            {front && (
              <div className="absolute bottom-[5%] left-[1%] origin-bottom-left scale-[0.62] min-[420px]:scale-75 sm:scale-90 lg:scale-100">
                <div className={cn(!reduce && "animate-float")}>
                  <div className="-rotate-[11deg] drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]">
                    <GameCard card={front} size="md" />
                  </div>
                </div>
              </div>
            )}
            {support && (
              <div className="absolute bottom-[3%] right-[7%] origin-bottom-right scale-[0.62] min-[420px]:scale-75 sm:scale-90 lg:scale-100">
                <div className={cn(!reduce && "animate-float")} style={{ animationDelay: "-4.5s" }}>
                  <div className="rotate-[8deg] drop-shadow-[0_14px_24px_rgba(0,0,0,0.6)]">
                    <GameCard card={support} size="sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Parallax>
        {ambusher && (
          <Parallax x={sx} y={sy} depth={30} className="pointer-events-none absolute inset-0">
            <div aria-hidden="true" className="absolute right-[1%] top-[3%] origin-top-right scale-[0.62] min-[420px]:scale-75 sm:scale-90 lg:scale-100">
              <div className={cn(!reduce && "animate-float")} style={{ animationDelay: "-1.6s" }}>
                <div className="relative rotate-[9deg] drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]">
                  <GameCard card={ambusher} size="md" faceDown={!reduce && ambusherHidden} />
                  <ParticleBurst fire={reveals} palette="mist" count={26} spread={120} shape="mixed" />
                  <AnimatePresence>
                    {!reduce && !ambusherHidden && reveals > 0 && (
                      <motion.span
                        key={reveals}
                        className="absolute -top-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-gradient-to-b from-mist-300 to-mist-600 px-3 py-1 text-[12px] font-black tracking-[0.18em] text-white shadow-[0_0_24px_rgba(139,92,246,0.9)] ring-1 ring-mist-200/60"
                        initial={{ opacity: 0, y: 12, scale: 0.6 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 380, damping: 18 }}
                      >
                        AMBUSH!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </Parallax>
        )}
      </motion.div>

      <div className="relative mt-3 flex justify-center px-2">
        <p
          aria-live="polite"
          className="flex max-w-sm items-center gap-2 rounded-full border border-white/[0.08] bg-shadow-900/70 px-3.5 py-1.5 text-center text-[12px] font-semibold leading-snug text-ash-300 backdrop-blur"
        >
          <span
            aria-hidden="true"
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", full ? "bg-energy-300 shadow-[0_0_8px_rgba(56,196,255,0.9)]" : "bg-chakra-400")}
          />
          {message || "Tap the seal to channel your base Chakra."}
        </p>
      </div>
    </motion.div>
  );
}
