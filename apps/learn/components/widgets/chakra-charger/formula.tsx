"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/cn";
import { handEntry, TERM_STYLES, type ChargeTerm, type Play } from "./data";

const pop = {
  initial: { opacity: 0, scale: 0.4, y: -12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.5 },
  transition: { type: "spring" as const, stiffness: 460, damping: 22 },
};

function Op({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex h-10 items-center px-0.5 text-lg font-black text-ash-500">
      {children}
    </span>
  );
}

function Pill({ value, label, box, text, labelClass }: { value: ReactNode; label: string; box: string; text: string; labelClass: string }) {
  return (
    <span className="flex w-[54px] flex-col items-center gap-1 sm:w-[60px]">
      <span
        className={cn("flex h-10 min-w-10 items-center justify-center rounded-xl border px-1.5 text-lg font-black tabular-nums", box, text)}
      >
        {value}
      </span>
      <span className={cn("text-center text-[8.5px] font-black uppercase leading-[1.15] tracking-[0.08em]", labelClass)}>{label}</span>
    </span>
  );
}

function Frame({ title, hint, children, label }: { title: string; hint: ReactNode; children: ReactNode; label: string }) {
  return (
    <div className="w-full rounded-2xl border border-white/[0.07] bg-black/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span className="eyebrow !text-[10px] text-energy-300">{title}</span>
        <span className="text-[10.5px] font-semibold text-ash-500">{hint}</span>
      </div>
      <div role="group" aria-label={label} className="mt-3 flex min-h-[62px] flex-wrap items-start justify-center gap-x-0.5 gap-y-2.5">
        {children}
      </div>
    </div>
  );
}

/** "5 + 1 + 1 + 1 + 1 = 9", built term by term as sources are charged. */
export function ChargeFormula({
  terms,
  current,
  complete,
}: {
  /** Charged terms in formula order. */
  terms: readonly ChargeTerm[];
  /** Chakra that has actually landed in the gauge. */
  current: number;
  complete: boolean;
}) {
  const sum = terms.reduce((n, t) => n + t.amount, 0);
  const spoken = terms.length ? `${terms.map((t) => `${t.amount} ${t.label}`).join(" + ")} = ${sum}` : "No sources charged yet";
  return (
    <Frame title="Start-phase formula" hint="5 + 1 per character + bonuses" label={`Formula: ${spoken}`}>
      <AnimatePresence initial={false} mode="popLayout">
        {terms.map((t, i) => {
          const s = TERM_STYLES[t.kind];
          return (
            <motion.span key={t.key} layout className="flex items-start" {...pop}>
              {i > 0 && <Op>+</Op>}
              <Pill value={t.amount} label={t.label} box={s.box} text={s.text} labelClass={s.label} />
            </motion.span>
          );
        })}
        {terms.length === 0 && (
          <motion.span
            key="empty"
            layout
            className="flex h-10 items-center rounded-xl border border-dashed border-white/15 px-3 text-[11.5px] font-semibold text-ash-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Tap a source to begin
          </motion.span>
        )}
        <motion.span key="total" layout className="flex items-start">
          <Op>=</Op>
          <span className="flex w-[60px] flex-col items-center gap-1">
            <span
              className={cn(
                "flex h-10 min-w-12 items-center justify-center rounded-xl border px-2 text-xl font-black tabular-nums text-white transition-all duration-500",
                complete
                  ? "border-energy-200/80 bg-gradient-to-b from-energy-400/60 to-energy-600/60 shadow-[0_0_26px_-2px_rgba(56,196,255,0.95)]"
                  : "border-white/15 bg-white/[0.04]",
              )}
            >
              <AnimatedNumber value={current} stiffness={240} damping={24} />
            </span>
            <span className={cn("eyebrow !text-[8.5px] !tracking-[0.12em]", complete ? "text-energy-200" : "text-ash-500")}>
              {complete ? "Chakra" : "so far"}
            </span>
          </span>
        </motion.span>
      </AnimatePresence>
    </Frame>
  );
}

const PLAY_STYLES = {
  up: {
    box: "border-chakra-300/50 bg-gradient-to-b from-chakra-400/25 to-chakra-600/20 shadow-[0_0_16px_-6px_rgba(255,122,26,0.8)]",
    text: "text-chakra-200",
    label: "text-chakra-300",
  },
  hidden: TERM_STYLES.hidden,
} as const;

/** "9 − 4 − 3 − 2 = 0": the Action-phase spend, one term per play. */
export function SpendLedger({
  total,
  plays,
  remaining,
  ended,
}: {
  total: number;
  plays: readonly Play[];
  remaining: number;
  ended: boolean;
}) {
  const base = TERM_STYLES.base;
  const resultTone =
    ended && remaining === 0
      ? {
          box: "border-leaf-300/70 bg-leaf-500/20 shadow-[0_0_24px_-4px_rgba(74,222,128,0.9)]",
          text: "text-leaf-300",
          label: "text-leaf-300",
        }
      : ended
        ? {
            box: "border-blood-400/60 bg-blood-500/15 shadow-[0_0_20px_-6px_rgba(239,64,96,0.8)]",
            text: "text-blood-400",
            label: "text-blood-400",
          }
        : remaining === 0
          ? { box: "border-leaf-300/50 bg-leaf-500/10", text: "text-leaf-300", label: "text-leaf-300" }
          : { box: "border-white/15 bg-white/[0.04]", text: "text-white", label: "text-ash-400" };
  const spoken = `${total}${plays.map((p) => ` minus ${p.cost}`).join("")} = ${remaining} ${ended ? "wasted" : "left"}`;
  return (
    <Frame title="Chakra ledger" hint="Goal: 0 left at the End phase" label={`Ledger: ${spoken}`}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key="start" layout className="flex items-start">
          <Pill value={total} label="charged" box={base.box} text={base.text} labelClass={base.label} />
        </motion.span>
        {plays.map((p) => {
          const s = PLAY_STYLES[p.mode];
          const name = handEntry(p.cardId)?.short ?? p.cardId;
          return (
            <motion.span key={p.id} layout className="flex items-start" {...pop}>
              <Op>−</Op>
              <Pill value={p.cost} label={p.mode === "hidden" ? `${name} · hidden` : name} box={s.box} text={s.text} labelClass={s.label} />
            </motion.span>
          );
        })}
        <motion.span key="result" layout className="flex items-start">
          <Op>=</Op>
          <Pill
            value={<AnimatedNumber value={remaining} stiffness={240} damping={24} />}
            label={ended ? (remaining === 0 ? "zero waste" : "wasted") : "left"}
            box={resultTone.box}
            text={resultTone.text}
            labelClass={resultTone.label}
          />
        </motion.span>
      </AnimatePresence>
    </Frame>
  );
}
