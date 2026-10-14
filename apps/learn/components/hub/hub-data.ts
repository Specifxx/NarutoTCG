import { KEYWORDS } from "@/content/keywords";
import { LESSONS, lessonKeys } from "@/content/lessons";
import { PUZZLES, puzzleKey } from "@/content/puzzles";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import type { CardDef } from "@/lib/game/types";
import type { HubData } from "./types";

/** Glossary terms shown floating on the Keywords module card. */
const CHIP_IDS = ["ambush", "powerup", "exhaust", "score", "chakra-x", "hidden", "upgrade", "edge-token"];

/** Hero cards: a face-up ninja, an ambusher that flips, and a supporting medic. */
const HERO_CARD_IDS = ["naruto-genin", "kakashi-copy", "sakura-medic"];

/**
 * Server-side: trims lessons, puzzles and keywords down to what the Dojo hub
 * renders, so client components never bundle the full content.
 */
export function buildHubData(): HubData {
  return {
    lessons: LESSONS.map((l) => ({
      id: l.id,
      order: l.order,
      title: l.title,
      subtitle: l.subtitle,
      emblem: l.emblem,
      accent: l.accent,
      estMinutes: l.estMinutes,
      widgetTitle: l.widget.title,
      keys: lessonKeys(l.id),
    })),
    puzzles: [...PUZZLES]
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        id: p.id,
        order: p.order,
        title: p.title,
        difficulty: p.difficulty,
        emblem: p.emblem,
        key: puzzleKey(p.id),
      })),
    keywordKeys: KEYWORDS.map((k) => `keyword:${k.id}`),
    keywordChips: CHIP_IDS.flatMap((id) => {
      const k = KEYWORDS.find((x) => x.id === id);
      return k ? [{ id: k.id, term: k.term, category: k.category, platform: k.source.kind === "platform" }] : [];
    }),
    heroCards: HERO_CARD_IDS.map((id) => PRACTICE_CARDS[id]).filter((c): c is CardDef => Boolean(c)),
  };
}
