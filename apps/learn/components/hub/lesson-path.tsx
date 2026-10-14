"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { Skeleton, StarGlyph } from "./primitives";
import type { LessonStatus } from "./types";
import { lessonHref, type HubProgress, type LessonProgress } from "./use-hub-progress";

const HEX = "[clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]";

const STATUS: Record<LessonStatus, { label: string; className: string; dot: string }> = {
  todo: { label: "Not started", className: "border-white/10 bg-white/[0.04] text-ash-400", dot: "bg-ash-500" },
  next: { label: "Next up", className: "border-chakra-400/40 bg-chakra-500/10 text-chakra-200", dot: "bg-chakra-400 animate-pulse" },
  complete: { label: "Complete", className: "border-leaf-400/40 bg-leaf-500/10 text-leaf-300", dot: "bg-leaf-400" },
  mastered: { label: "Mastered", className: "border-gold-400/50 bg-gold-400/10 text-gold-200", dot: "bg-gold-300" },
};

const STAR_NAMES = ["Learn", "Train", "Test"] as const;

function StatusPill({ status, hydrated }: { status: LessonStatus; hydrated: boolean }) {
  if (!hydrated) return <Skeleton className="h-5 w-20 rounded-full" />;
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap", s.className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function Stars({ row, hydrated }: { row: LessonProgress; hydrated: boolean }) {
  const earned = STAR_NAMES.filter((_, i) => row.stars[i]);
  return (
    <span className="flex items-center gap-0.5" title={hydrated ? `Stars: ${STAR_NAMES.join(", ")}` : undefined}>
      {row.stars.map((on, i) => (
        <StarGlyph key={i} filled={hydrated && on} size={14} />
      ))}
      <span className="sr-only">
        {hydrated
          ? `${row.starCount} of 3 stars${earned.length ? ` (${earned.join(", ")})` : ""}`
          : "Stars loading"}
      </span>
    </span>
  );
}

function Node({ row, hydrated }: { row: LessonProgress; hydrated: boolean }) {
  const accent = ACCENT_STYLES[row.lesson.accent];
  const lit = hydrated && row.complete;
  const next = hydrated && row.status === "next";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110",
        lit ? "text-shadow-950" : accent.text,
      )}
    >
      {next && <span className="absolute -inset-2 animate-pulse-glow rounded-full bg-chakra-400/35" />}
      <span className={cn("absolute inset-0 bg-gradient-to-br", HEX, lit || next ? accent.gradient : "from-shadow-600 to-shadow-700")} />
      {!lit && <span className={cn("absolute inset-[2px] bg-shadow-900", HEX)} />}
      <Emblem name={row.lesson.emblem} size={22} className="relative" />
      {hydrated && row.status === "mastered" && (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-300 text-shadow-950 ring-2 ring-shadow-900">
          <Icon name="check" size={11} strokeWidth={3.2} />
        </span>
      )}
    </span>
  );
}

/** The five lessons as a timeline with status and stars. */
export function LessonPath({ progress }: { progress: HubProgress }) {
  const { hydrated, lessons } = progress;
  const lastDone = hydrated ? lessons.reduce((last, r, i) => (r.complete ? i : last), -1) : -1;
  const fill = lessons.length > 1 && lastDone > 0 ? lastDone / (lessons.length - 1) : 0;

  return (
    <motion.section
      aria-labelledby="dojo-path-title"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.08 }}
      className="panel relative overflow-hidden p-5 sm:p-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(255,122,26,0.18),transparent)] blur-2xl"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow text-chakra-300">Your path</p>
          <h3 id="dojo-path-title" className="mt-1 text-2xl font-black tracking-tight text-white">
            Five lessons, fifteen stars
          </h3>
        </div>
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ash-400">
          <StarGlyph filled size={14} />
          {hydrated ? (
            <span className="tabular-nums">
              <span className="text-ash-100">{progress.stars}</span>/{progress.maxStars} stars
            </span>
          ) : (
            <Skeleton className="h-3.5 w-16" />
          )}
        </p>
      </div>

      <ol className="relative mt-5">
        <span aria-hidden="true" className="absolute bottom-8 left-[23px] top-8 w-0.5 rounded-full bg-white/[0.08]">
          <motion.span
            className="absolute inset-x-0 top-0 rounded-full bg-gradient-to-b from-chakra-300 via-gold-400 to-leaf-400 shadow-[0_0_10px_rgba(255,122,26,0.6)]"
            initial={false}
            animate={{ height: `${fill * 100}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 20 }}
          />
        </span>
        {lessons.map((row, i) => (
          <motion.li
            key={row.lesson.id}
            className="relative"
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.1 + i * 0.07 }}
          >
            <Link
              href={lessonHref(row.lesson.id)}
              className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-2.5 outline-none transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-chakra-300"
            >
              <Node row={row} hydrated={hydrated} />
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.16em] text-ash-500">
                  Lesson {row.lesson.order} · {row.lesson.estMinutes} min
                </span>
                <span className="mt-0.5 block font-bold leading-snug text-white transition-colors group-hover:text-chakra-100 sm:truncate">
                  {row.lesson.title}
                </span>
                <span className="mt-0.5 hidden truncate text-[12.5px] text-ash-400 sm:block">
                  Mini-game: {row.lesson.widgetTitle}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
                  <StatusPill status={row.status} hydrated={hydrated} />
                  <Stars row={row} hydrated={hydrated} />
                </span>
              </span>
              <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                <StatusPill status={row.status} hydrated={hydrated} />
                <Stars row={row} hydrated={hydrated} />
              </span>
              <Icon
                name="chevron-right"
                size={16}
                className="hidden shrink-0 text-ash-500 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-chakra-300 min-[400px]:block"
              />
            </Link>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}
