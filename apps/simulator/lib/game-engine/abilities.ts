import type { SimCard } from "../cards/types";

/**
 * Card text compiler.
 *
 * Every line of a card's text is compiled into structured abilities. Lines the grammar
 * does not recognise are kept as `unparsed` and shown as "not automated" in the UI; the
 * engine never half-resolves a line.
 *
 * Line grammar (case-insensitive, "↯" accepted in place of ":"):
 *   MAIN|AMBUSH|UPGRADE|SCORE: <step>. <step>.
 *   TECHNIQUE [n]: <step>.           (Leaders: once per round, pay n)
 *   CONTINUOUS: <aura>.
 *   EQUIP: +n Power.                 (Items)
 *   CHAKRA +n                        (+n Chakra each Start Phase)
 *
 * Step: [If you hold the Edge token, | If you control another <group> character in this mission,] <effect>
 */

export type Trigger = "MAIN" | "AMBUSH" | "UPGRADE" | "SCORE";
export type FriendlyTarget = "self" | "weakest-friendly" | "strongest-friendly" | "each-friendly" | "each-other-friendly";
export type EnemyTarget = "weakest-enemy" | "strongest-enemy" | "each-enemy";

export type Condition = { kind: "edge" } | { kind: "ally"; group: string };

export type Effect =
  | { op: "powerup"; amount: number; target: FriendlyTarget }
  | { op: "draw"; amount: number }
  | { op: "gainChakra"; amount: number }
  | { op: "removeTokens"; amount: number; target: EnemyTarget }
  | { op: "weaken"; amount: number; target: EnemyTarget }
  | { op: "defeat"; target: "weakest-enemy" | "strongest-enemy"; maxPower: number | null }
  | { op: "defeatHidden" }
  | { op: "hideFromDeck" }
  | { op: "takeEdge" };

export interface EffectStep {
  effect: Effect;
  condition: Condition | null;
  text: string;
}

export interface TriggeredAbility {
  trigger: Trigger;
  steps: EffectStep[];
  text: string;
}

export type Aura =
  | { kind: "other-friendly"; amount: number }
  | { kind: "friendly-group-mission"; group: string; amount: number }
  | { kind: "friendly-group-global"; group: string; amount: number }
  | { kind: "self-edge"; amount: number }
  | { kind: "mission-group"; group: string; amount: number }
  | { kind: "equip"; amount: number };

export interface Technique {
  cost: number;
  steps: EffectStep[];
  text: string;
}

export interface AbilityLine {
  label: string;
  text: string;
  automated: boolean;
}

export interface Abilities {
  triggered: TriggeredAbility[];
  auras: Aura[];
  chakraBonus: number;
  technique: Technique | null;
  lines: AbilityLine[];
  unparsed: string[];
}

const WORD_NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
const NUM = "(\\d+|a|an|one|two|three|four|five)";

function toNumber(raw: string): number {
  return WORD_NUMBERS[raw.toLowerCase()] ?? Number.parseInt(raw, 10);
}

const FRIENDLY_TARGETS: Record<string, FriendlyTarget> = {
  "your weakest character": "weakest-friendly",
  "your strongest character": "strongest-friendly",
  "each friendly character": "each-friendly",
  "each other friendly character": "each-other-friendly",
};

const ENEMY_TARGETS: Record<string, EnemyTarget> = {
  "the weakest enemy character": "weakest-enemy",
  "the strongest enemy character": "strongest-enemy",
  "each enemy character": "each-enemy",
};

const FRIENDLY_RE = Object.keys(FRIENDLY_TARGETS).join("|");
const ENEMY_RE = Object.keys(ENEMY_TARGETS).join("|");

function clean(sentence: string): string {
  return sentence
    .replace(/[‘’]/g, "'")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "")
    .toLowerCase();
}

export function parseEffect(sentence: string): Effect | null {
  const s = clean(sentence);
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^powerup (\d+)$/))) return { op: "powerup", amount: toNumber(m[1]), target: "self" };
  if ((m = s.match(new RegExp(`^powerup (\\d+) on (${FRIENDLY_RE}) in this mission$`))))
    return { op: "powerup", amount: toNumber(m[1]), target: FRIENDLY_TARGETS[m[2]] };
  if ((m = s.match(new RegExp(`^draw ${NUM} cards?$`)))) return { op: "draw", amount: toNumber(m[1]) };
  if ((m = s.match(new RegExp(`^gain ${NUM} chakra$`)))) return { op: "gainChakra", amount: toNumber(m[1]) };
  if ((m = s.match(new RegExp(`^remove (?:up to )?${NUM} power tokens? from (${ENEMY_RE}) in this mission$`))))
    return { op: "removeTokens", amount: toNumber(m[1]), target: ENEMY_TARGETS[m[2]] };
  if ((m = s.match(new RegExp(`^(${ENEMY_RE}) in this mission gets? -(\\d+) power this round$`))))
    return { op: "weaken", amount: toNumber(m[2]), target: ENEMY_TARGETS[m[1]] };
  if ((m = s.match(/^defeat (the weakest enemy character|the strongest enemy character) in this mission(?: with power (\d+) or less)?$/)))
    return {
      op: "defeat",
      target: ENEMY_TARGETS[m[1]] as "weakest-enemy" | "strongest-enemy",
      maxPower: m[2] === undefined ? null : toNumber(m[2]),
    };
  if (s === "defeat an enemy hidden character in this mission") return { op: "defeatHidden" };
  if (s === "put the top card of your deck into this mission as a hidden character") return { op: "hideFromDeck" };
  if (s === "take the edge token" || s === "gain the edge token") return { op: "takeEdge" };
  return null;
}

