"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import Link from "next/link";
import { useState, type PointerEvent, type ReactNode } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { CATEGORY_STYLES } from "@/components/ui/keyword-chip";
import { ACCENT_STYLES, type FxPalette } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { ProgressBar, SectionHeading, Skeleton } from "./primitives";
import type { HubData, HubKeywordChip, HubPuzzle } from "./types";
import type { HubProgress, LessonProgress } from "./use-hub-progress";

type ModuleAccent = "chakra" | "blood" | "mist";

/** Literal hover classes per accent (Tailwind needs them spelled out). */
const MODULE_THEME: Record<
  ModuleAccent,
  { palette: FxPalette; spot: string; hover: string; focus: string; bar: string; art: string; cta: string }
> = {
  chakra: {
    palette: "chakra",
    spot: "rgba(255,122,26,0.20)",
    hover: "hover:border-chakra-400/40 hover:shadow-[0_30px_80px_-30px_rgba(255,122,26,0.65)] focus-visible:border-chakra-400/60",
    focus: "focus-visible:ring-chakra-300",
    bar: "from-chakra-300 to-chakra-500",
    art: "from-chakra-500/25 via-shadow-900/40 to-transparent",
    cta: "text-chakra-300",
  },
  blood: {
    palette: "blood",
    spot: "rgba(239,64,96,0.20)",
    hover: "hover:border-blood-400/40 hover:shadow-[0_30px_80px_-30px_rgba(239,64,96,0.6)] focus-visible:border-blood-400/60",
    focus: "focus-visible:ring-blood-400",
    bar: "from-chakra-300 to-blood-400",
    art: "from-blood-500/25 via-shadow-900/40 to-transparent",
    cta: "text-blood-400",
  },
  mist: {
    palette: "mist",
    spot: "rgba(139,92,246,0.22)",
    hover: "hover:border-mist-400/40 hover:shadow-[0_30px_80px_-30px_rgba(139,92,246,0.65)] focus-visible:border-mist-400/60",
    focus: "focus-visible:ring-mist-300",
    bar: "from-mist-300 to-mist-500",
    art: "from-mist-500/25 via-shadow-900/40 to-transparent",
    cta: "text-mist-300",
  },
};

interface ModuleCardProps {
  index: number;
  href: string;
  accent: ModuleAccent;
  icon: IconName;
  eyebrow: string;
  title: string;
  description: string;
  art: ReactNode;
  hydrated: boolean;
  progressValue: number;
  progressText: string;
  cta: string;
}

function ModuleCard({
  index,
  href,
  accent,
  icon,
  eyebrow,
  title,
  description,
  art,
  hydrated,
  progressValue,
  progressText,
  cta,
}: ModuleCardProps) {
  const reduce = useReducedMotion();
  const theme = MODULE_THEME[accent];
  const accentStyle = ACCENT_STYLES[accent];
  const [burst, setBurst] = useState(0);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mx = useMotionValue(50);
  const my = useMotionValue(30);
  const rotateX = useSpring(rx, { stiffness: 220, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 220, damping: 20 });
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, ${theme.spot}, transparent 62%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    mx.set(fx * 100);
    my.set(fy * 100);
    if (reduce) return;
    ry.set((fx - 0.5) * 10);
    rx.set((0.5 - fy) * 8);
  };
  const onEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") setBurst((b) => b + 1);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: index * 0.1 }}
      className="h-full [perspective:1100px]"
    >
      <motion.div
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY }}
        className="group h-full"
      >
        <Link
          href={href}
          className={cn(
            "panel relative flex h-full flex-col overflow-hidden outline-none transition-[border-color,box-shadow] duration-300",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950",
            theme.focus,
            theme.hover,
          )}
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: spotlight }}
          />
          <div
            className={cn(
              "relative h-44 overflow-hidden border-b border-white/[0.06] bg-gradient-to-b",
              theme.art,
            )}
          >
            <div className="absolute inset-0 opacity-50 [background:repeating-conic-gradient(from_0deg_at_50%_120%,rgba(255,255,255,0.05)_0deg_3deg,transparent_3deg_12deg)]" />
            {art}
            <ParticleBurst fire={burst} palette={theme.palette} count={18} spread={110} shape="mixed" ring={false} />
          </div>
          <div className="relative z-10 flex flex-1 flex-col p-5 sm:p-6">
            <p className={cn("eyebrow flex items-center gap-2", accentStyle.text)}>
              <Icon name={icon} size={14} />
              {eyebrow}
            </p>
            <h3 className="mt-2.5 text-[1.35rem] font-black tracking-tight text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ash-400">{description}</p>
            <div className="mt-auto pt-5">
              <div className="flex items-center justify-between gap-3 text-[12px] font-semibold">
                {hydrated ? (
                  <span className="text-ash-300 tabular-nums">{progressText}</span>
                ) : (
                  <Skeleton className="h-3.5 w-28" />
                )}
                <span className={cn("flex items-center gap-1 font-bold", theme.cta)}>
                  {cta}
                  <Icon
                    name="arrow-right"
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </div>
              <ProgressBar value={hydrated ? progressValue : 0} fillClassName={theme.bar} className="mt-2.5" />
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Module art                                                          */
/* ------------------------------------------------------------------ */

