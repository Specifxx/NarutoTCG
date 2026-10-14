"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import type { Accent } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { EmblemName } from "@/lib/game/types";
import { RANKS, type RankDef } from "@/lib/progress";
import { ProgressBar, Skeleton } from "./primitives";
import type { HubProgress } from "./use-hub-progress";

export const RANK_VISUALS: Record<RankDef["id"], { emblem: EmblemName; short: string; accent: Accent }> = {
  academy: { emblem: "scroll", short: "Academy", accent: "chakra" },
  genin: { emblem: "leaf", short: "Genin", accent: "leaf" },
  chunin: { emblem: "shuriken", short: "Chunin", accent: "energy" },
  jonin: { emblem: "flame", short: "Jonin", accent: "mist" },
  kage: { emblem: "kage", short: "Kage", accent: "gold" },
};

const HEX = "[clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]";

function RankMedallion({ rank, hydrated }: { rank: RankDef; hydrated: boolean }) {
  const reduce = useReducedMotion();
  const visual = RANK_VISUALS[rank.id];
  const accent = ACCENT_STYLES[visual.accent];
  return (
    <div className="relative h-[76px] w-[76px] shrink-0" aria-hidden="true">
      <span className={cn("absolute inset-2 rounded-full opacity-70 blur-xl", accent.softBg)} />
      <motion.svg
        viewBox="0 0 100 100"
        className={cn("absolute inset-0 h-full w-full", accent.text)}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 24, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.6" strokeDasharray="3 5" />
        <circle cx="50" cy="3" r="2.6" fill="currentColor" />
      </motion.svg>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={hydrated ? rank.id : "loading"}
          className="absolute inset-[9px]"
          initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
        >
          <span className={cn("absolute inset-0 bg-gradient-to-br", HEX, hydrated ? accent.gradient : "from-shadow-600 to-shadow-800")} />
          <span className={cn("absolute inset-[3px] bg-gradient-to-b from-black/10 to-black/40", HEX)} />
          <span className={cn("absolute inset-0 flex items-center justify-center", hydrated ? "text-shadow-950" : "text-ash-500")}>
            <Emblem name={visual.emblem} size={28} />
          </span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  max,
  hydrated,
  fill,
  iconClass,
  unit,
}: {
  icon: IconName;
  label: string;
  /** Visible unit after the count, e.g. "cleared". */
  unit: string;
  value: number;
  max: number;
  hydrated: boolean;
  fill: string;
  iconClass: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]">
      <dt className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ash-500">
        <Icon name={icon} size={13} className={iconClass} />
        {label}
      </dt>
      <dd className="relative mt-1.5">
        <span className={cn("text-xl font-black tabular-nums text-white", !hydrated && "invisible")}>
          <AnimatedNumber value={hydrated ? value : 0} />
          <span className="text-sm font-bold text-ash-500">/{max}</span>
          <span className="ml-1 text-[11px] font-semibold text-ash-500">{unit}</span>
        </span>
        {!hydrated && <Skeleton className="absolute left-0 top-1/2 h-5 w-14 -translate-y-1/2" />}
        <ProgressBar value={hydrated && max ? value / max : 0} fillClassName={fill} className="mt-2 h-1" shine={false} />
      </dd>
    </div>
  );
}

