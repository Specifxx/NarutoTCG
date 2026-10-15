"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Button, buttonClasses } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { KeywordChip } from "@/components/ui/keyword-chip";
import { cn } from "@/lib/cn";
import { BASE_CHAKRA, HIDDEN_COST, nextRoundIncome, ROUND, TOTAL_CHAKRA, wasteHint, type Play } from "./data";

export type Phase = "charge" | "spend" | "end";

const PHASE_COPY: Record<Phase, { eyebrow: string; title: string; text: string }> = {
  charge: {
    eyebrow: "Start phase",
    title: "Charge your Chakra",
    text: `Tap every source to channel its Chakra into your gauge: the Kage Seal's base ${BASE_CHAKRA}, then 1 for each character you have in play.`,
  },
  spend: {
    eyebrow: "Action phase",
    title: "Spend every drop",
    text: `Pay for plays until the gauge reads 0. A card's printed cost plays it face-up; any card can go down hidden for ${HIDDEN_COST}.`,
  },
  end: {
    eyebrow: "End phase",
    title: "Use it or lose it",
    text: "Leftover Chakra is discarded now. Whatever you didn't spend this Round is gone for good.",
  },
};

const STEPS: ReadonlyArray<{ id: Phase; label: string; icon: IconName }> = [
  { id: "charge", label: "Charge", icon: "bolt" },
  { id: "spend", label: "Spend", icon: "hand" },
  { id: "end", label: "End phase", icon: "flag" },
];

