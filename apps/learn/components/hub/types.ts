import type { KeywordCategory } from "@/content/keywords";
import type { Accent } from "@/content/schema";
import type { PuzzleDifficulty } from "@/lib/game/puzzle";
import type { CardDef, EmblemName } from "@/lib/game/types";

/** What the Dojo needs to know about a lesson (built on the server, passed as props). */
export interface HubLesson {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  emblem: EmblemName;
  accent: Accent;
  estMinutes: number;
  widgetTitle: string;
  /** Progress award keys: Learn, Train and Test stars. */
  keys: { complete: string; widget: string; quiz: string };
}

export interface HubPuzzle {
  id: string;
  order: number;
  title: string;
  difficulty: PuzzleDifficulty;
  emblem: EmblemName;
  /** Progress award key granted when the puzzle is cleared. */
  key: string;
}

export interface HubKeywordChip {
  id: string;
  term: string;
  category: KeywordCategory;
  /** True for this platform's own shorthand (not printed on official cards). */
  platform: boolean;
}

export interface HubData {
  lessons: HubLesson[];
  puzzles: HubPuzzle[];
  /** Award keys for every glossary keyword (keyword:<id>). */
  keywordKeys: string[];
  /** A handful of glossary terms for the Keywords module art. */
  keywordChips: HubKeywordChip[];
  /** Practice cards floating in the hero: [face-up, ambusher, accent]. */
  heroCards: CardDef[];
}

export type LessonStatus = "todo" | "next" | "complete" | "mastered";
