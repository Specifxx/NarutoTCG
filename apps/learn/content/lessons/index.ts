import { PRACTICE_CARDS } from "@/lib/game/cards";
import { parseLesson, type TutorialLesson } from "../schema";
import deckSetup from "./01-deck-setup.json";
import chargingChakra from "./02-charging-chakra.json";
import summoningAndHidden from "./03-summoning-and-hidden-cards.json";
import combatAndMissions from "./04-combat-and-missions.json";
import theEdgeToken from "./05-the-edge-token.json";

const KNOWN_CARDS = new Set(Object.keys(PRACTICE_CARDS));

const RAW: ReadonlyArray<[file: string, raw: unknown]> = [
  ["01-deck-setup.json", deckSetup],
  ["02-charging-chakra.json", chargingChakra],
  ["03-summoning-and-hidden-cards.json", summoningAndHidden],
  ["04-combat-and-missions.json", combatAndMissions],
  ["05-the-edge-token.json", theEdgeToken],
];

/** All lessons, validated at module load (i.e. at build time) and sorted by order. */
export const LESSONS: readonly TutorialLesson[] = RAW.map(([file, raw]) => parseLesson(raw, file, KNOWN_CARDS)).sort(
  (a, b) => a.order - b.order,
);

export function getLesson(id: string): TutorialLesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonNeighbors(id: string): { prev?: TutorialLesson; next?: TutorialLesson } {
  const i = LESSONS.findIndex((l) => l.id === id);
  return { prev: LESSONS[i - 1], next: LESSONS[i + 1] };
}

/** XP-award keys for a lesson. */
export const lessonKeys = (id: string) => ({
  complete: `lesson:${id}:complete`,
  widget: `lesson:${id}:widget`,
  quiz: `lesson:${id}:quiz`,
});
