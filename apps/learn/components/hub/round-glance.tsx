"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { RankBadge } from "@/components/game/mission-card";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import type { Accent } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { RANK_BONUS, RANK_ORDER, type EmblemName, type Rank } from "@/lib/game/types";
import { SectionHeading, useCalmMotion } from "./primitives";
import type { HubLesson } from "./types";
import { lessonHref } from "./use-hub-progress";

const ROUND_COUNT = 4;
const CYCLE_MS = 2800;

interface PhaseDef {
  id: "start" | "action" | "evaluation" | "end";
  name: string;
  emblem: EmblemName;
  accent: Accent;
  /** The lesson that teaches this phase. */
  lessonId: string;
  /** One-line summary for the chosen Round (1-4) and the rank of the mission it reveals. */
  line: (round: number, rank: Rank) => string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const PHASES: readonly PhaseDef[] = [
  {
    id: "start",
    name: "Start",
    emblem: "chakra",
    accent: "energy",
    lessonId: "charging-chakra",
    line: (_round, rank) =>
      `Reveal the ${rank}-rank mission (+${plural(RANK_BONUS[rank], "bonus point")}). Both players gain 5 Chakra + 1 per character they have in play, then draw 2.`,
  },
  {
    id: "action",
    name: "Action",
    emblem: "kunai",
    accent: "mist",
    lessonId: "summoning-and-hidden-cards",
    line: () =>
      "The Edge holder goes first. Take turns playing one card (face-up, hidden, reveal or upgrade) or passing; the first to pass takes the Edge.",
  },
  {
    id: "evaluation",
    name: "Mission evaluation",
    emblem: "target",
    accent: "blood",
    lessonId: "combat-and-missions",
    line: (round) =>
      round === 1
        ? "Score the D-rank mission: more Power wins it (you need at least 1) and a tie goes to the Edge holder."
        : `Score all ${round} missions in order, ${RANK_ORDER.slice(0, round).join(" → ")}. More Power wins each (at least 1 needed); ties go to the Edge holder.`,
  },
  {
    id: "end",
    name: "End",
    emblem: "edge",
    accent: "gold",
    lessonId: "the-edge-token",
    line: (round) =>
      round < ROUND_COUNT
        ? `Discard leftover Chakra and every Power token, then Round ${round + 1} begins with a new Start phase.`
        : "Discard leftovers and the game ends: the most Mission points wins, and a tie goes to the Edge holder.",
  },
];

function roundSummary(round: number, rank: Rank): ReactNode {
  const scored =
    round === 1
      ? "it is the only mission scored."
      : round === 2
        ? "both missions in play are scored."
        : `all ${round} missions in play are scored.`;
  return (
    <>
      <strong className="font-bold text-white">
        Round {round}
        {round === ROUND_COUNT ? " (final)" : ` of ${ROUND_COUNT}`}:
      </strong>{" "}
      {rank === "A" ? "an" : "a"} {rank}-rank mission enters, paying its printed points +{RANK_BONUS[rank]} to the winner,
      and {scored}
    </>
  );
}

function RoundPicker({ round, tick, onPick }: { round: number; tick: number; onPick: (round: number) => void }) {
  return (
    <div
      role="group"
      aria-label="Choose a Round"
      className="flex w-full shrink-0 items-stretch gap-1 rounded-2xl border border-white/[0.08] bg-shadow-900/70 p-1.5 backdrop-blur md:w-auto"
    >
      {RANK_ORDER.map((rank, i) => {
        const n = i + 1;
        const selected = n === round;
        const inPlay = n <= round;
        return (
          <button
            key={rank}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(n)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2.5 py-2 outline-none transition-colors md:flex-none md:px-4",
              "focus-visible:ring-2 focus-visible:ring-chakra-300",
              !selected && "hover:bg-white/[0.04]",
            )}
          >
            {selected && (
              <motion.span
                layoutId="dojo-round-pick"
                aria-hidden="true"
                className="absolute inset-0 rounded-xl bg-white/[0.08] shadow-[0_0_24px_-6px_rgba(255,122,26,0.55)] ring-1 ring-chakra-300/40"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              aria-hidden="true"
              className={cn("relative transition duration-300", inPlay ? "opacity-100" : "opacity-30 grayscale")}
            >
              <RankBadge rank={rank} size={28} />
            </span>
            <span
              className={cn(
                "relative whitespace-nowrap text-[11px] font-bold transition-colors",
                selected ? "text-white" : "text-ash-400",
              )}
            >
              Round {n}
              <span className="sr-only">, {rank}-rank mission enters</span>
            </span>
            <ParticleBurst fire={selected ? tick : 0} palette="gold" count={14} spread={52} shape="star" ring={false} />
          </button>
        );
      })}
    </div>
  );
}

function PhaseCard({
  phase,
  index,
  round,
  rank,
  lesson,
  active,
  cycling,
  onActivate,
}: {
  phase: PhaseDef;
  index: number;
  round: number;
  rank: Rank;
  lesson: HubLesson | undefined;
  active: boolean;
  cycling: boolean;
  onActivate: () => void;
}) {
  const accent = ACCENT_STYLES[phase.accent];
  const text = phase.line(round, rank);
  const last = index === PHASES.length - 1;
  return (
    <motion.li
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 140, damping: 20, delay: index * 0.09 }}
      onPointerEnter={onActivate}
      onFocus={onActivate}
      className="relative"
      style={{ zIndex: PHASES.length - index }}
    >
      <div
        className={cn(
          "panel relative flex h-full flex-col overflow-hidden p-5 transition-[border-color,box-shadow] duration-500",
          active && cn(accent.border, accent.glow),
        )}
      >
        {active && (
          <motion.span
            layoutId="dojo-phase-glow"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-[radial-gradient(130%_75%_at_50%_0%,rgba(255,255,255,0.08),transparent_65%)]"
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          />
        )}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -right-5 -top-5 transition-opacity duration-500",
            accent.text,
            active ? "opacity-[0.14]" : "opacity-[0.05]",
          )}
        >
          <Emblem name={phase.emblem} size={110} />
        </span>

        <div className="relative flex items-center gap-3">
          <motion.span
            aria-hidden="true"
            animate={{ scale: active ? 1.08 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-shadow-900/80",
              accent.border,
              accent.text,
              active && accent.glow,
            )}
          >
            <Emblem name={phase.emblem} size={24} />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-shadow-950 text-[10.5px] font-black text-ash-100 ring-1 ring-white/15">
              {index + 1}
            </span>
          </motion.span>
          <div className="min-w-0">
            <p className={cn("eyebrow", accent.text)}>Phase {index + 1}</p>
            <h3 className="mt-0.5 text-lg font-black leading-tight tracking-tight text-white">{phase.name}</h3>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="relative mt-4 text-[13.5px] leading-relaxed text-ash-300"
          >
            {text}
          </motion.p>
        </AnimatePresence>

        {lesson && (
          <div className="relative mt-auto pt-4">
            <Link
              href={lessonHref(lesson.id)}
              className={cn(
                "group/lesson flex items-start gap-2 rounded-lg border-t border-white/[0.06] pt-3 text-[12.5px] font-bold outline-none transition-colors hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-chakra-300 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900",
                accent.text,
              )}
            >
              <Icon name="book" size={14} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="text-ash-500">Lesson {lesson.order} · </span>
                {lesson.title}
              </span>
              <Icon
                name="arrow-right"
                size={14}
                className="mt-0.5 shrink-0 transition-transform duration-300 group-hover/lesson:translate-x-1"
              />
            </Link>
          </div>
        )}

        {active && cycling && (
          <motion.span
            key={`timer-${index}`}
            aria-hidden="true"
            className={cn("absolute bottom-0 left-0 h-0.5 bg-gradient-to-r", accent.gradient)}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
          />
        )}
      </div>

      {!last && (
        <>
          {/* Flow arrows: down on phones, across on wide screens (the 2x2 tablet grid reads by number). */}
          <span
            aria-hidden="true"
            className="absolute -bottom-5 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-shadow-900 text-ash-400 ring-1 ring-white/10 sm:hidden"
          >
            <Icon name="chevron-down" size={14} />
          </span>
          <span
            aria-hidden="true"
            className="absolute -right-[18px] top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-shadow-900 text-ash-400 ring-1 ring-white/10 lg:flex"
          >
            <Icon name="chevron-right" size={14} />
          </span>
        </>
      )}
    </motion.li>
  );
}

