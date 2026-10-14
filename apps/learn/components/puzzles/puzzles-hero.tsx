"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { EdgeToken } from "@/components/game/edge-token";
import { RankBadge } from "@/components/game/mission-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { PUZZLES, puzzleKey } from "@/content/puzzles";
import { RANK_ORDER } from "@/lib/game/types";
import { useProgress } from "@/lib/progress";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 170, damping: 22 } },
};

function RuleChip({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[13px] font-semibold text-ash-200">
      <Icon name={icon} size={14} className="text-chakra-300" />
      {children}
    </li>
  );
}

/** Decorative sigil: the four mission ranks orbiting the Edge token. */
// Fixed compass offsets (no trig at render time, so server and client markup match exactly).
const ORBIT: ReadonlyArray<[number, number]> = [
  [0, -112],
  [112, 0],
  [0, 112],
  [-112, 0],
];

function LethalSigil() {
  return (
    // Clipped to its circle: the rotating layers' corners would otherwise widen the page on phones.
    <div className="relative mx-auto h-[300px] w-[300px] max-w-full overflow-hidden rounded-full" aria-hidden="true">
      <span className="absolute inset-10 animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.55),rgba(239,64,96,0.25)_45%,transparent_70%)]" />
      <span className="absolute inset-4 rounded-full border border-white/[0.06]" />
      <span className="absolute inset-[38px] rounded-full border border-dashed border-chakra-400/25" />
      <span className="absolute inset-[78px] rounded-full border border-gold-400/20" />
      <span className="absolute inset-0 animate-spin-slow text-white/[0.05]">
        <Emblem name="shuriken" size="100%" />
      </span>
      <div className="absolute inset-0 animate-[spin_38s_linear_infinite]">
        {RANK_ORDER.map((rank, i) => {
          const [x, y] = ORBIT[i] ?? [0, 0];
          return (
            <span key={rank} className="absolute left-1/2 top-1/2" style={{ transform: `translate(${x}px, ${y}px)` }}>
              <span className="-ml-5 -mt-5 flex h-10 w-10 animate-[spin_38s_linear_infinite_reverse] items-center justify-center drop-shadow-[0_0_10px_rgba(255,169,92,0.55)]">
                <RankBadge rank={rank} size={38} />
              </span>
            </span>
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <EdgeToken size={84} />
          <span className="eyebrow mt-3 rounded-full border border-gold-400/30 bg-shadow-950/80 px-3 py-1 !text-[10px] text-gold-200">
            Ties → Edge
          </span>
        </div>
      </div>
    </div>
  );
}

export function PuzzlesHero() {
  const { hydrated, has, awards } = useProgress();
  const total = PUZZLES.length;
  const cleared = hydrated ? PUZZLES.filter((p) => has(puzzleKey(p.id))).length : 0;
  const xpEarned = hydrated ? PUZZLES.reduce((sum, p) => sum + (awards[puzzleKey(p.id)]?.xp ?? 0), 0) : 0;
  const xpTotal = PUZZLES.reduce((sum, p) => sum + p.xp, 0);

  return (
    <section aria-labelledby="puzzles-title" className="relative pb-6 pt-12 sm:pt-16 lg:pt-20">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <motion.div className="min-w-0" variants={container} initial="hidden" animate="show">
          <motion.p variants={item} className="eyebrow flex items-center gap-2.5 text-chakra-300">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-chakra-400" aria-hidden="true" />
            <Icon name="puzzle" size={14} />
            Dojo trials · {total} final-Round scenarios
          </motion.p>
          <motion.h1
            id="puzzles-title"
            variants={item}
            className="mt-4 text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            <span className="text-chakra-gradient">Lethal</span> Puzzles
          </motion.h1>
          <motion.p variants={item} className="mt-3 text-xl font-bold text-ash-200 sm:text-2xl">
            One Round left. Find the exact line that wins.
          </motion.p>
          <motion.p variants={item} className="mt-5 max-w-2xl text-base leading-relaxed text-ash-400 sm:text-lg">
            Each puzzle drops you into the final Round of a game you are about to lose. Play your cards in the right order, on
            the right missions, then pass to score them. Your opponent sticks to a fixed script that the briefing spells out,
            every tied mission goes to whoever holds the Edge token, and a side needs at least 1 Power to win a mission at all.
          </motion.p>
          <motion.ul variants={item} className="mt-6 flex flex-wrap gap-2" aria-label="Puzzle rules">
            <RuleChip icon="flag">Round 4 scores all 4 missions</RuleChip>
            <RuleChip icon="shield">Ties go to the Edge holder</RuleChip>
            <RuleChip icon="bolt">Need 1+ Power to win</RuleChip>
            <RuleChip icon="undo">Undo any time</RuleChip>
          </motion.ul>
        </motion.div>

        <motion.aside
          aria-label="Your puzzle progress"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.25 }}
          className="relative mx-auto flex w-full max-w-sm flex-col items-center lg:max-w-none"
        >
          <LethalSigil />
          <div className="panel -mt-4 flex w-full items-center justify-around gap-4 px-5 py-4">
            <div className="text-center">
              <p className="eyebrow !text-[10px] text-ash-500">Cleared</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-white">
                <AnimatedNumber value={cleared} />
                <span className="text-base font-bold text-ash-500"> / {total}</span>
              </p>
            </div>
            <span className="h-10 w-px bg-white/10" aria-hidden="true" />
            <div className="text-center">
              <p className="eyebrow !text-[10px] text-ash-500">Puzzle XP</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-gold-300">
                <AnimatedNumber value={xpEarned} />
                <span className="text-base font-bold text-ash-500"> / {xpTotal}</span>
              </p>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
