"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import type { TutorialLesson } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { LessonMedallion } from "./lesson-medallion";
import { StageStars } from "./stage-stars";
import { LESSON_XP, type LessonStars } from "./use-lesson-progress";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 22 } },
};

function MetaChip({ icon, children, className }: { icon: IconName; children: ReactNode; className?: string }) {
  return (
    <li
      className={cn(
        "flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] font-semibold text-ash-200",
        className,
      )}
    >
      <Icon name={icon} size={14} className="shrink-0 text-ash-400" />
      {children}
    </li>
  );
}

/** Lesson hero: breadcrumb, accent glow, medallion, title, meta and the three stage stars. */
export function LessonHeader({ lesson, total, stars }: { lesson: TutorialLesson; total: number; stars: LessonStars }) {
  const a = ACCENT_STYLES[lesson.accent];
  return (
    <header className="relative pt-6 sm:pt-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-72 max-w-3xl rounded-full opacity-45 blur-3xl"
        style={{ background: `radial-gradient(ellipse at center, ${a.hex[1]}70 0%, ${a.hex[2]}30 40%, transparent 72%)` }}
      />

      <motion.nav
        aria-label="Breadcrumb"
        className="relative"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <ol className="flex flex-wrap items-center gap-1 text-[13px] font-semibold text-ash-400">
          <li>
            <Link
              href="/how-to-play"
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition hover:text-white"
            >
              <Icon name="book" size={14} />
              How to Play
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon name="chevron-right" size={13} className="text-ash-500" />
          </li>
          <li>
            <span aria-current="page" className={cn("px-1", a.text)}>
              Lesson {lesson.order}
            </span>
          </li>
        </ol>
      </motion.nav>

      <div className="relative mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <motion.div
          className="w-fit"
          initial={{ scale: 0.5, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.05 }}
        >
          <LessonMedallion
            emblem={lesson.emblem}
            accent={lesson.accent}
            order={lesson.order}
            size="xl"
            glow
            mastered={stars.mastered}
          />
        </motion.div>

        <motion.div className="min-w-0 flex-1" variants={container} initial="hidden" animate="show">
          <motion.p variants={item} className={cn("eyebrow", a.text)}>
            Lesson {lesson.order} of {total}
          </motion.p>
          <motion.h1
            variants={item}
            className="mt-2 text-balance text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl"
          >
            {lesson.title}
          </motion.h1>
          <motion.p variants={item} className="mt-3 text-base font-medium text-ash-200 sm:text-lg">
            {lesson.subtitle}
          </motion.p>
          <motion.div variants={item}>
            <RichText as="p" text={lesson.summary} className="mt-2 max-w-2xl text-sm leading-relaxed text-ash-400 sm:text-[15px]" />
          </motion.div>
        </motion.div>
      </div>

      <motion.ul
        aria-label="Lesson details"
        className="relative mt-6 flex flex-wrap items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.35 }}
      >
        <MetaChip icon="clock">{lesson.estMinutes} min</MetaChip>
        <MetaChip icon="layers">{lesson.steps.length} steps</MetaChip>
        <MetaChip icon="sparkles" className="border-gold-400/20 bg-gold-400/[0.06] text-gold-200">
          {stars.hydrated && stars.xpEarned > 0 ? (
            <span>
              {stars.xpEarned}
              <span className="text-gold-200/60"> / {LESSON_XP} XP</span>
            </span>
          ) : (
            <span>{LESSON_XP} XP available</span>
          )}
        </MetaChip>
        <li className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-3 pr-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ash-500">Stars</span>
          <StageStars earned={stars.earned} hydrated={stars.hydrated} size={17} />
        </li>
        {stars.mastered && (
          <motion.li
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold-300 to-gold-500 px-3 text-[12px] font-black uppercase tracking-[0.12em] text-shadow-950 shadow-[0_0_24px_-6px_rgba(245,197,66,0.8)]"
          >
            <Icon name="trophy" size={14} strokeWidth={2.4} />
            Mastered
          </motion.li>
        )}
      </motion.ul>
    </header>
  );
}
