import type { CardDb } from "../cards/types";
import type { MissionRank } from "./format";

export type PlayerId = 0 | 1;
export const PLAYER_IDS: readonly PlayerId[] = [0, 1];

export const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);

export type Phase = "setup" | "start" | "action" | "mission" | "end" | "gameover";

export type Zone =
  | "deck"
  | "hand"
  | "mission"
  | "discard"
  /** Beneath an upgraded character. */
  | "stack"
  /** An item attached to a character. */
  | "attached"
  | "leader"
  | "missionCard"
  /** The mission card not drawn into the mission deck. */
  | "reserve";

export type Controller = "human" | "ai";

export interface CardInstance {
  id: string;
  cardId: string;
  owner: PlayerId;
  zone: Zone;
  faceDown: boolean;
  missionIndex: number | null;
  powerTokens: number;
  /** Instance ids beneath this card (Upgrade history), bottom first. */
  stack: string[];
  attachments: string[];
  attachedTo: string | null;
  /** Action sequence number when this character entered the board (tie-break: earliest first). */
  enteredAtSeq: number;
  revealedAtSeq: number | null;
}

export interface MissionSlot {
  rank: MissionRank;
  instanceId: string;
  owner: PlayerId;
  revealed: boolean;
  /** Character instance ids per player, in play order. */
  characters: [string[], string[]];
  wins: [number, number];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  deckName: string;
  controller: Controller;
  /** Index 0 is the top of the deck. */
  deck: string[];
  hand: string[];
  discard: string[];
  leader: string | null;
  reserve: string[];
  chakra: number;
  chakraSpent: number;
  lastIncome: ChakraIncome | null;
  score: number;
  mulliganDecided: boolean;
  mulliganed: boolean;
  passed: boolean;
  techniqueUsed: boolean;
}

export interface ChakraIncome {
  base: number;
  characters: number;
  bonus: number;
  total: number;
}

/** Temporary power change that lasts until the End Phase. */
export interface PowerModifier {
  targetId: string;
  amount: number;
  sourceCardId: string;
}

export type LogKind =
  | "system"
  | "phase"
  | "play"
  | "hidden"
  | "reveal"
  | "evolve"
  | "jutsu"
  | "item"
  | "technique"
  | "token"
  | "draw"
  | "chakra"
  | "pass"
  | "edge"
  | "mission"
  | "score"
  | "effect"
  | "defeat"
  | "mulligan"
  | "gameover";

export interface LogEntry {
  id: number;
  seq: number;
  round: number;
  phase: Phase;
  player: PlayerId | null;
  kind: LogKind;
  text: string;
  cardId?: string;
}

export interface MissionEvaluation {
  missionIndex: number;
  rank: MissionRank;
  totals: [number, number];
  winner: PlayerId | null;
  points: number;
  edgeTiebreak: boolean;
}

export interface GameResult {
  winner: PlayerId;
  scores: [number, number];
  reason: "points" | "edge-tiebreak" | "concede";
}

export interface GameState {
  seed: number;
  rng: number;
  /** Increments on every applied action. */
  seq: number;
  nextLogId: number;
  round: number;
  phase: Phase;
  activePlayer: PlayerId;
  edge: PlayerId;
  firstPlayer: PlayerId;
  players: [PlayerState, PlayerState];
  missions: MissionSlot[];
  instances: Record<string, CardInstance>;
  modifiers: PowerModifier[];
  log: LogEntry[];
  lastEvaluation: MissionEvaluation[] | null;
  result: GameResult | null;
}

export type GameAction =
  | { type: "MULLIGAN"; player: PlayerId; mulligan: boolean }
  | { type: "PLAY_CHARACTER"; player: PlayerId; handId: string; missionIndex: number; hidden: boolean }
  | { type: "REVEAL"; player: PlayerId; instanceId: string }
  | { type: "EVOLVE"; player: PlayerId; handId: string; targetId: string }
  | { type: "PLAY_JUTSU"; player: PlayerId; handId: string; missionIndex: number }
  | { type: "ATTACH_ITEM"; player: PlayerId; handId: string; targetId: string }
  | { type: "LEADER_TECHNIQUE"; player: PlayerId; missionIndex: number }
  | { type: "ADD_POWER_TOKEN"; player: PlayerId; targetId: string }
  | { type: "DRAW_CARD"; player: PlayerId }
  | { type: "PASS"; player: PlayerId }
  | { type: "CONCEDE"; player: PlayerId }
  /** System step: resolves the Start, Mission Evaluation and End phases. */
  | { type: "ADVANCE" };

export type PlayerAction = Exclude<GameAction, { type: "ADVANCE" }>;

export interface EngineContext {
  cards: CardDb;
}

export interface DeckSetup {
  name: string;
  leaderId: string;
  missionIds: string[];
  mainIds: string[];
}

export interface PlayerSetup {
  name: string;
  controller: Controller;
  deck: DeckSetup;
}

export interface GameSetup {
  seed: number;
  players: [PlayerSetup, PlayerSetup];
  firstPlayer?: PlayerId;
}
