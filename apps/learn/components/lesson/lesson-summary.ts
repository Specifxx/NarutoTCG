import { lessonKeys } from "@/content/lessons";
import type { TutorialLesson } from "@/content/schema";
import type { LessonSummary } from "./types";

/**
 * Server-side helper: trims a lesson down to what the overview, pager and
 * mastery banner need, so client components never receive (or bundle) the
 * full lesson content for lessons they do not play.
 */
export function toLessonSummary(lesson: TutorialLesson): LessonSummary {
  return {
    id: lesson.id,
    order: lesson.order,
    title: lesson.title,
    subtitle: lesson.subtitle,
    emblem: lesson.emblem,
    accent: lesson.accent,
    estMinutes: lesson.estMinutes,
    stepCount: lesson.steps.length,
    quizCount: lesson.quiz.length,
    widgetTitle: lesson.widget.title,
    keys: lessonKeys(lesson.id),
  };
}
