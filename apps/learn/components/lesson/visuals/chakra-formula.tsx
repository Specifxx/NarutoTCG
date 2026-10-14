"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { ParticleBurst } from "@/components/fx/particle-burst";
import type { Accent, StepVisual } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";

type Source = "base" | "char" | "bonus";

const SOURCE_STYLES: Record<Source, { tile: string; label: string; pip: string; orb: string }> = {
  base: {
    tile: "border-energy-400/35 bg-energy-900/40 shadow-[inset_0_0_18px_rgba(14,165,233,0.15)]",
    label: "text-energy-300",
    pip: "bg-gradient-to-b from-energy-200 to-energy-500 shadow-[0_0_8px_rgba(56,196,255,0.9)]",
    orb: "#38c4ff",
  },
  char: {
    tile: "border-leaf-400/35 bg-leaf-600/15 shadow-[inset_0_0_18px_rgba(74,222,128,0.12)]",
    label: "text-leaf-300",
    pip: "bg-gradient-to-b from-leaf-300 to-leaf-500 shadow-[0_0_8px_rgba(74,222,128,0.85)]",
    orb: "#4ade80",
  },
  bonus: {
    tile: "border-gold-400/40 bg-gold-400/10 shadow-[inset_0_0_18px_rgba(245,197,66,0.12)]",
    label: "text-gold-300",
    pip: "bg-gradient-to-b from-gold-200 to-gold-500 shadow-[0_0_8px_rgba(245,197,66,0.85)]",
    orb: "#f5c542",
  },
};

/** Mini character tokens: face-up, hidden and an upgrade stack all count once. */
const MINI_KINDS = ["up", "hidden", "stack"] as const;
const MAX_MINIS = 6;
const MAX_PIPS = 24;

/** Chakra point i comes from the base first, then characters, then CHAKRA +X. */
function sourceFor(i: number, base: number, characters: number): Source {
  return i < base ? "base" : i < base + characters ? "char" : "bonus";
}

interface Orb {
  id: number;
  xs: number[];
  ys: number[];
  color: string;
  delay: number;
}

function Term({
  source,
  value,
  label,
  elRef,
  children,
}: {
  source: Source;
  value: number;
  label: string;
  elRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
}) {
  const s = SOURCE_STYLES[source];
  return (
    <div ref={elRef} className={cn("relative flex min-w-[50px] flex-col items-center gap-1 rounded-xl border px-2 py-1.5 sm:min-w-[64px] sm:px-2.5 sm:py-2", s.tile)}>
      <span className="text-[20px] font-black leading-none tabular-nums text-white sm:text-[24px]">{value}</span>
      <span className="flex h-[14px] items-center">{children}</span>
      <span className={cn("eyebrow whitespace-nowrap !text-[7.5px] !tracking-[0.14em] sm:!text-[8.5px]", s.label)}>{label}</span>
    </div>
  );
}

function Op({ children }: { children: ReactNode }) {
  return <span className="self-center text-lg font-black text-ash-500 sm:text-xl">{children}</span>;
}