const ARC_OFFSETS = ["mt-8", "mt-2", "mt-0", "mt-2", "mt-8"] as const;

function LessonsArt({ rows }: { rows: readonly LessonProgress[] }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
      <span className="absolute -right-6 -top-6 text-chakra-300/10 transition-transform duration-700 group-hover:rotate-12">
        <Emblem name="scroll" size={150} />
      </span>
      <div className="relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path
            d="M8 56 Q50 -10 92 56"
            fill="none"
            stroke="rgba(255,169,92,0.4)"
            strokeWidth="2"
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol className="relative flex items-start gap-2.5 sm:gap-3">
          {rows.map((r, i) => {
            const accent = ACCENT_STYLES[r.lesson.accent];
            return (
              <li key={r.lesson.id} className={cn("flex flex-col items-center gap-1.5", ARC_OFFSETS[i] ?? "mt-0")}>
                <span
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center transition-transform duration-500 group-hover:-translate-y-1.5",
                    r.complete ? "text-shadow-950" : accent.text,
                  )}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  {r.status === "next" && <span className="absolute -inset-2 animate-pulse-glow rounded-full bg-chakra-400/40" />}
                  <span
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]",
                      r.complete ? accent.gradient : "from-shadow-600 to-shadow-800",
                    )}
                  />
                  {!r.complete && (
                    <span className="absolute inset-[2px] bg-shadow-900 [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]" />
                  )}
                  <Emblem name={r.lesson.emblem} size={20} className="relative" />
                </span>
                <span className={cn("text-[10px] font-black tabular-nums", r.complete ? "text-ash-100" : "text-ash-500")}>
                  {r.lesson.order}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

const FAN = [
  "-rotate-[14deg] translate-x-3 group-hover:-rotate-[20deg] group-hover:-translate-x-2",
  "-translate-y-2 group-hover:-translate-y-4",
  "rotate-[14deg] -translate-x-3 group-hover:rotate-[20deg] group-hover:translate-x-2",
] as const;
const NUMERALS = ["I", "II", "III", "IV", "V"] as const;

