"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import type { PointerEvent } from "react";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { KeywordChip } from "@/components/ui/keyword-chip";
import { PUZZLES } from "@/content/puzzles";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { PuzzleDef } from "@/lib/game/puzzle";
import { DIFFICULTY_STYLES } from "./difficulty";
import { StarRow } from "./star-row";
import { usePuzzleStars } from "./use-puzzle-stars";

const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } };
const tile: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 140, damping: 18 } },
};

export function DifficultyBadge({ difficulty, className }: { difficulty: PuzzleDef["difficulty"]; className?: string }) {
  const style = DIFFICULTY_STYLES[difficulty];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
        style.badge,
        className,
      )}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn("h-1.5 w-1.5 rotate-45 rounded-[1px]", n <= style.level ? "bg-current" : "bg-current opacity-25")}
          />
        ))}
      </span>
      {difficulty}
      <span className="sr-only">difficulty, level {style.level} of 3</span>
    </span>
  );
}

function PuzzleTile({
  puzzle,
  index,
  stars,
  upNext,
}: {
  puzzle: PuzzleDef;
  index: number;
  stars: number | null;
  upNext: boolean;
}) {
  const reduce = useReducedMotion();
  const style = DIFFICULTY_STYLES[puzzle.difficulty];
  const accent = ACCENT_STYLES[style.accent];
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 200, damping: 22 });
  const sy = useSpring(py, { stiffness: 200, damping: 22 });
  const rotateY = useTransform(sx, [0, 1], [-7, 7]);
  const rotateX = useTransform(sy, [0, 1], [6, -6]);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, ${style.glow}, transparent 62%)`;

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const cleared = stars !== null;
  const missions = puzzle.setup.missions.length;
  const handSize = puzzle.setup.hands.you.length;

  return (
    <motion.li variants={tile} className="perspective-1000 list-none">
      <motion.article
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY }}
        whileHover={reduce ? undefined : { y: -6 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={cn(
          "panel group relative flex h-full flex-col overflow-hidden p-5 transition-[border-color,box-shadow] duration-300 hover:border-white/15 sm:p-6",
          cleared && "border-leaf-400/25",
        )}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow }}
        />
        <span
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent", "via-white/25")}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-8 select-none text-[120px] font-black leading-none text-white/[0.035]"
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="relative flex items-start justify-between gap-3">
          <div className="relative">
            <span
              aria-hidden="true"
              className={cn("absolute inset-0 animate-pulse-glow rounded-2xl opacity-60", accent.softBg)}
            />
            <span
              className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br p-px",
                accent.gradient,
              )}
            >
              <span className="flex h-full w-full items-center justify-center rounded-[15px] bg-[radial-gradient(circle_at_50%_35%,#1d1d2c,#0b0b12_75%)]">
                <Emblem name={puzzle.emblem} size={34} className={cn(accent.text, "drop-shadow-[0_0_10px_currentColor]")} />
              </span>
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DifficultyBadge difficulty={puzzle.difficulty} />
            {stars !== null ? (
              <span className="flex items-center gap-1.5 rounded-full border border-leaf-400/30 bg-leaf-500/10 px-2 py-0.5 text-[11px] font-bold text-leaf-300">
                <Icon name="check" size={12} />
                Cleared
                <StarRow value={stars} size={12} label={`Best: ${stars} of 3 stars`} />
              </span>
            ) : upNext ? (
              <span className="flex items-center gap-1.5 rounded-full border border-chakra-400/35 bg-chakra-500/10 px-2 py-0.5 text-[11px] font-bold text-chakra-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-chakra-400" aria-hidden="true" />
                Up next
              </span>
            ) : null}
          </div>
        </div>

        <p className="eyebrow relative mt-5 text-ash-500">
          Puzzle {String(index + 1).padStart(2, "0")} · {style.blurb}
        </p>
        <h3 className="mt-1.5 text-xl font-black tracking-tight text-white sm:text-2xl">
          <Link
            href={`/puzzles/${puzzle.id}`}
            className="outline-none after:absolute after:inset-0 after:z-[1] after:rounded-[1.25rem] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-chakra-300"
          >
            {puzzle.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ash-400">{puzzle.tagline}</p>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] font-semibold text-ash-500">Teaches</span>
          {puzzle.teaches.map((k) => (
            <KeywordChip key={k} query={k} className="!mx-0" />
          ))}
        </div>

        <div className="min-h-5 flex-1" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ash-400">
            <span className="flex items-center gap-1 font-black text-gold-300">
              <Icon name="sparkles" size={13} />
              {puzzle.xp} XP
            </span>
            <span className="flex items-center gap-1">
              <Icon name="flag" size={13} className="text-ash-500" />
              {missions} missions
            </span>
            <span className="flex items-center gap-1">
              <Icon name="layers" size={13} className="text-ash-500" />
              {handSize} in hand
            </span>
          </div>
          <span
            aria-hidden="true"
            className={cn(
              "flex shrink-0 items-center gap-1 text-sm font-bold transition-transform duration-300 group-hover:translate-x-1",
              cleared ? "text-leaf-300" : "text-chakra-300",
            )}
          >
            {cleared ? "Replay" : "Start"}
            <Icon name="arrow-right" size={15} />
          </span>
        </div>
      </motion.article>
    </motion.li>
  );
}

export function PuzzleGrid() {
  const { ready, starsFor } = usePuzzleStars();
  const ordered = [...PUZZLES].sort((a, b) => a.order - b.order);
  const stars = ordered.map((p) => (ready ? starsFor(p) : null));
  const nextIndex = ready ? stars.findIndex((s) => s === null) : -1;

  return (
    <section aria-labelledby="puzzle-list-title" className="relative py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="puzzle-list-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Choose your trial
          </h2>
          <p className="mt-1 text-sm text-ash-400">All puzzles are open. Each one builds on the last.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span id="puzzle-order-label" className="eyebrow !text-[10px] text-ash-500">
            Recommended order
          </span>
          <ol
            aria-labelledby="puzzle-order-label"
            className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-ash-400"
          >
            {ordered.map((p, i) => (
              <li key={p.id} className="flex items-center gap-1.5">
                {i > 0 && <Icon name="chevron-right" size={12} className="text-ash-500" />}
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5",
                    stars[i] !== null ? "border-leaf-400/30 text-leaf-300" : "border-white/10 text-ash-300",
                  )}
                >
                  {i + 1}. {p.difficulty}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <motion.ul
        className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        variants={grid}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
      >
        {ordered.map((p, i) => (
          <PuzzleTile key={p.id} puzzle={p} index={i} stars={stars[i] ?? null} upNext={i === nextIndex} />
        ))}
      </motion.ul>
    </section>
  );
}