/** "5 + N + X = total": orbs flow from each source into the Chakra gauge, which counts up. */
export function ChakraFormulaVisual({ visual, accent }: { visual: Extract<StepVisual, { kind: "chakra-formula" }>; accent: Accent }) {
  const a = ACCENT_STYLES[accent];
  const { base, characters, bonus } = visual;
  const total = base + characters + (bonus ?? 0);
  const pipCount = Math.min(total, MAX_PIPS);
  const minis = Math.min(characters, MAX_MINIS);
  const reduce = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const bonusRef = useRef<HTMLDivElement>(null);
  const miniRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const pipRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [filled, setFilled] = useState(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (reduce) {
      setOrbs([]);
      setFilled(pipCount);
      return;
    }
    setOrbs([]);
    setFilled(0);
    // Measure once the entrance animation has settled, then launch the orbs.
    const timer = setTimeout(() => {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      const centre = (el: Element | null | undefined) => {
        if (!el) return { x: r.width / 2, y: r.height / 2 };
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top };
      };
      const q = (p0: number, p1: number, p2: number, t: number) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2;
      const ts = [0, 0.25, 0.5, 0.75, 1];
      const list: Orb[] = [];
      for (let i = 0; i < pipCount; i++) {
        const src = sourceFor(i, base, characters);
        const from =
          src === "base"
            ? centre(baseRef.current)
            : src === "char"
              ? centre(minis > 0 ? miniRefs.current[Math.min(i - base, minis - 1)] : charRef.current)
              : centre(bonusRef.current);
        const to = centre(pipRefs.current[i]);
        // Deterministic bow so each orb takes its own curved path.
        const bow = (((i * 47) % 70) - 35) * 1.2;
        const cx = (from.x + to.x) / 2 + bow;
        const cy = Math.min(from.y, to.y) + (to.y - from.y) * 0.35 - 18;
        list.push({
          id: i,
          xs: ts.map((t) => q(from.x, cx, to.x, t)),
          ys: ts.map((t) => q(from.y, cy, to.y, t)),
          color: SOURCE_STYLES[src].orb,
          delay: 0.1 + i * (pipCount > 12 ? 0.08 : 0.12) + (src === "char" ? 0.12 : src === "bonus" ? 0.24 : 0),
        });
      }
      setOrbs(list);
    }, 450);
    return () => clearTimeout(timer);
  }, [reduce, base, characters, pipCount, minis]);

  useEffect(() => {
    if (pipCount > 0 && filled === pipCount && !reduce) setBurst((b) => b + 1);
  }, [filled, pipCount, reduce]);

  const charged = filled >= pipCount;

  return (
    <div ref={rootRef} className="relative flex flex-1 flex-col justify-center gap-7 px-3 pb-5 sm:gap-9 sm:px-6" aria-hidden="true">
      {/* Equation */}
      <motion.div
        className="flex flex-wrap items-stretch justify-center gap-1 sm:gap-2.5"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        {[
          <Term key="base" source="base" value={base} label="Base" elRef={baseRef}>
            <span className="text-energy-300">
              <Emblem name="chakra" size={13} />
            </span>
          </Term>,
          <Op key="op1">+</Op>,
          <Term key="char" source="char" value={characters} label="Characters" elRef={charRef}>
            {minis === 0 ? (
              <span className="text-[9px] font-semibold text-ash-500">none yet</span>
            ) : (
              <span className="flex items-center gap-[2px] sm:gap-[3px]">
                {Array.from({ length: minis }, (_, i) => {
                  const kind = MINI_KINDS[i % MINI_KINDS.length];
                  return (
                    <span
                      key={i}
                      ref={(el) => {
                        miniRefs.current[i] = el;
                      }}
                      className="relative h-[11px] w-[7px] sm:h-[13px] sm:w-[9px]"
                    >
                      {kind === "stack" && <span className="absolute -right-[2px] -top-[2px] h-full w-full rounded-[2px] bg-leaf-600/70" />}
                      <span
                        className={cn(
                          "absolute inset-0 rounded-[2px] ring-1",
                          kind === "hidden" ? "bg-mist-600 ring-mist-300/60" : "bg-gradient-to-b from-leaf-300 to-leaf-600 ring-leaf-200/50",
                        )}
                      />
                    </span>
                  );
                })}
                {characters > minis && <span className="ml-0.5 text-[9px] font-black text-leaf-300">+{characters - minis}</span>}
              </span>
            )}
          </Term>,
          ...(bonus !== undefined
            ? [
                <Op key="op2">+</Op>,
                <Term key="bonus" source="bonus" value={bonus} label="Chakra +X" elRef={bonusRef}>
                  <span className="rounded-sm bg-gold-400/90 px-1 text-[7px] font-black tracking-wider text-shadow-950">+X</span>
                </Term>,
              ]
            : []),
          // "=" and the total wrap together on narrow screens.
          <span key="total" className="flex items-stretch gap-1 sm:gap-2.5">
            <Op>=</Op>
            <span
              className={cn(
                "relative flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 transition-shadow duration-500 sm:min-w-[72px]",
                "border-energy-300/50 bg-gradient-to-b from-energy-500/30 to-energy-900/60",
                charged && "shadow-[0_0_30px_-4px_rgba(56,196,255,0.8)]",
              )}
            >
              <span className="text-[24px] font-black leading-none tabular-nums text-white drop-shadow-[0_0_10px_rgba(56,196,255,0.8)] sm:text-[30px]">
                {total}
              </span>
              <span className="eyebrow !text-[8px] text-energy-200">Chakra</span>
            </span>
          </span>,
        ].map((node, i) => (
          <motion.div
            key={i}
            className="flex"
            variants={{ hidden: { opacity: 0, y: 10, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1 } }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
          >
            {node}
          </motion.div>
        ))}
      </motion.div>

      {/* Gauge */}
      <div className="w-full">
        <div className="mb-2 flex items-end justify-between gap-2">
          <span className={cn("eyebrow", a.text)}>Start-phase charge</span>
          <span className="text-[13px] font-black tabular-nums text-white">
            <AnimatedNumber value={filled} stiffness={220} damping={24} />
            <span className="text-ash-500"> / {total}</span>
          </span>
        </div>
        <div className="relative">
          <div className="relative flex h-6 gap-[3px] overflow-hidden rounded-full border border-energy-400/30 bg-energy-900/40 p-[3px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
            {pipCount === 0 && <span className="m-auto text-[10px] font-semibold text-ash-500">Empty</span>}
            {Array.from({ length: pipCount }, (_, i) => (
              <span
                key={i}
                ref={(el) => {
                  pipRefs.current[i] = el;
                }}
                className={cn(
                  "relative min-w-0 flex-1 rounded-full transition-all duration-300",
                  i < filled ? SOURCE_STYLES[sourceFor(i, base, characters)].pip : "bg-white/[0.05]",
                )}
              />
            ))}
            {charged && pipCount > 0 && (
              <span className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] bg-[length:200%_100%]" />
            )}
          </div>
          <ParticleBurst fire={burst} palette="energy" count={26} spread={120} shape="orb" />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-semibold text-ash-400">
            <Legend source="base" text="Base" />
            <Legend source="char" text="Characters" />
            {bonus !== undefined && <Legend source="bonus" text="Chakra +X" />}
          </span>
          <motion.span
            initial={false}
            animate={{ opacity: charged ? 1 : 0, y: charged ? 0 : 4 }}
            className="text-[11px] font-semibold text-energy-200"
          >
            Spend it all: leftovers vanish at the End phase
          </motion.span>
        </div>
      </div>

      {/* Flying orbs (in-panel, so they stay with the illustration). */}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {orbs.map((o) => (
          <motion.span
            key={o.id}
            className="absolute left-0 top-0 h-[10px] w-[10px] -ml-[5px] -mt-[5px] rounded-full"
            style={{ background: `radial-gradient(circle, #fff 0%, ${o.color} 50%, transparent 75%)`, boxShadow: `0 0 12px 3px ${o.color}` }}
            initial={{ x: o.xs[0], y: o.ys[0], opacity: 0, scale: 0.3 }}
            animate={{ x: o.xs, y: o.ys, opacity: [0, 1, 1, 1, 0], scale: [0.3, 1.3, 1, 0.9, 0.6] }}
            transition={{ duration: 0.75, delay: o.delay, ease: "easeInOut" }}
            onAnimationComplete={() => setFilled((f) => Math.min(pipCount, f + 1))}
          />
        ))}
      </div>
    </div>
  );
}

function Legend({ source, text }: { source: Source; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-3.5 rounded-full", SOURCE_STYLES[source].pip)} />
      {text}
    </span>
  );
}