function RankLadder({ index, hydrated }: { index: number; hydrated: boolean }) {
  const current = hydrated ? index : -1;
  const fill = RANKS.length > 1 && current > 0 ? current / (RANKS.length - 1) : 0;
  return (
    <div className="mt-6">
      <p className="eyebrow text-ash-500">Rank ladder</p>
      <div className="relative mt-3">
        <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[17px] h-0.5 rounded-full bg-white/10">
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-chakra-400 via-gold-400 to-gold-200 shadow-[0_0_10px_rgba(245,197,66,0.7)]"
            initial={false}
            animate={{ width: `${fill * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </span>
        <ol className="relative grid grid-cols-5" aria-label="Rank ladder">
        {RANKS.map((r, i) => {
          const visual = RANK_VISUALS[r.id];
          const accent = ACCENT_STYLES[visual.accent];
          const reached = i <= current;
          const isCurrent = i === current;
          return (
            <li
              key={r.id}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex min-w-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="sr-only">
                {r.title}, from {r.minXp} XP{isCurrent ? " (your rank)" : reached ? " (reached)" : ""}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500",
                  reached ? cn("bg-gradient-to-br text-shadow-950", accent.gradient, "border-white/30") : "border-white/10 bg-shadow-900 text-ash-500",
                  isCurrent && "scale-110 ring-2 ring-gold-300 ring-offset-2 ring-offset-shadow-900 shadow-[0_0_20px_rgba(245,197,66,0.6)]",
                )}
              >
                <Emblem name={visual.emblem} size={17} />
              </span>
              <span
                aria-hidden="true"
                className={cn("w-full truncate text-[10.5px] font-bold", isCurrent ? "text-gold-200" : reached ? "text-ash-200" : "text-ash-500")}
              >
                {visual.short}
              </span>
              <span aria-hidden="true" className="-mt-1 text-[9.5px] font-semibold tabular-nums text-ash-500">
                {r.minXp}
              </span>
            </li>
          );
        })}
        </ol>
      </div>
    </div>
  );
}

function Line({ hydrated, children, skeleton }: { hydrated: boolean; children: ReactNode; skeleton: string }) {
  return hydrated ? <>{children}</> : <Skeleton className={skeleton} />;
}

/** Rank, XP to the next rank, headline stats and the rank ladder. */
export function PlayerCard({ progress }: { progress: HubProgress }) {
  const { hydrated, rank, xp } = progress;
  const cleared = progress.puzzlesCleared.filter(Boolean).length;
  const lessonCount = progress.lessons.length;
  return (
    <motion.article
      aria-labelledby="dojo-player-title"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="panel relative overflow-hidden p-5 sm:p-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(245,197,66,0.28),transparent)] blur-2xl"
      />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-10 text-white/[0.03]">
        <Emblem name="shuriken" size={170} className="animate-spin-slow" />
      </span>

      <div className="relative flex items-center gap-4">
        <RankMedallion rank={rank.rank} hydrated={hydrated} />
        <div className="min-w-0">
          <p className="eyebrow text-gold-300">Ninja record</p>
          <h3 id="dojo-player-title" className="mt-1 text-2xl font-black leading-tight tracking-tight">
            <span className="sr-only">Your rank: </span>
            <Line hydrated={hydrated} skeleton="h-7 w-36">
              <span className="text-gold-gradient">{rank.rank.title}</span>
            </Line>
          </h3>
          <p className="mt-1 text-[12.5px] leading-snug text-ash-400">
            <Line hydrated={hydrated} skeleton="h-3.5 w-44">
              Rank {rank.index + 1} of {RANKS.length} · {rank.rank.blurb}
            </Line>
          </p>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="text-3xl font-black leading-none tabular-nums text-white">
          <span className={cn(!hydrated && "invisible")}>
            <AnimatedNumber value={xp} />
          </span>
          {!hydrated && <Skeleton className="h-7 w-16" />}
          <span className="ml-1.5 text-sm font-bold text-gold-300">XP</span>
        </p>
        <p className="text-[12px] font-semibold text-ash-400">
          <Line hydrated={hydrated} skeleton="h-3.5 w-32">
            {rank.next ? (
              <>
                <span className="tabular-nums text-ash-100">{rank.xpForNext}</span> XP to {rank.next.title}
              </>
            ) : (
              <span className="text-gold-200">Highest rank reached</span>
            )}
          </Line>
        </p>
      </div>
      <ProgressBar
        value={hydrated ? rank.progress : 0}
        fillClassName="from-gold-300 via-chakra-400 to-blood-400"
        className="relative mt-2.5 h-2.5"
        label={rank.next ? `Progress to ${rank.next.title}` : "Rank progress"}
      />

      <dl className="relative mt-5 grid grid-cols-2 gap-2.5">
        <StatTile
          icon="book"
          label="Lessons"
          unit="complete"
          value={progress.lessonsComplete}
          max={lessonCount}
          hydrated={hydrated}
          fill="from-chakra-300 to-chakra-500"
          iconClass="text-chakra-300"
        />
        <StatTile
          icon="star"
          label="Stars"
          unit="earned"
          value={progress.stars}
          max={progress.maxStars}
          hydrated={hydrated}
          fill="from-gold-200 to-gold-500"
          iconClass="text-gold-300"
        />
        <StatTile
          icon="puzzle"
          label="Puzzles"
          unit="cleared"
          value={cleared}
          max={progress.puzzleCount}
          hydrated={hydrated}
          fill="from-chakra-300 to-blood-400"
          iconClass="text-blood-400"
        />
        <StatTile
          icon="search"
          label="Keywords"
          unit="explored"
          value={progress.keywordsExplored}
          max={progress.keywordTotal}
          hydrated={hydrated}
          fill="from-mist-300 to-mist-500"
          iconClass="text-mist-300"
        />
      </dl>

      <RankLadder index={rank.index} hydrated={hydrated} />
    </motion.article>
  );
}
