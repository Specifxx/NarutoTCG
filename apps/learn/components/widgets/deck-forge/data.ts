import { PRACTICE_CARDS, PRACTICE_MISSIONS, type PracticeMissionId } from "@/lib/game/cards";
import type { CardDef } from "@/lib/game/types";

/** Deck rules (rulebook, "How to build your first deck"). */
export const DECK_MIN = 30;
export const COPY_LIMIT = 2;
export const MISSIONS_NEEDED = 3;
/** The + stepper stops one past the limit, so you can see the violation. */
export const STEPPER_MAX = COPY_LIMIT + 1;
export const HAND_SIZE = 5;

/** Every practice card version in set order. A version is set + number. */
export const CARD_IDS: readonly string[] = Object.keys(PRACTICE_CARDS);
export const MISSION_IDS = Object.keys(PRACTICE_MISSIONS) as PracticeMissionId[];

export const cardOf = (id: string): CardDef => {
  const card = PRACTICE_CARDS[id];
  if (!card) throw new Error(`Unknown practice card "${id}"`);
  return card;
};

/** Practice-set collector number, e.g. "PR 01/20". */
export function versionCode(id: string): string {
  const n = CARD_IDS.indexOf(id) + 1;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `PR ${pad(n)}/${pad(CARD_IDS.length)}`;
}

/**
 * The broken decklist you start with: 27 cards (3 short), three copies of
 * Naruto Uzumaki · Genin of the Leaf (one over the limit), and only 2 Missions.
 */
export const INITIAL_COUNTS: Readonly<Record<string, number>> = {
  "naruto-genin": 3,
  "naruto-sage": 2,
  "kakashi-copy": 2,
  "sakura-medic": 2,
  "sasuke-avenger": 2,
  "hinata-byakugan": 2,
  "shikamaru-shadow": 2,
  "rock-lee": 2,
  "choji-akimichi": 2,
  "ino-yamanaka": 2,
  "neji-gentle-fist": 2,
  "temari-wind": 2,
  "tsunade-hokage": 1,
  "gaara-sand": 1,
};

export const INITIAL_MISSIONS: readonly PracticeMissionId[] = ["catch-tora", "bridge-escort"];

/** Rows shown in the decklist from the start, in set order. */
export const INITIAL_ROWS: readonly string[] = CARD_IDS.filter((id) => (INITIAL_COUNTS[id] ?? 0) > 0);

/** A legal reference deck, used for the ritual when you revisit with an unfixed list. */
export const SAMPLE_COUNTS: Readonly<Record<string, number>> = {
  ...INITIAL_COUNTS,
  "naruto-genin": 2,
  "tsunade-hokage": 2,
  "gaara-sand": 2,
  "kisame-shark": 1,
  "haku-ice": 1,
};
export const SAMPLE_MISSIONS: readonly PracticeMissionId[] = ["catch-tora", "bridge-escort", "find-tsunade"];

export interface DeckCheck {
  total: number;
  /** Versions over the copy limit. */
  over: string[];
  sizeOk: boolean;
  copiesOk: boolean;
  missionsOk: boolean;
  legal: boolean;
  problems: number;
}

export function checkDeck(counts: Readonly<Record<string, number>>, missions: readonly PracticeMissionId[]): DeckCheck {
  const total = CARD_IDS.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const over = CARD_IDS.filter((id) => (counts[id] ?? 0) > COPY_LIMIT);
  const sizeOk = total >= DECK_MIN;
  const copiesOk = over.length === 0;
  const missionsOk = new Set(missions).size === MISSIONS_NEEDED;
  return {
    total,
    over,
    sizeOk,
    copiesOk,
    missionsOk,
    legal: sizeOk && copiesOk && missionsOk,
    problems: [sizeOk, copiesOk, missionsOk].filter((ok) => !ok).length,
  };
}

/** Names with two or more versions in the deck, e.g. Naruto Genin + Naruto Sage Mode. */
export function sharedNames(
  counts: Readonly<Record<string, number>>,
): Array<{ name: string; versions: Array<{ id: string; count: number }> }> {
  const groups = new Map<string, Array<{ id: string; count: number }>>();
  for (const id of CARD_IDS) {
    const count = counts[id] ?? 0;
    if (count <= 0) continue;
    const name = cardOf(id).name;
    groups.set(name, [...(groups.get(name) ?? []), { id, count }]);
  }
  return [...groups.entries()].filter(([, v]) => v.length > 1).map(([name, versions]) => ({ name, versions }));
}

/** Expands counts into a flat list of card ids (the physical deck). */
export function expandDeck(counts: Readonly<Record<string, number>>): string[] {
  return CARD_IDS.flatMap((id) => Array.from({ length: counts[id] ?? 0 }, () => id));
}

/** Fisher-Yates shuffle. Only call from event handlers or effects. */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
