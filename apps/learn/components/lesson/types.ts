import type { IconName } from "@/components/ui/icon";
import type { Accent } from "@/content/schema";
import type { EmblemName } from "@/lib/game/types";

/** XP-award keys for one lesson (see `lessonKeys` in content/lessons). */
export interface LessonKeys {
  complete: string;
  widget: string;
  quiz: string;
}

/** The slice of a lesson that overview and navigation UI needs. */
export interface LessonSummary {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  emblem: EmblemName;
  accent: Accent;
  estMinutes: number;
  stepCount: number;
  quizCount: number;
  widgetTitle: string;
  keys: LessonKeys;
}

/** The three stages of a lesson; each one earns a star. */
export type Stage = "learn" | "train" | "test";

export interface StageDef {
  id: Stage;
  label: string;
  hint: string;
  icon: IconName;
}

export const STAGES: readonly StageDef[] = [
  { id: "learn", label: "Learn", hint: "Animated steps", icon: "book" },
  { id: "train", label: "Train", hint: "Mini-widget", icon: "target" },
  { id: "test", label: "Test", hint: "Checkpoint", icon: "flag" },
];

export const stageIndex = (stage: Stage) => STAGES.findIndex((s) => s.id === stage);

export const isStage = (value: unknown): value is Stage => value === "learn" || value === "train" || value === "test";

/** Where a learner progress status sits on the Path of the Ninja. */
export type LessonStatus = "mastered" | "complete" | "next" | "todo";

/** Award key for each stage, in stage order. */
export const stageKeys = (keys: LessonKeys): readonly [string, string, string] => [keys.complete, keys.widget, keys.quiz];

/** Hex clip-path shared by medallions. */
export const HEX_CLIP = "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

/** Removes characters React ids may contain that are awkward inside `url(#…)`. */
export const svgId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, "");