export function parseStep(sentence: string): EffectStep | null {
  const text = sentence.trim().replace(/\.$/, "");
  let m = text.match(/^if you hold the edge token,\s*(.+)$/i);
  if (m) {
    const effect = parseEffect(m[1]);
    return effect ? { effect, condition: { kind: "edge" }, text } : null;
  }
  m = text.match(/^if you control another (.+?) character in this mission,\s*(.+)$/i);
  if (m) {
    const effect = parseEffect(m[2]);
    return effect ? { effect, condition: { kind: "ally", group: m[1].trim() }, text } : null;
  }
  const effect = parseEffect(text);
  return effect ? { effect, condition: null, text } : null;
}

export function parseAura(sentence: string): Aura | null {
  const s = sentence.trim().replace(/\.$/, "").replace(/\s+/g, " ");
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^other friendly characters in this mission get \+(\d+) power$/i)))
    return { kind: "other-friendly", amount: toNumber(m[1]) };
  if ((m = s.match(/^this character gets \+(\d+) power while you hold the edge token$/i)))
    return { kind: "self-edge", amount: toNumber(m[1]) };
  if ((m = s.match(/^friendly (.+?) characters in this mission get \+(\d+) power$/i)))
    return { kind: "friendly-group-mission", group: m[1], amount: toNumber(m[2]) };
  if ((m = s.match(/^friendly (.+?) characters get \+(\d+) power$/i)))
    return { kind: "friendly-group-global", group: m[1], amount: toNumber(m[2]) };
  if ((m = s.match(/^(.+?) characters in this mission get \+(\d+) power$/i)))
    return { kind: "mission-group", group: m[1], amount: toNumber(m[2]) };
  return null;
}

function splitSentences(body: string): string[] {
  return body
    .split(/\.(?:\s+|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSteps(body: string): EffectStep[] | null {
  const steps: EffectStep[] = [];
  for (const sentence of splitSentences(body)) {
    const step = parseStep(sentence);
    if (!step) return null;
    steps.push(step);
  }
  return steps.length ? steps : null;
}

export function compileAbilities(text: string): Abilities {
  const result: Abilities = { triggered: [], auras: [], chakraBonus: 0, technique: null, lines: [], unparsed: [] };
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    let m: RegExpMatchArray | null;
    let label = "TEXT";
    let ok = false;

    if ((m = line.match(/^(main|ambush|upgrade|score)\s*(?::|↯|-)\s*(.+)$/i))) {
      label = m[1].toUpperCase();
      const steps = parseSteps(m[2]);
      if (steps) {
        result.triggered.push({ trigger: label as Trigger, steps, text: m[2].trim() });
        ok = true;
      }
    } else if ((m = line.match(/^chakra\s*\+\s*(\d+)\.?$/i))) {
      label = "CHAKRA";
      result.chakraBonus += toNumber(m[1]);
      ok = true;
    } else if ((m = line.match(/^technique\s*\[(\d+)\]\s*(?::|↯|-)\s*(.+)$/i))) {
      label = "TECHNIQUE";
      const steps = parseSteps(m[2]);
      if (steps && !result.technique) {
        result.technique = { cost: toNumber(m[1]), steps, text: m[2].trim() };
        ok = true;
      }
    } else if ((m = line.match(/^equip\s*(?::|↯|-)\s*\+(\d+) power\.?$/i))) {
      label = "EQUIP";
      result.auras.push({ kind: "equip", amount: toNumber(m[1]) });
      ok = true;
    } else if ((m = line.match(/^continuous\s*(?::|↯|-)\s*(.+)$/i))) {
      label = "CONTINUOUS";
      const auras = splitSentences(m[1]).map(parseAura);
      if (auras.length && auras.every((a): a is Aura => a !== null)) {
        result.auras.push(...auras);
        ok = true;
      }
    }

    result.lines.push({ label, text: line, automated: ok });
    if (!ok) result.unparsed.push(line);
  }
  return result;
}

const cache = new WeakMap<SimCard, Abilities>();

export function getAbilities(card: SimCard): Abilities {
  let a = cache.get(card);
  if (!a) {
    a = compileAbilities(card.text);
    cache.set(card, a);
  }
  return a;
}

export function triggersOf(card: SimCard, trigger: Trigger): TriggeredAbility[] {
  return getAbilities(card).triggered.filter((t) => t.trigger === trigger);
}

function normGroup(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/village$/, "");
}

/** Do two group names refer to the same group ("Leaf" and "Leaf Village" do)? */
export function sameGroup(a: string, b: string): boolean {
  const na = normGroup(a);
  return na !== "" && na === normGroup(b);
}

/** Does the card belong to a group named by an effect: an element, village or keyword? */
export function matchesGroup(card: SimCard, group: string): boolean {
  const g = normGroup(group);
  if (!g) return false;
  if (normGroup(card.element) === g) return true;
  if (card.village && normGroup(card.village) === g) return true;
  return card.keywords.some((k) => normGroup(k) === g);
}
