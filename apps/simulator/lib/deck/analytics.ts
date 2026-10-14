import type { Deck } from "@naruto-tcg/types";
import { ELEMENT_META, ELEMENTS } from "../cards/meta";
import type { CardDb, Element, SimCard } from "../cards/types";
import { getAbilities } from "../game-engine/abilities";
import { splitDeck } from "./deck";

export const CURVE_MAX = 7;

export interface CurveBucket {
  cost: number;
  label: string;
  character: number;
  jutsu: number;
  item: number;
  total: number;
}

export interface CostCurve {
  buckets: CurveBucket[];
  average: number;
  peak: number;
}

/** Main-deck cost histogram; the last bucket is "7+". */
export function costCurve(deck: Deck, db: CardDb): CostCurve {
  const buckets: CurveBucket[] = Array.from({ length: CURVE_MAX + 1 }, (_, cost) => ({
    cost,
    label: cost === CURVE_MAX ? `${CURVE_MAX}+` : String(cost),
    character: 0,
    jutsu: 0,
    item: 0,
    total: 0,
  }));
  let sum = 0;
  let n = 0;
  for (const { card, quantity } of splitDeck(deck, db).main) {
    const b = buckets[Math.min(card.cost, CURVE_MAX)];
    if (card.type === "character" || card.type === "jutsu" || card.type === "item") b[card.type] += quantity;
    b.total += quantity;
    sum += card.cost * quantity;
    n += quantity;
  }
  return { buckets, average: n ? sum / n : 0, peak: Math.max(0, ...buckets.map((b) => b.total)) };
}

export interface DeckStats {
  main: number;
  characters: number;
  jutsu: number;
  items: number;
  averageCost: number;
  averagePower: number;
  powerPerChakra: number;
  elements: Array<{ element: Element; count: number }>;
  villages: Array<{ village: string; count: number }>;
}

export function deckStats(deck: Deck, db: CardDb): DeckStats {
  const { main } = splitDeck(deck, db);
  let characters = 0;
  let jutsu = 0;
  let items = 0;
  let cost = 0;
  let power = 0;
  let charCost = 0;
  const elements = new Map<Element, number>();
  const villages = new Map<string, number>();
  for (const { card, quantity } of main) {
    if (card.type === "character") {
      characters += quantity;
      power += card.power * quantity;
      charCost += card.cost * quantity;
    } else if (card.type === "jutsu") jutsu += quantity;
    else if (card.type === "item") items += quantity;
    cost += card.cost * quantity;
    elements.set(card.element, (elements.get(card.element) ?? 0) + quantity);
    if (card.village) villages.set(card.village, (villages.get(card.village) ?? 0) + quantity);
  }
  const total = characters + jutsu + items;
  return {
    main: total,
    characters,
    jutsu,
    items,
    averageCost: total ? cost / total : 0,
    averagePower: characters ? power / characters : 0,
    powerPerChakra: charCost ? power / charCost : 0,
    elements: ELEMENTS.map((element) => ({ element, count: elements.get(element) ?? 0 })).filter((e) => e.count > 0),
    villages: [...villages.entries()].map(([village, count]) => ({ village, count })).sort((a, b) => b.count - a.count),
  };
}

export type ArchetypeId = "ambush" | "ramp" | "evolution" | "swarm" | "control" | "tempo" | "surge";

export const ARCHETYPES: Record<ArchetypeId, { name: string; blurb: string }> = {
  ambush: { name: "Shadow Ambush", blurb: "Plays Hidden for 1 Chakra, then reveals for AMBUSH swings." },
  ramp: { name: "Chakra Ramp", blurb: "Builds Chakra income to land expensive finishers late." },
  evolution: { name: "Evolution Chain", blurb: "Upgrades one character through several versions." },
  swarm: { name: "Squad Swarm", blurb: "Many cheap characters that buff their own team." },
  control: { name: "Assassination Control", blurb: "Defeats, weakens and strips enemy Power tokens." },
  tempo: { name: "Edge Tempo", blurb: "Fights for the Edge token to win ties and act first." },
  surge: { name: "Power Surge", blurb: "Stacks Power tokens and equipment on key characters." },
};

