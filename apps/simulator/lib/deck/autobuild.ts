import type { Deck } from "@naruto-tcg/types";
import { fullName, MAIN_DECK_TYPES } from "../cards/meta";
import type { SimCard } from "../cards/types";
import { getAbilities, matchesGroup, sameGroup } from "../game-engine/abilities";
import { FORMAT } from "../game-engine/format";

export interface AutoBuildSpec {
  id: string;
  name: string;
  description: string;
  leaderName?: string;
  groups: string[];
}

export const STARTER_SPECS: AutoBuildSpec[] = [
  { id: "starter-will-of-fire", name: "Will of Fire", description: "Leaf Village shinobi — Team 7 and friends.", leaderName: "Hiruzen Sarutobi", groups: ["Leaf Village"] },
  { id: "starter-sand-siblings", name: "Sand Siblings", description: "Gaara, Temari, Kankuro and the Sand Village.", leaderName: "Rasa", groups: ["Sand Village"] },
  { id: "starter-sound-of-the-snake", name: "Sound of the Snake", description: "Orochimaru and the Sound Village.", leaderName: "Orochimaru", groups: ["Sound Village"] },
  { id: "starter-akatsuki", name: "Akatsuki Shadows", description: "S-rank rogues of the Akatsuki.", leaderName: "Nagato", groups: ["Akatsuki"] },
  { id: "starter-rogue-ninja", name: "Rogue Ninja", description: "Independent shinobi and mercenaries.", leaderName: "A", groups: ["Independent"] },
];

function affinity(card: SimCard, groups: string[]): number {
  return groups.some((g) => matchesGroup(card, g)) ? 1 : 0;
}

/** Rough card quality: stat efficiency plus automated abilities. */
function quality(card: SimCard): number {
  const a = getAbilities(card);
  const abilities = a.triggered.length + a.auras.length + a.chakraBonus;
  if (card.type === "character") return card.power - card.cost * 0.85 + abilities * 0.9;
  return 1.2 + abilities * 0.6 - card.cost * 0.15;
}

/**
 * Deterministically builds a legal deck from any card pool, favouring the given groups.
 * Used for starter decks and the deck builder's Auto-Build.
 */
export function buildAutoDeck(pool: SimCard[], spec: AutoBuildSpec): Deck {
  const byId = (a: SimCard, b: SimCard) => a.id.localeCompare(b.id);
  const leaders = pool.filter((c) => c.type === "leader").sort(byId);
  const leader =
    leaders.find((c) => spec.leaderName && c.name.toLowerCase() === spec.leaderName.toLowerCase()) ??
    leaders.find((c) => affinity(c, spec.groups)) ??
    leaders[0];

  const groups = [...spec.groups];
  if (leader?.village && !groups.includes(leader.village)) groups.push(leader.village);

  const missions: SimCard[] = [];
  const missionPool = pool
    .filter((c) => c.type === "mission")
    .map((c) => {
      const a = getAbilities(c);
      const groupAura = a.auras.some((x) => x.kind === "mission-group" && groups.some((g) => sameGroup(g, x.group)));
      return { c, score: (groupAura ? 4 : 0) + affinity(c, groups) * 2 + a.triggered.length + c.points * 0.5 };
    })
    .sort((a, b) => b.score - a.score || byId(a.c, b.c));
  for (const { c } of missionPool) {
    if (missions.length >= FORMAT.missionCount) break;
    if (!missions.some((m) => m.name.toLowerCase() === c.name.toLowerCase())) missions.push(c);
  }

  const mainPool = pool.filter((c) => MAIN_DECK_TYPES.has(c.type));
  const versions = new Map<string, number>();
  for (const c of mainPool) if (c.type === "character" && affinity(c, groups)) versions.set(c.name, (versions.get(c.name) ?? 0) + 1);

  const ranked = mainPool
    .map((c) => ({
      c,
      score: affinity(c, groups) * 10 + quality(c) + ((versions.get(c.name) ?? 0) > 1 ? 1.5 : 0) + (c.type !== "character" ? 0.4 : 0),
    }))
    .sort((a, b) => b.score - a.score || byId(a.c, b.c));

  const counts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  let total = 0;
  let jutsu = 0;
  let items = 0;
  let expensive = 0;
  const caps = { jutsu: 6, items: 3, expensive: 6 };

  const tryAdd = (c: SimCard, maxCopies: number): boolean => {
    if (total >= FORMAT.mainDeckSize) return false;
    const key = fullName(c).toLowerCase();
    if ((nameCounts.get(key) ?? 0) >= Math.min(maxCopies, FORMAT.maxCopiesPerName)) return false;
    if (c.type === "jutsu" && jutsu >= caps.jutsu) return false;
    if (c.type === "item" && items >= caps.items) return false;
    if (c.cost >= 6 && expensive >= caps.expensive) return false;
    counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    total++;
    if (c.type === "jutsu") jutsu++;
    if (c.type === "item") items++;
    if (c.cost >= 6) expensive++;
    return true;
  };

  // Pass 1: on-theme cards. Pass 2: anything good. Pass 3: lift soft caps to guarantee 40 if the pool allows.
  for (const { c } of ranked) if (affinity(c, groups)) for (let i = 0; i < (c.cost >= 6 ? 2 : 3); i++) tryAdd(c, 3);
  for (const { c } of ranked) for (let i = 0; i < 2; i++) tryAdd(c, 2);
  caps.jutsu = caps.items = caps.expensive = Number.POSITIVE_INFINITY;
  for (const { c } of ranked) for (let i = 0; i < 3; i++) tryAdd(c, 3);

  const now = new Date(0).toISOString();
  const cards = [
    ...(leader ? [{ cardId: leader.id, quantity: 1 }] : []),
    ...missions.map((m) => ({ cardId: m.id, quantity: 1 })),
    ...[...counts.entries()].map(([cardId, quantity]) => ({ cardId, quantity })),
  ];
  return { id: spec.id, name: spec.name, description: spec.description, owner: "Starter", cards, createdAt: now, updatedAt: now };
}

const starterCache = new WeakMap<SimCard[], Deck[]>();

export function getStarterDecks(pool: SimCard[]): Deck[] {
  let decks = starterCache.get(pool);
  if (!decks) {
    decks = STARTER_SPECS.map((spec) => buildAutoDeck(pool, spec));
    starterCache.set(pool, decks);
  }
  return decks;
}

export function isStarterId(id: string): boolean {
  return STARTER_SPECS.some((s) => s.id === id);
}
