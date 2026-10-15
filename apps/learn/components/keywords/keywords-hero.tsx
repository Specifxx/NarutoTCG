"use client";

import { motion, type Variants } from "framer-motion";
import { useId, type ReactNode } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button, buttonClasses } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { CATEGORY_STYLES } from "@/components/ui/keyword-chip";
import { KEYWORD_CATEGORIES, KEYWORDS, type KeywordCategory } from "@/content/keywords";
import { cn } from "@/lib/cn";
import { XP } from "@/lib/progress";
import { sendGlossaryCommand, useExplored } from "./glossary-bus";
import { CATEGORY_TOTALS, OFFICIAL_COUNT, PLATFORM_COUNT } from "./glossary-search";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 170, damping: 22 } },
};

function StatChip({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[13px] font-semibold text-ash-200">
      <Icon name={icon} size={14} className="text-chakra-300" />
      {children}
    </li>
  );
}

const FLOATERS: ReadonlyArray<{ label: string; category: KeywordCategory; className: string; delay: string }> = [
  { label: "AMBUSH", category: "trigger", className: "-top-10 left-6", delay: "0s" },
  { label: "POWERUP 2", category: "effect", className: "-top-9 right-3", delay: "-2.2s" },
  { label: "MAIN", category: "trigger", className: "top-[38%] -left-16", delay: "-4s" },
  { label: "SCORE", category: "trigger", className: "-bottom-10 left-12", delay: "-1.3s" },
  { label: "CHAKRA +1", category: "resource", className: "-bottom-10 right-6", delay: "-3.1s" },
];

function MasteryRing({ value, total }: { value: number; total: number }) {
  const gradientId = useId();
  const ratio = total > 0 ? value / total : 0;
  return (
    <div className="relative h-[124px] w-[124px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdeaa8" />
            <stop offset="55%" stopColor="#ffa95c" />
            <stop offset="100%" stopColor="#ef4060" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="51" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
        <motion.circle
          cx="60"
          cy="60"
          r="51"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: ratio, opacity: ratio > 0 ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(255,169,92,0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2rem] font-black leading-none tabular-nums text-white">
          <AnimatedNumber value={value} />
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ash-400">of {total}</span>
      </div>
    </div>
  );
}

