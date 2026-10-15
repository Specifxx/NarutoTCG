"use client";

import { useMemo } from "react";
import { useProgress, type RankInfo } from "@/lib/progress";
import type { HubData, HubLesson, LessonStatus } from "./types";

export interface LessonProgress {
  lesson: HubLesson;
  /** Learn, Train, Test. */
  stars: readonly [boolean, boolean, boolean];
  starCount: number;
  complete: boolean;
  status: LessonStatus;
}

export interface HubProgress {
  /** False until saved progress has been read; every count reads 0 until then. */
  hydrated: boolean;
  xp: number;
  rank: RankInfo;
  lessons: LessonProgress[];
  lessonsComplete: number;
  stars: number;
  maxStars: number;
  puzzlesCleared: readonly boolean[];
  puzzleCount: number;
  keywordsExplored: number;
  keywordTotal: number;
  /** First lesson whose Learn stage is unfinished (null before hydration or once all are complete). */
  nextLesson: HubLesson | null;
  /** True once hydrated and every lesson's Learn stage is complete. */
  allLessonsComplete: boolean;
}

/** Everything the Dojo shows about the learner, derived from the XP award ledger. */
export function useHubProgress(data: Pick<HubData, "lessons" | "puzzles" | "keywordKeys">): HubProgress {
  const { hydrated, has, xp, rank } = useProgress();
  const { lessons, puzzles, keywordKeys } = data;

  return useMemo(() => {
    const own = (key: string) => hydrated && has(key);
    const nextIdx = hydrated ? lessons.findIndex((l) => !has(l.keys.complete)) : -1;
    const lessonRows = lessons.map((lesson, i): LessonProgress => {
      const stars = [own(lesson.keys.complete), own(lesson.keys.widget), own(lesson.keys.quiz)] as const;
      const starCount = stars.filter(Boolean).length;
      const complete = stars[0];
      const status: LessonStatus = starCount === 3 ? "mastered" : complete ? "complete" : i === nextIdx ? "next" : "todo";
      return { lesson, stars, starCount, complete, status };
    });
    const puzzlesCleared = puzzles.map((p) => own(p.key));
    const lessonsComplete = lessonRows.filter((r) => r.complete).length;
    return {
      hydrated,
      xp: hydrated ? xp : 0,
      rank,
      lessons: lessonRows,
      lessonsComplete,
      stars: lessonRows.reduce((n, r) => n + r.starCount, 0),
      maxStars: lessons.length * 3,
      puzzlesCleared,
      puzzleCount: puzzles.length,
      keywordsExplored: keywordKeys.filter(own).length,
      keywordTotal: keywordKeys.length,
      nextLesson: nextIdx === -1 ? null : (lessons[nextIdx] ?? null),
      allLessonsComplete: hydrated && lessons.length > 0 && lessonsComplete === lessons.length,
    };
  }, [hydrated, has, xp, rank, lessons, puzzles, keywordKeys]);
}

/** Lesson URL without the /learn base path. */
export const lessonHref = (id: string) => `/how-to-play/${id}`;