/** Title block, Round marker, Reset and a three-step progress tracker. */
export function ChargerHeader({ phase, completed, onReset }: { phase: Phase; completed: boolean; onReset: () => void }) {
  const copy = PHASE_COPY[phase];
  const current = STEPS.findIndex((s) => s.id === phase);
  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-1">
          <span
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5"
            aria-label={`Round ${ROUND} of 4`}
          >
            <span className="text-[10.5px] font-black tracking-wide text-ash-200">R{ROUND}</span>
            <span aria-hidden="true" className="flex gap-[3px]">
              {[1, 2, 3, 4].map((r) => (
                <span
                  key={r}
                  className={cn(
                    "h-1.5 w-3 rounded-full",
                    r < ROUND ? "bg-ash-500/70" : r === ROUND ? "bg-energy-300 shadow-[0_0_6px_rgba(56,196,255,0.9)]" : "bg-white/10",
                  )}
                />
              ))}
            </span>
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phase}
              className="eyebrow text-energy-300"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {copy.eyebrow}
            </motion.span>
          </AnimatePresence>
          {completed && (
            <span className="flex items-center gap-1 rounded-full border border-leaf-400/40 bg-leaf-500/10 px-2 py-0.5 text-[10.5px] font-black tracking-wide text-leaf-300">
              <Icon name="check" size={11} strokeWidth={3} />
              Cleared
            </span>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={onReset} className="shrink-0" aria-label="Reset the Chakra Charger and start over">
          <Icon name="refresh" size={14} />
          Reset
        </Button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        >
          <h3 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">{copy.title}</h3>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ash-400 sm:text-sm">{copy.text}</p>
        </motion.div>
      </AnimatePresence>

      <ol className="mt-4 flex max-w-md items-center gap-1.5" aria-label="Chakra Charger progress">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li
              key={s.id}
              className={cn("flex items-center gap-1.5", i < STEPS.length - 1 && "min-w-0 flex-1")}
              aria-current={state === "current" ? "step" : undefined}
            >
              <motion.span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 sm:h-7 sm:w-7",
                  state === "done" && "border-leaf-400/60 bg-leaf-500/20 text-leaf-300",
                  state === "current" && "border-energy-300/80 bg-energy-500/25 text-energy-100 shadow-[0_0_14px_rgba(56,196,255,0.6)]",
                  state === "todo" && "border-white/10 bg-white/[0.03] text-ash-500",
                )}
                initial={false}
                animate={{ scale: state === "current" ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Icon name={state === "done" ? "check" : s.icon} size={12} strokeWidth={state === "done" ? 3 : 2.2} />
              </motion.span>
              <span
                className={cn(
                  "whitespace-nowrap text-[11.5px] font-bold",
                  state === "current" ? "text-white" : state === "done" ? "text-leaf-300" : "text-ash-500",
                )}
              >
                {s.label}
                <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (current step)" : ""}</span>
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="relative h-[2px] min-w-3 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-leaf-400 to-energy-300"
                    initial={false}
                    animate={{ width: i < current ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RuleCard({
  icon,
  tone,
  title,
  children,
  index,
}: {
  icon: ReactNode;
  tone: string;
  title: ReactNode;
  children: ReactNode;
  index: number;
}) {
  return (
    <motion.li
      className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.3 + index * 0.06 }}
    >
      <span aria-hidden="true" className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1", tone)}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-black text-white">{title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-ash-400">{children}</p>
      </div>
    </motion.li>
  );
}

/** Compact legend of the Chakra rule, plus the EXHAUST disclaimer. */
export function RuleLegend() {
  return (
    <div className="space-y-3">
      <p className="eyebrow text-ash-500">The Chakra rule</p>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <RuleCard
          index={0}
          icon={<Emblem name="kage" size={18} />}
          tone="bg-energy-500/15 text-energy-300 ring-energy-400/30"
          title={`Base ${BASE_CHAKRA}`}
        >
          Every Start phase, each player gains {BASE_CHAKRA} Chakra.
        </RuleCard>
        <RuleCard
          index={1}
          icon={<Emblem name="leaf" size={18} />}
          tone="bg-leaf-500/15 text-leaf-300 ring-leaf-400/30"
          title="+1 per character"
        >
          Each character you have in play adds 1, hidden ones too. An upgrade stack counts once.
        </RuleCard>
        <RuleCard
          index={2}
          icon={<Emblem name="chakra" size={18} />}
          tone="bg-gold-400/15 text-gold-300 ring-gold-400/30"
          title={<KeywordChip query="chakra-x">CHAKRA +X</KeywordChip>}
        >
          A face-up character with this bonus adds X more each Start phase.
        </RuleCard>
        <RuleCard
          index={3}
          icon={<Emblem name="flame" size={18} />}
          tone="bg-blood-500/15 text-blood-400 ring-blood-400/30"
          title="Use it or lose it"
        >
          Leftover Chakra is discarded in the End phase. Nothing carries over.
        </RuleCard>
      </ul>
      <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px] leading-relaxed text-ash-500">
        <Icon name="info" size={13} className="shrink-0 text-ash-500" />
        <KeywordChip query="exhaust">EXHAUST</KeywordChip>
        <span>is this site&apos;s shorthand for spending Chakra, not an official keyword. On real cards you simply pay the cost.</span>
      </p>
    </div>
  );
}

/** The End-phase verdict: zero waste (complete) or wasted Chakra (retry). */
export function ResultPanel({
  wasted,
  plays,
  onRetry,
  onReplay,
}: {
  wasted: number;
  plays: readonly Play[];
  onRetry: () => void;
  onReplay: () => void;
}) {
  const primary = useRef<HTMLButtonElement>(null);
  const [fire, setFire] = useState(0);
  const win = wasted === 0;
  const income = nextRoundIncome(plays);

  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
    const t = setTimeout(() => setFire(1), win ? 250 : 0);
    return () => clearTimeout(t);
  }, [win]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay: win ? 0.15 : 0.6 }}
      className={cn(
        "relative mt-6 rounded-2xl border p-4 sm:p-5",
        win
          ? "border-leaf-400/35 bg-gradient-to-br from-leaf-500/20 via-leaf-500/[0.06] to-transparent shadow-[0_0_40px_-16px_rgba(74,222,128,0.7)]"
          : "border-blood-400/35 bg-gradient-to-br from-blood-500/15 via-chakra-500/[0.05] to-transparent",
      )}
    >
      {win && <ParticleBurst fire={fire} palette="gold" shape="star" count={26} spread={140} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            win
              ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950 shadow-[0_0_20px_rgba(74,222,128,0.6)]"
              : "bg-blood-500/20 text-blood-400 ring-1 ring-blood-400/40",
          )}
        >
          {win ? <Icon name="trophy" size={22} strokeWidth={2.2} /> : <Emblem name="flame" size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-lg font-black tracking-tight", win ? "text-leaf-300" : "text-white")}>
            {win ? "Zero waste!" : `${wasted} Chakra wasted`}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ash-300">
            {win
              ? `All ${TOTAL_CHAKRA} Chakra became board presence before the End phase could discard any of it.`
              : "Leftover Chakra is discarded in the End phase, so it never carries over to the next Round. So close: rewind and find a combination that lands on exactly 0."}
          </p>
          <p className="mt-2 flex gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-[12.5px] leading-snug text-ash-300">
            <Icon name="lightbulb" size={15} className={cn("mt-px shrink-0", win ? "text-gold-300" : "text-chakra-300")} />
            <span>
              {win ? (
                <>
                  Board presence is income: if all {income.characters} characters survive, next Start phase you charge{" "}
                  <strong className="font-black text-energy-200">
                    {BASE_CHAKRA} + {income.characters}
                    {income.bonus > 0 ? ` + ${income.bonus}` : ""} = {income.total}
                  </strong>
                  .
                </>
              ) : (
                wasteHint(plays, wasted)
              )}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {win ? (
              <button ref={primary} type="button" className={buttonClasses("secondary", "sm")} onClick={onReplay}>
                <Icon name="refresh" size={14} />
                Replay from the Start phase
              </button>
            ) : (
              <>
                <button ref={primary} type="button" className={buttonClasses("primary", "sm")} onClick={onRetry}>
                  <Icon name="undo" size={14} />
                  Try the spend again
                </button>
                <Button variant="ghost" size="sm" onClick={onReplay}>
                  <Icon name="refresh" size={14} />
                  Start over
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
