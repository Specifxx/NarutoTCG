"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { RankBadge } from "@/components/game/mission-card";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { RANK_ORDER, type EmblemName } from "@/lib/game/types";
import type { LessonSummary } from "./types";
import { lessonHref } from "./use-lesson-progress";

interface PhaseDef {
  id: string;
  name: string;
  emblem: EmblemName;
  lessonId: string;
  text: string;
}

const PHASES: readonly PhaseDef[] = [
  {
    id: "start",
    name: "Start",
    emblem: "chakra",
    lessonId: "charging-chakra",
    text: "Reveal the next mission. Gain 5 Chakra plus 1 for each character you have in play, then draw 2.",
  },
  {
    id: "action",
    name: "Action",
    emblem: "kunai",
    lessonId: "summoning-and-hidden-cards",
    text: "The Edge holder goes first. Each turn, play one card (face-up, hidden, reveal or upgrade) or pass.",
  },
  {
    id: "mission",
    name: "Mission evaluation",
    emblem: "target",
    lessonId: "combat-and-missions",
    text: "Score missions D → C → B → A. Most Power wins (at least 1 needed); ties go to the Edge holder.",
  },
  {
    id: "end",
    name: "End",
    emblem: "edge",
    lessonId: "the-edge-token",
    text: "Discard leftover Chakra and Power tokens. After Round 4, the most Mission points wins.",
  },
];

/** Compact Start → Action → Mission evaluation → End strip linking each phase to its lesson. */
export function RoundAtAGlance({ lessons }: { lessons: readonly LessonSummary[] }) {
  const setup = lessons.find((l) => l.id === "deck-setup") ?? lessons[0];
  return (
    <section id="round-at-a-glance" aria-labelledby="round-glance-title" className="relative pt-20 sm:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ type: "spring", stiffness: 140, damping: 22 }}
        className="panel relative overflow-hidden p-5 sm:p-7"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,122,26,0.3), transparent 70%)" }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow flex items-center gap-2 text-chakra-300">
              <Icon name="rotate" size={13} />
              Round at a glance
            </p>
            <h2 id="round-glance-title" className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Four phases, four Rounds
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ash-400 sm:text-[15px]">
              A game lasts exactly four Rounds and every Round runs the same loop. Tap a phase to open the lesson that
              covers it.
            </p>
          </div>
          {setup && (
            <Link
              href={lessonHref(setup.id)}
              className="group flex w-fit items-center gap-2.5 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-[13px] transition hover:border-white/30 hover:bg-white/[0.06]"
            >
              <Icon name="flag" size={15} className={ACCENT_STYLES[setup.accent].text} />
              <span className="text-ash-300">
                Before Round 1: <span className="font-bold text-white">deck &amp; setup</span>
              </span>
              <span className={cn("font-semibold", ACCENT_STYLES[setup.accent].text)}>Lesson {setup.order}</span>
              <Icon name="arrow-right" size={14} className="text-ash-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        <ol className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {PHASES.map((phase, i) => {
            const lesson = lessons.find((l) => l.id === phase.lessonId);
            const accent = ACCENT_STYLES[lesson?.accent ?? "chakra"];
            return (
              <motion.li
                key={phase.id}
                className="relative"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ type: "spring", stiffness: 160, damping: 20, delay: i * 0.08 }}
              >
                <Link
                  href={lesson ? lessonHref(lesson.id) : "/how-to-play"}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-shadow-900/70 p-4 transition duration-300 hover:-translate-y-1 hover:bg-shadow-800/80 focus:outline-none focus-visible:ring-2",
                    accent.ring,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-0.5 opacity-70 transition-opacity group-hover:opacity-100"
                    style={{ background: `linear-gradient(90deg, ${accent.hex[2]}, ${accent.hex[1]}, transparent)` }}
                  />
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110",
                        accent.border,
                        accent.softBg,
                      )}
                    >
                      <Emblem name={phase.emblem} size={22} className={accent.text} />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-shadow-900 bg-white text-[10px] font-black text-shadow-950">
                        {i + 1}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <span className="eyebrow block text-ash-500">Phase {i + 1}</span>
                      <h3 className="text-base font-black leading-tight text-white">{phase.name}</h3>
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ash-300">{phase.text}</p>
                  {lesson && (
                    <span className={cn("mt-3 flex items-center gap-1.5 text-xs font-bold", accent.text)}>
                      <span className="shrink-0">Lesson {lesson.order} ·</span> <span className="min-w-0 truncate">{lesson.title}</span>
                      <Icon name="arrow-right" size={13} className="shrink-0 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </Link>
                {i < PHASES.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-[20px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-shadow-950 text-ash-300 lg:flex"
                  >
                    <Icon name="chevron-right" size={13} strokeWidth={2.4} />
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>

        <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-[13px] text-ash-400">
          <span className="flex items-center gap-2 font-semibold text-ash-200">
            <Icon name="refresh" size={15} className="text-chakra-300" />
            Repeat × 4
          </span>
          <span role="img" className="flex items-center gap-1.5" aria-label="A new mission joins each Round: D, then C, then B, then A">
            {RANK_ORDER.map((r, i) => (
              <span key={r} className="flex items-center gap-1.5" aria-hidden="true">
                <RankBadge rank={r} size={22} />
                {i < RANK_ORDER.length - 1 && <Icon name="chevron-right" size={11} className="text-ash-500" />}
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1 basis-56">
            A new mission joins every Round, so Round 4 scores all four. Most Mission points after Round 4 wins; a tie
            goes to the Edge holder.
          </span>
        </div>
      </motion.div>
    </section>
  );
}