function PuzzlesArt({ puzzles, cleared }: { puzzles: readonly HubPuzzle[]; cleared: readonly boolean[] }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
      <motion.span
        className="absolute text-blood-400/25"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <Emblem name="target" size={168} />
      </motion.span>
      <div className="relative flex items-end">
        {puzzles.slice(0, 3).map((p, i) => {
          const done = cleared[i] ?? false;
          return (
            <div
              key={p.id}
              className={cn(
                "relative -mx-1.5 flex h-[104px] w-[74px] flex-col items-center justify-between rounded-[10px] bg-gradient-to-br p-[2px] shadow-[0_14px_28px_-10px_rgba(0,0,0,0.8)] transition-transform duration-500",
                done ? "from-leaf-300 via-leaf-500 to-leaf-600" : "from-chakra-300 via-blood-500 to-shadow-700",
                FAN[i] ?? "",
              )}
            >
              <div className="flex h-full w-full flex-col items-center justify-between rounded-[8px] bg-[radial-gradient(circle_at_50%_35%,#3b0a14_0%,#0d0d14_75%)] px-1 py-2">
                <span className="text-[11px] font-black tracking-widest text-ash-300">{NUMERALS[i]}</span>
                <span className={done ? "text-leaf-300" : "text-chakra-200"}>
                  <Emblem name={p.emblem} size={28} />
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.14em] text-ash-400">{p.difficulty}</span>
              </div>
              {done && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-leaf-400 text-shadow-950 ring-2 ring-shadow-950">
                  <Icon name="check" size={12} strokeWidth={3} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeywordsArt({ chips }: { chips: readonly HubKeywordChip[] }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5">
      <div className="flex w-full max-w-[250px] items-center gap-2 rounded-xl border border-mist-400/30 bg-shadow-950/70 px-3 py-2 text-[12px] text-ash-400 shadow-[0_0_24px_-8px_rgba(139,92,246,0.7)] backdrop-blur">
        <Icon name="search" size={14} className="text-mist-300" />
        <span className="truncate">Search AMBUSH, POWERUP…</span>
        <span className={cn("ml-auto h-3.5 w-px bg-mist-300", !reduce && "animate-pulse")} />
      </div>
      <ul className="flex max-w-[290px] flex-wrap justify-center gap-1.5">
        {chips.map((c, i) => (
          <li
            key={c.id}
            className={cn(!reduce && "animate-float")}
            style={{ animationDelay: `${-i * 0.7}s`, animationDuration: `${5 + (i % 3)}s` }}
          >
            <span
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-black tracking-wide transition-transform duration-300 group-hover:-translate-y-0.5",
                CATEGORY_STYLES[c.category].chip,
              )}
            >
              {c.term}
              {c.platform && (
                <span className="rounded-sm bg-blood-500/25 px-1 text-[7.5px] font-black uppercase tracking-wider text-blood-400">
                  platform
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

/** "Choose your training": How to Play, Lethal Puzzles and Keywords. */
export function ModuleCards({ data, progress }: { data: HubData; progress: HubProgress }) {
  const cleared = progress.puzzlesCleared.filter(Boolean).length;
  return (
    <section aria-labelledby="dojo-modules-title" className="relative pt-10 sm:pt-14">
      <SectionHeading
        id="dojo-modules-title"
        eyebrow="Training grounds"
        title="Choose your training"
        description="Learn the rules, test them under pressure, then look anything up. Every module feeds the same XP bar."
      />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <ModuleCard
          index={0}
          href="/how-to-play"
          accent="chakra"
          icon="book"
          eyebrow={`${data.lessons.length} lessons`}
          title="How to Play"
          description="An animated rulebook: deck setup, Chakra, hidden ninjas and ambushes, mission evaluation and the Edge token, each with a mini-game."
          art={<LessonsArt rows={progress.lessons} />}
          hydrated={progress.hydrated}
          progressValue={progress.maxStars ? progress.stars / progress.maxStars : 0}
          progressText={`${progress.lessonsComplete}/${data.lessons.length} lessons · ${progress.stars}/${progress.maxStars} stars`}
          cta="Study"
        />
        <ModuleCard
          index={1}
          href="/puzzles"
          accent="blood"
          icon="puzzle"
          eyebrow={`${data.puzzles.length} scenarios`}
          title="Lethal Puzzles"
          description="Final-Round boards with exactly one winning line. Play the right cards in the right order to steal the game."
          art={<PuzzlesArt puzzles={data.puzzles} cleared={progress.puzzlesCleared} />}
          hydrated={progress.hydrated}
          progressValue={progress.puzzleCount ? cleared / progress.puzzleCount : 0}
          progressText={`${cleared}/${progress.puzzleCount} cleared`}
          cta="Solve"
        />
        <ModuleCard
          index={2}
          href="/keywords"
          accent="mist"
          icon="search"
          eyebrow={`${data.keywordKeys.length} terms`}
          title="Keywords"
          description="A searchable glossary of every card keyword and rules term, from AMBUSH to the Edge token, with animated tooltips."
          art={<KeywordsArt chips={data.keywordChips} />}
          hydrated={progress.hydrated}
          progressValue={progress.keywordTotal ? progress.keywordsExplored / progress.keywordTotal : 0}
          progressText={`${progress.keywordsExplored}/${progress.keywordTotal} explored`}
          cta="Browse"
        />
      </div>
    </section>
  );
}
