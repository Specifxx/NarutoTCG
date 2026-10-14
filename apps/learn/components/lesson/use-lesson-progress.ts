"use client";

import { useMemo } from "react";
import { useProgress, XP } from "@/lib/progress";
import { STAGES, stageKeys, type LessonKeys, type LessonStatus, type LessonSummary, type Stage } from "./types";

/** Max XP a single lesson awards (Learn + Train + Test). */
export const LESSON_XP = XP.lessonComplete + XP.widgetComplete + XP.quizPerfect;
const STAGE_XP = [XP.lessonComplete, XP.widgetComplete, XP.quizPerfect] as const;

export interface LessonStars {
  hydrated: boolean;
  /** Learn, Train, Test (all false until hydrated). */
  earned: readonly [boolean, boolean, boolean];
  count: number;
  mastered: boolean;
  xpEarned: number;
  /** First stage without a star, or null when mastered. */
  nextStage: Stage | null;
}

function starsFor(keys: LessonKeys, hydrated: boolean, has: (key: string) => boolean): LessonStars {
  const [c, w, q] = stageKeys(keys);
  const earned = [hydrated && has(c), hydrated && has(w), hydrated && has(q)] as const;
  const count = earned.filter(Boolean).length;
  const firstMissing = earned.findIndex((e) => !e);
  return {
    hydrated,
    earned,
    count,
    mastered: count === 3,
    xpEarned: earned.reduce((sum, e, i) => sum + (e ? STAGE_XP[i]! : 0), 0),
    nextStage: firstMissing === -1 ? null : STAGES[firstMissing]!.id,
  };
}

/** Stars earned for one lesson. Everything reads as unearned until progress has hydrated. */
export function useLessonStars(keys: LessonKeys): LessonStars {
  const { hydrated, has } = useProgress();
  return useMemo(() => starsFor(keys, hydrated, has), [keys, hydrated, has]);
}

export interface PathProgress {
  hydrated: boolean;
  stars: LessonStars[];
  statuses: LessonStatus[];
  totalStars: number;
  maxStars: number;
  masteredCount: number;
  xpEarned: number;
  maxXp: number;
  /** Where "Continue" should take the learner, or null when every lesson is mastered. */
  resume: { lesson: LessonSummary; stage: Stage } | null;
}

/**
 * Progress across every lesson. "Next up" is the first lesson whose Learn
 * stage is unfinished; nothing is ever locked.
 */
export function usePathProgress(lessons: readonly LessonSummary[]): PathProgress {
  const { hydrated, has } = useProgress();
  return useMemo(() => {
    const stars = lessons.map((l) => starsFor(l.keys, hydrated, has));
    const nextIdx = hydrated ? stars.findIndex((s) => !s.earned[0]) : -1;
    const statuses = stars.map((s, i): LessonStatus => {
      if (s.mastered) return "mastered";
      if (s.earned[0]) return "complete";
      return i === nextIdx ? "next" : "todo";
    });
    const resumeIdx = nextIdx !== -1 ? nextIdx : stars.findIndex((s) => !s.mastered);
    const resumeStars = stars[resumeIdx];
    return {
      hydrated,
      stars,
      statuses,
      totalStars: stars.reduce((n, s) => n + s.count, 0),
      maxStars: lessons.length * 3,
      masteredCount: stars.filter((s) => s.mastered).length,
      xpEarned: stars.reduce((n, s) => n + s.xpEarned, 0),
      maxXp: lessons.length * LESSON_XP,
      resume:
        hydrated && resumeIdx !== -1 && resumeStars
          ? { lesson: lessons[resumeIdx]!, stage: resumeStars.nextStage ?? "learn" }
          : null,
    };
  }, [lessons, hydrated, has]);
}

/** Lesson URL (without the /learn base path), optionally deep-linked to a stage. */
export const lessonHref = (id: string, stage?: Stage) =>
  stage && stage !== "learn" ? `/how-to-play/${id}?stage=${stage}` : `/how-to-play/${id}`;
