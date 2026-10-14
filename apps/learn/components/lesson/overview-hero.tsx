"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { LessonMedallion } from "./lesson-medallion";
import { ProgressRing } from "./progress-ring";
import { StarGlyph } from "./stage-stars";
import type { LessonSummary } from "./types";
import { lessonHref, usePathProgress } from "./use-lesson-progress";

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

/** How-to-Play hero: pitch, totals, a resume CTA and the learner's star tally. */
export function OverviewHero({ lessons }: { lessons: readonly LessonSummary[] }) {
  const p = usePathProgress(lessons);
  const totalMinutes = lessons.reduce((n, l) => n + l.estMinutes, 0);
  const totalSteps = lessons.reduce((n, l) => n + l.stepCount, 0);
  const first = lessons[0];

  let cta: { href: string; label: string } = { href: first ? lessonHref(first.id) : "/how-to-play", label: "Start lesson 1" };
  if (p.resume && p.totalStars > 0) {
    cta = { href: lessonHref(p.resume.lesson.id, p.resume.stage), label: `Continue · Lesson ${p.resume.lesson.order}` };
  } else if (p.hydrated && !p.resume && lessons.length > 0) {
    cta = { href: "/puzzles", label: "Take on Lethal Puzzles" };
  }

  return (
    <section aria-labelledby="how-to-play-title" className="relative pb-8 pt-12 sm:pt-16 lg:pt-20">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <motion.div className="min-w-0" variants={container} initial="hidden" animate="show">
          <motion.p variants={item} className="eyebrow flex items-center gap-2.5 text-chakra-300">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-chakra-400" aria-hidden="true" />
            <Icon name="book" size={14} />
            Rulebook · {lessons.length} lessons
          </motion.p>
          <motion.h1
            id="how-to-play-title"
            variants={item}
            className="mt-4 text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            How to <span className="text-chakra-gradient">Play</span>
          </motion.h1>
          <motion.p variants={item} className="mt-3 text-xl font-bold text-ash-200 sm:text-2xl">
            Lead your village as its Kage.
          </motion.p>
          <motion.p variants={item} className="mt-5 max-w-xl text-base leading-relaxed text-ash-400 sm:text-lg">
            Five short, animated lessons take you from shuffling your first deck to stealing a Round with the Edge token. Each
            one ends with a hands-on training drill and a quick checkpoint. Earn all three stars to master it.
          </motion.p>
          <motion.ul variants={item} className="mt-6 flex flex-wrap gap-2" aria-label="Course overview">
            <StatChip icon="clock">{totalMinutes} min total</StatChip>
            <StatChip icon="layers">
              {lessons.length} lessons · {totalSteps} steps
            </StatChip>
            <StatChip icon="target">{lessons.length} training drills</StatChip>
            <StatChip icon="sparkles">{p.maxXp.toLocaleString("en-US")} XP to earn</StatChip>
          </motion.ul>
          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href={cta.href} size="lg">
              <Icon name="play" size={16} />
              {cta.label}
            </ButtonLink>
            <a href="#round-at-a-glance" className={buttonClasses("secondary", "lg")}>
              <Icon name="rotate" size={16} />
              Round at a glance
            </a>
          </motion.div>
        </motion.div>

        <motion.aside
          aria-labelledby="path-progress-title"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.25 }}
          className="panel relative mx-auto w-full max-w-sm overflow-hidden p-5 sm:p-6 lg:mx-0 lg:max-w-none"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(245,197,66,0.35), transparent 70%)" }}
          />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-10 text-white/[0.035]">
            <Emblem name="shuriken" size={180} className="animate-spin-slow" />
          </span>

          <div className="relative flex items-center justify-between gap-3">
            <p id="path-progress-title" className="eyebrow text-gold-300">
              Your progress
            </p>
            <span className="text-[11px] font-semibold text-ash-500">Saved on this device</span>
          </div>

          <div className="relative mt-4 flex items-center gap-5">
            <ProgressRing
              value={p.hydrated ? p.totalStars / Math.max(1, p.maxStars) : 0}
              size={132}
              stroke={9}
              label={p.hydrated ? `${p.totalStars} of ${p.maxStars} stars earned` : "Progress loading"}
            >
              <StarGlyph filled size={18} />
              <span className="mt-0.5 text-3xl font-black leading-none tabular-nums text-white">
                <AnimatedNumber value={p.totalStars} />
                <span className="text-base font-bold text-ash-500">/{p.maxStars}</span>
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ash-400">stars</span>
            </ProgressRing>
            <dl className="min-w-0 space-y-3">
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ash-500">Mastered</dt>
                <dd className="text-xl font-black tabular-nums text-white">
                  <AnimatedNumber value={p.masteredCount} />
                  <span className="text-sm font-bold text-ash-500"> / {lessons.length}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ash-500">Lesson XP</dt>
                <dd className="text-xl font-black tabular-nums text-gold-200">
                  <AnimatedNumber value={p.xpEarned} />
                  <span className="text-sm font-bold text-ash-500"> / {p.maxXp}</span>
                </dd>
              </div>
            </dl>
          </div>

          <ol className="relative mt-5 grid grid-cols-5 gap-1.5 border-t border-white/5 pt-4" aria-label="Stars per lesson">
            {lessons.map((l, i) => {
              const s = p.stars[i]!;
              return (
                <li key={l.id}>
                  <Link
                    href={lessonHref(l.id)}
                    aria-label={`Lesson ${l.order}: ${l.title}${p.hydrated ? `, ${s.count} of 3 stars` : ""}`}
                    className="group flex flex-col items-center gap-1.5 rounded-lg py-1 transition hover:bg-white/[0.04]"
                  >
                    <LessonMedallion
                      emblem={l.emblem}
                      accent={l.accent}
                      size="sm"
                      mastered={s.mastered}
                      className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105"
                    />
                    <span className="flex gap-px" aria-hidden="true">
                      {s.earned.map((e, j) => (
                        <StarGlyph key={j} filled={e} size={9} className={cn(!e && "text-white/25")} />
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </motion.aside>
      </div>
    </section>
  );
}
