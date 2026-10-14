/**
 * Types for the teaching engine. The engine models the NARUTO Mythos TCG round
 * structure (Start → Action → Mission evaluation → End) closely enough to drive
 * the lesson widgets and the Lethal Puzzles. Card stats are practice cards
 * invented for the tutorials, not real printed cards.
 */

export type Side = "you" | "opp";
export const SIDES: readonly Side[] = ["you", "opp"];
export const otherSide = (side: Side): Side => (side === "you" ? "opp" : "you");

/** Mission rank is set by the Round the mission enters play: D=1st … A=4th. */
export type Rank = "D" | "C" | "B" | "A";
export const RANK_ORDER: readonly Rank[] = ["D", "C", "B", "A"];
/** Extra Mission points a mission awards on top of its printed base points. */
export const RANK_BONUS: Record<Rank, number> = { D: 1, C: 2, B: 3, A: 4 };

export type Faction = "leaf" | "sand" | "mist" | "cloud" | "sound" | "akatsuki";

export type EmblemName =
  | "spiral"
  | "leaf"
  | "shuriken"
  | "kunai"
  | "scroll"
  | "flame"
  | "wave"
  | "bolt"
  | "gourd"
  | "eye"
  | "seal"
  | "edge"
  | "mask"
  | "cloud"
  | "kage"
  | "fist"
  | "fang"
  | "lotus"
  | "target"
  | "chakra";

/**
 * When an effect fires.
 * - MAIN: whenever the character is played face-up (incl. reveal and upgrade).
 * - AMBUSH: only when revealed from hidden.
 * - UPGRADE: only when played as an upgrade over a same-name character.
 * - FIRST_STRIKE: like MAIN, but only if it is the first character you play this round.
 * - SCORE: when you win the mission this card is on (or this mission card).
 * - CONTINUOUS: always on while the character is face-up.
 */
export type EffectTrigger = "MAIN" | "AMBUSH" | "UPGRADE" | "FIRST_STRIKE" | "SCORE" | "CONTINUOUS";

export type EffectSpec =
  /** Put Power tokens on characters. */
  | { kind: "powerup"; amount: number; target: "self" | "other-friendlies-here" | "all-friendlies-here" }
  /** Defeat the strongest enemy in this mission whose Power is at most `maxPower`. */
  | { kind: "defeat-enemy"; maxPower: number }
  /** Hide the strongest face-up enemy in this mission whose Power is at most `maxPower`. */
  | { kind: "hide-enemy"; maxPower: number }
  /** SCORE only: gain extra Mission points. */
  | { kind: "gain-points"; amount: number }
  /** CONTINUOUS only: +amount Power for each other friendly character in this mission. */
  | { kind: "power-per-friendly-here"; amount: number };

export interface CardEffect {
  trigger: EffectTrigger;
  spec: EffectSpec;
  /** Human-readable rules text shown on the card. */
  text: string;
}

export interface CardDef {
  id: string;
  name: string;
  /** Descriptor that tells same-name versions apart, e.g. "Copy Ninja". */
  title: string;
  cost: number;
  power: number;
  faction: Faction;
  emblem: EmblemName;
  keywords?: string[];
  /** CHAKRA +X: extra Chakra this character provides in the Start phase. */
  chakraBonus?: number;
  effects: CardEffect[];
  flavor?: string;
}

export type CardCatalog = Readonly<Record<string, CardDef>>;

export interface MissionDef {
  id: string;
  name: string;
  rank: Rank;
  /** Printed base Mission points. Winner gains base + rank bonus. */
  basePoints: number;
  scoreEffect?: CardEffect;
}

export interface UnitState {
  uid: string;
  side: Side;
  /** Card ids from bottom to top; the top card is the character's identity. */
  stack: string[];
  hidden: boolean;
  powerTokens: number;
}

export interface MissionState {
  def: MissionDef;
  /** Units in play order. */
  units: UnitState[];
}

export interface GameState {
  round: number;
  missions: MissionState[];
  chakra: Record<Side, number>;
  hands: Record<Side, string[]>;
  edge: Side;
  passed: Record<Side, boolean>;
  active: Side;
  score: Record<Side, number>;
  /** Characters each side has played this round (for FIRST STRIKE). */
  playsThisRound: Record<Side, number>;
  nextUid: number;
}

export type GameAction =
  | { type: "play"; side: Side; cardId: string; missionId: string; hidden: boolean }
  | { type: "reveal"; side: Side; uid: string }
  | { type: "upgrade"; side: Side; cardId: string; uid: string }
  | { type: "pass"; side: Side };

export type GameEvent =
  | { type: "played"; side: Side; uid: string; cardId: string; missionId: string; hidden: boolean; cost: number }
  | { type: "revealed"; side: Side; uid: string; cardId: string; cost: number }
  | { type: "upgraded"; side: Side; uid: string; fromCardId: string; cardId: string; cost: number }
  | { type: "effect"; side: Side; uid: string | null; trigger: EffectTrigger; text: string }
  | { type: "powerup"; uid: string; amount: number }
  | { type: "defeated"; uid: string; cardId: string }
  | { type: "hid"; uid: string; cardId: string }
  | { type: "fizzled"; uid: string; text: string }
  | { type: "passed"; side: Side; tookEdge: boolean };

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: string };

export interface UnitSetup {
  side: Side;
  /** Bottom → top. A single-card character is `[cardId]`. */
  stack: string[];
  hidden?: boolean;
  powerTokens?: number;
}

export interface GameSetup {
  round: number;
  missions: Array<{ def: MissionDef; units?: UnitSetup[] }>;
  chakra: Record<Side, number>;
  hands: Record<Side, string[]>;
  edge: Side;
  passed?: Partial<Record<Side, boolean>>;
  /** Who acts first. Defaults to the Edge holder, as in the rules. */
  active?: Side;
  score: Record<Side, number>;
}

export type MissionWinReason = "power" | "edge-tiebreak" | "no-power";

export interface MissionOutcome {
  missionId: string;
  rank: Rank;
  power: Record<Side, number>;
  winner: Side | null;
  reason: MissionWinReason;
  /** Points the winner gains (0 when nobody wins). */
  points: number;
  /** SCORE effect texts that fired. */
  scoreEffects: string[];
}

export interface RoundEvaluation {
  outcomes: MissionOutcome[];
  scoreBefore: Record<Side, number>;
  scoreAfter: Record<Side, number>;
  /** Game winner when this is the final (4th) round; ties go to the Edge holder. */
  winner: Side;
  decidedByEdge: boolean;
}