function MasteryPanel() {
  const explored = useExplored();
  const { hydrated, count, total, byCategory, next } = explored;
  const allDone = hydrated && count === total;
  const nextUp = hydrated ? next : (KEYWORDS.find((k) => k.featured) ?? null);

  return (
    <div className="relative">
      {FLOATERS.map((f) => (
        <span
          key={f.label}
          aria-hidden="true"
          className={cn(
            "absolute z-0 hidden animate-float items-center gap-1 rounded-md border px-1.5 py-[1px] text-[11px] font-bold tracking-wide opacity-70 lg:inline-flex",
            CATEGORY_STYLES[f.category].chip,
            f.className,
          )}
          style={{ animationDelay: f.delay }}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_STYLES[f.category].dot)} />
          {f.label}
        </span>
      ))}

      <section aria-labelledby="glossary-mastery-title" className="panel relative z-10 overflow-hidden p-5 sm:p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,122,26,0.32), transparent 70%)" }}
        />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-10 text-white/[0.035]">
          <Emblem name="scroll" size={190} />
        </span>

        <div className="relative flex items-center justify-between gap-3">
          <h2 id="glossary-mastery-title" className="eyebrow text-gold-300">
            Glossary mastery
          </h2>
          <span className="text-[11px] font-semibold text-ash-500">Saved on this device</span>
        </div>

        <div className="relative mt-4 flex items-center gap-5">
          <div role="img" aria-label={hydrated ? `${count} of ${total} terms explored` : "Exploration progress loading"}>
            <MasteryRing value={count} total={total} />
          </div>
          <dl className="min-w-0 space-y-3">
            <div>
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ash-500">Explored</dt>
              <dd className="text-xl font-black tabular-nums text-white">
                <AnimatedNumber value={count} />
                <span className="text-sm font-bold text-ash-500"> / {total} terms</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ash-500">Glossary XP</dt>
              <dd className="text-xl font-black tabular-nums text-gold-200">
                <AnimatedNumber value={count * XP.keywordExplored} />
                <span className="text-sm font-bold text-ash-500"> / {total * XP.keywordExplored}</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative mt-4">
          {allDone ? (
            <p className="flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3 py-2.5 text-sm font-bold text-gold-200">
              <Icon name="trophy" size={16} />
              Every term explored. Glossary mastered!
            </p>
          ) : (
            nextUp && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full !justify-between"
                onClick={() => sendGlossaryCommand({ type: "open", id: nextUp.id })}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon name="sparkles" size={14} className="text-gold-300" />
                  <span className="truncate">
                    Explore next: <span className="text-white">{nextUp.term}</span>
                  </span>
                </span>
                <span className="text-gold-300">+{XP.keywordExplored} XP</span>
              </Button>
            )
          )}
        </div>

        <ul className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/5 pt-3" aria-label="Explored terms by category">
          {KEYWORD_CATEGORIES.map((c) => {
            const done = byCategory[c.id];
            const all = CATEGORY_TOTALS[c.id];
            const style = CATEGORY_STYLES[c.id];
            return (
              <li key={c.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => sendGlossaryCommand({ type: "filter", category: c.id })}
                  aria-label={`Show ${c.label} in the directory. ${hydrated ? `${done} of ${all} explored` : `${all} terms`}.`}
                  className="group/cat w-full rounded-md px-1 py-1.5 text-left transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ash-300 group-hover/cat:text-white">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
                    <span className="truncate">{c.label}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-ash-500">
                      {hydrated ? done : 0}/{all}
                    </span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
                    <motion.span
                      className={cn("block h-full rounded-full", style.dot)}
                      initial={false}
                      animate={{ width: `${hydrated && all > 0 ? (done / all) * 100 : 0}%` }}
                      transition={{ type: "spring", stiffness: 90, damping: 20 }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Glossary hero: title, totals, search shortcut and the explored meter. */
export function KeywordsHero() {
  return (
    <div className="relative pb-6 pt-12 sm:pt-16 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
        <motion.div className="min-w-0" variants={container} initial="hidden" animate="show">
          <motion.p variants={item} className="eyebrow flex items-center gap-2.5 text-chakra-300">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-chakra-400" aria-hidden="true" />
            <Icon name="search" size={14} />
            Glossary · {KEYWORDS.length} terms
          </motion.p>
          <motion.h1
            variants={item}
            className="mt-4 text-[2.75rem] font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Keywords &amp; <span className="text-chakra-gradient">Glossary</span>
          </motion.h1>
          <motion.p variants={item} className="mt-3 text-xl font-bold text-ash-200 sm:text-2xl">
            Every keyword on the card, decoded.
          </motion.p>
          <motion.p variants={item} className="mt-5 max-w-xl text-base leading-relaxed text-ash-400 sm:text-lg">
            Card keywords, rules terms and the four phases of a Round, explained in plain words. Hover any term for a quick
            tooltip, open it for the full ruling with an example, and earn XP for every term you explore.
          </motion.p>
          <motion.ul variants={item} className="mt-6 flex flex-wrap gap-2" aria-label="Glossary overview">
            <StatChip icon="book">{KEYWORDS.length} terms</StatChip>
            <StatChip icon="layers">{KEYWORD_CATEGORIES.length} categories</StatChip>
            <StatChip icon="shield">
              {OFFICIAL_COUNT} official · {PLATFORM_COUNT} platform
            </StatChip>
            <StatChip icon="sparkles">+{XP.keywordExplored} XP per term</StatChip>
          </motion.ul>
          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => sendGlossaryCommand({ type: "focus-search" })}>
              <Icon name="search" size={16} />
              Search the glossary
              <kbd className="ml-1 hidden rounded border border-shadow-950/30 bg-shadow-950/15 px-1.5 text-[11px] font-black sm:inline">
                /
              </kbd>
            </Button>
            <a href="#signature-mechanics-title" className={buttonClasses("secondary", "lg")}>
              <Icon name="play" size={16} />
              See them in motion
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.25 }}
          className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none"
        >
          <MasteryPanel />
        </motion.div>
      </div>
    </div>
  );
}