export interface ArchetypeScore {
  id: ArchetypeId;
  name: string;
  blurb: string;
  score: number;
  share: number;
}

export interface ArchetypeReport {
  primary: ArchetypeScore | null;
  ranked: ArchetypeScore[];
  identity: string;
  elementColor: string;
}

function signalsOf(card: SimCard, weight: number, acc: Record<ArchetypeId, number>): void {
  const a = getAbilities(card);
  const add = (id: ArchetypeId, v: number) => (acc[id] += v * weight);
  if (card.type === "character") {
    if (card.cost <= 2) add("swarm", 0.6);
    if (card.cost >= 6) add("ramp", 0.8);
  }
  add("ramp", a.chakraBonus * 1.5);
  const steps = [...a.triggered.flatMap((t) => t.steps), ...(a.technique?.steps ?? [])];
  for (const t of a.triggered) if (t.trigger === "AMBUSH") add("ambush", 1.4);
  for (const step of steps) {
    if (step.condition?.kind === "edge") add("tempo", 0.8);
    if (step.condition?.kind === "ally") add("swarm", 0.8);
    switch (step.effect.op) {
      case "powerup":
        add("surge", step.effect.target.startsWith("each") ? 1.2 : 1);
        break;
      case "defeat":
        add("control", 1.5);
        break;
      case "weaken":
      case "removeTokens":
        add("control", 0.9);
        break;
      case "defeatHidden":
        add("control", 0.8);
        break;
      case "hideFromDeck":
        add("ambush", 1.2);
        break;
      case "takeEdge":
        add("tempo", 1.5);
        break;
      case "draw":
      case "gainChakra":
        break;
    }
  }
  for (const aura of a.auras) {
    if (aura.kind === "self-edge") add("tempo", 1.2);
    else if (aura.kind === "equip") add("surge", 1);
    else if (aura.kind === "other-friendly" || aura.kind === "friendly-group-mission" || aura.kind === "friendly-group-global")
      add("swarm", 0.8);
  }
}

export function classifyArchetype(deck: Deck, db: CardDb): ArchetypeReport {
  const parts = splitDeck(deck, db);
  const acc: Record<ArchetypeId, number> = { ambush: 0, ramp: 0, evolution: 0, swarm: 0, control: 0, tempo: 0, surge: 0 };

  for (const { card, quantity } of parts.main) signalsOf(card, quantity, acc);
  for (const { card } of parts.leaders) signalsOf(card, 3, acc);

  const versions = new Map<string, { titles: Set<string>; copies: number }>();
  for (const { card, quantity } of parts.main) {
    if (card.type !== "character") continue;
    const v = versions.get(card.name) ?? { titles: new Set<string>(), copies: 0 };
    v.titles.add(card.title ?? card.id);
    v.copies += quantity;
    versions.set(card.name, v);
  }
  for (const v of versions.values()) if (v.titles.size >= 2) acc.evolution += v.copies * 1.1 + (v.titles.size - 1) * 2;

  const total = Object.values(acc).reduce((n, v) => n + v, 0);
  const ranked = (Object.keys(acc) as ArchetypeId[])
    .map((id) => ({ id, ...ARCHETYPES[id], score: acc[id], share: total ? acc[id] / total : 0 }))
    .sort((a, b) => b.score - a.score);

  const stats = deckStats(deck, db);
  const topElement = [...stats.elements].sort((a, b) => b.count - a.count)[0];
  const topVillage = stats.villages[0];
  const identity = [topElement ? ELEMENT_META[topElement.element].label : null, topVillage?.village].filter(Boolean).join(" · ");

  return {
    primary: total > 0 ? ranked[0] : null,
    ranked,
    identity: identity || "Unaligned",
    elementColor: topElement ? ELEMENT_META[topElement.element].color : ELEMENT_META.neutral.color,
  };
}