/**
 * "A Round at a glance": the four phases of a Round, with a Round picker that
 * shows how the board grows from one D-rank mission to all four.
 */
export function RoundGlance({ lessons }: { lessons: readonly HubLesson[] }) {
  const calm = useCalmMotion();
  const [round, setRound] = useState(1);
  const [tick, setTick] = useState(0);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const inView = useInView(listRef, { margin: "-15% 0px" });
  const rank = RANK_ORDER[round - 1] ?? "D";
  const lessonById = (id: string) => lessons.find((l) => l.id === id);
  const setup = lessonById("deck-setup");
  const cycling = !calm && inView && !paused;

  // A highlight walks through the phases while the strip is on screen (paused on hover or focus).
  useEffect(() => {
    if (!cycling) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % PHASES.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [cycling]);

  const pick = (n: number) => {
    setRound(n);
    setTick((t) => t + 1);
  };

  return (
    <section aria-labelledby="dojo-round-title" className="relative pt-16 sm:pt-20">
      <SectionHeading
        id="dojo-round-title"
        eyebrow="A Round at a glance"
        eyebrowClassName="text-energy-300"
        title="Four phases, four Rounds"
        description="A game lasts exactly four Rounds and every Round runs the same loop. Pick a Round to see how the board grows; each phase links to the lesson that teaches it."
      />

      {setup && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
          className="mt-7"
        >
          <Link
            href={lessonHref(setup.id)}
            className="group flex items-center gap-3.5 rounded-2xl border border-dashed border-gold-400/25 bg-gold-400/[0.04] px-4 py-3 outline-none transition-colors duration-300 hover:border-gold-400/50 hover:bg-gold-400/[0.07] focus-visible:ring-2 focus-visible:ring-gold-300"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-400/40 bg-gold-400/10 text-gold-300"
            >
              <Emblem name={setup.emblem} size={18} />
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-snug text-ash-300">
              <span className="font-bold text-gold-200">Before Round 1, set up: </span>
              a random first player takes the Edge token, the 4-card Mission deck is built from both players&apos;
              missions, then each player draws 5 and may mulligan once.
            </span>
            <span className="hidden shrink-0 items-center gap-1 text-[12px] font-bold text-gold-300 min-[440px]:flex">
              Lesson {setup.order}
              <Icon name="arrow-right" size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 140, damping: 20, delay: 0.06 }}
        className="mt-3 flex flex-col gap-3 md:flex-row md:items-stretch"
      >
        <RoundPicker round={round} tick={tick} onPick={pick} />
        <div className="panel flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3">
          <span aria-hidden="true" className="flex h-10 shrink-0 items-center">
            <AnimatePresence initial={false}>
              {RANK_ORDER.slice(0, round).map((r, i) => (
                <motion.span
                  key={r}
                  className={cn("relative", i > 0 && "-ml-2")}
                  style={{ zIndex: i }}
                  initial={{ opacity: 0, scale: 0.3, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.3 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                >
                  <RankBadge rank={r} size={i === round - 1 ? 34 : 28} />
                </motion.span>
              ))}
            </AnimatePresence>
          </span>
          <p aria-live="polite" className="min-w-0 text-[13px] leading-snug text-ash-300">
            {roundSummary(round, rank)}
          </p>
        </div>
      </motion.div>

      <ol
        ref={listRef}
        aria-label={`The four phases of Round ${round}`}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(e) => {
          const next = e.relatedTarget;
          if (!(next instanceof Node) || !e.currentTarget.contains(next)) setPaused(false);
        }}
        className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3"
      >
        {PHASES.map((phase, i) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            index={i}
            round={round}
            rank={rank}
            lesson={lessonById(phase.lessonId)}
            active={i === active}
            cycling={cycling}
            onActivate={() => setActive(i)}
          />
        ))}
      </ol>
    </section>
  );
}
