import { applyAction, autoplayOpponent, createGame, evaluateRound, findMission, sidePower } from "@/lib/game/engine";
import { PRACTICE_CARDS, practiceMission, type PracticeMissionId } from "@/lib/game/cards";
import type { CardDef, GameState, MissionOutcome, Rank, UnitState } from "@/lib/game/types";

export type AmbushScenarioId = "kakashi" | "shikamaru";

/**
 * A one-mission Round 1 setup: the opponent (Edge holder) opened with a
 * face-up character and you hold one character with an AMBUSH effect.
 * Narration strings use RichText markup (**bold**, [[keyword]]).
 */
export interface AmbushScenario {
  id: AmbushScenarioId;
  /** Tab label. */
  label: string;
  /** What the hero's AMBUSH does, in a few words (shown under the AMBUSH! title). */
  effectLabel: string;
  missionId: PracticeMissionId;
  rank: Rank;
  heroId: string;
  enemyId: string;
  /** Start-phase Chakra for Round 1: 5 base, no characters in play yet. */
  chakra: number;
  /** Opponent's Chakra left after paying for their character. */
  oppChakra: number;
  intro: string;
  hiddenNote: string;
  faceUpNote: string;
  effectNote: string;
  /** Why each line wins or loses, for the comparison panel. */
  faceUpWhy: string;
  ambushWhy: string;
}

export const AMBUSH_SCENARIOS: readonly AmbushScenario[] = [
  {
    id: "kakashi",
    label: "Kakashi",
    effectLabel: "POWERUP 2",
    missionId: "forest-of-death",
    rank: "D",
    heroId: "kakashi-copy",
    enemyId: "kisame-shark",
    chakra: 5,
    oppChakra: 1,
    intro:
      "Round 1. Your opponent holds the [[Edge token|Edge]] and opened with **Kisame Hoshigaki** (4 Power). You have **5 Chakra** and Kakashi in hand. Slip him in [[hidden]] for 1 Chakra.",
    hiddenNote:
      "Kakashi is in play, [[hidden]]. Face-down he has **0 Power** and no active effects, and your opponent can't see what he is.",
    faceUpNote:
      "Kakashi enters face-up for 4 Chakra with **3 Power**. Played straight from your hand, his [[AMBUSH]] never fires.",
    effectNote:
      "[[POWERUP]] 2: two [[Power tokens]] land on Kakashi. 3 printed Power + 2 tokens = **5 Power**.",
    faceUpWhy: "No AMBUSH from the hand",
    ambushWhy: "AMBUSH: POWERUP 2 on the reveal",
  },
  {
    id: "shikamaru",
    label: "Shikamaru",
    effectLabel: "Hide an enemy",
    missionId: "bridge-escort",
    rank: "D",
    heroId: "shikamaru-shadow",
    enemyId: "neji-gentle-fist",
    chakra: 5,
    oppChakra: 2,
    intro:
      "Bonus round. Your opponent opened with **Neji Hyuga** (3 Power). Shikamaru has only 2 Power, but his [[AMBUSH]] can [[hide]] an enemy with 3 Power or less. Start by playing him [[hidden]].",
    hiddenNote:
      "Shikamaru waits face-down: **0 Power**, no effects, and a question mark for your opponent.",
    faceUpNote:
      "Shikamaru enters face-up for 3 Chakra with **2 Power**. From your hand his [[AMBUSH]] never fires, so Neji keeps all 3 of his.",
    effectNote:
      "Shadow Possession: Neji is forced face-down. [[Hidden]], he has **0 Power**, and Shikamaru's 2 Power is enough.",
    faceUpWhy: "No AMBUSH, so Neji stays at 3",
    ambushWhy: "AMBUSH hides Neji (0 Power)",
  },
];

export const scenarioById = (id: AmbushScenarioId): AmbushScenario =>
  AMBUSH_SCENARIOS.find((s) => s.id === id) ?? AMBUSH_SCENARIOS[0]!;

export const cardOf = (id: string): CardDef => {
  const card = PRACTICE_CARDS[id];
  if (!card) throw new Error(`Unknown card ${id}`);
  return card;
};

/**
 * Round 1. The opponent holds the Edge, took the first turn and played their
 * character face-up. Now it is your turn, with one card in hand.
 */
export function initialState(s: AmbushScenario): GameState {
  return createGame({
    round: 1,
    missions: [{ def: practiceMission(s.missionId, s.rank), units: [{ side: "opp", stack: [s.enemyId] }] }],
    chakra: { you: s.chakra, opp: s.oppChakra },
    hands: { you: [s.heroId], opp: [] },
    edge: "opp",
    active: "you",
    score: { you: 0, opp: 0 },
  });
}

/** The opponent has nothing left to play, so on their turn they pass. */
export function opponentTurn(state: GameState): GameState {
  return autoplayOpponent(state, PRACTICE_CARDS, [], 0).state;
}

/** You pass (nothing left to play) and the Round's only mission is scored. */
export function passAndScore(state: GameState): { state: GameState; outcome: MissionOutcome } {
  let s = state;
  if (!s.passed.you) {
    const passed = applyAction(s, { type: "pass", side: "you" }, PRACTICE_CARDS);
    if (passed.ok) s = passed.state;
  }
  return { state: s, outcome: evaluateRound(s, PRACTICE_CARDS).outcomes[0]! };
}

export interface PathResult {
  chakraSpent: number;
  power: { you: number; opp: number };
  outcome: MissionOutcome;
}

function finish(state: GameState, startChakra: number): PathResult {
  const { state: end, outcome } = passAndScore(state);
  const mission = end.missions[0]!;
  return {
    chakraSpent: startChakra - end.chakra.you,
    power: { you: sidePower(mission, "you", PRACTICE_CARDS), opp: sidePower(mission, "opp", PRACTICE_CARDS) },
    outcome,
  };
}

/** Engine-computed comparison of the two lines: face-up from hand vs hidden-then-revealed. */
export function comparePaths(s: AmbushScenario): { faceUp: PathResult; ambush: PathResult } {
  const start = initialState(s);
  const missionId = start.missions[0]!.def.id;

  const up = applyAction(start, { type: "play", side: "you", cardId: s.heroId, missionId, hidden: false }, PRACTICE_CARDS);
  if (!up.ok) throw new Error(up.reason);
  const faceUp = finish(opponentTurn(up.state), s.chakra);

  const hid = applyAction(start, { type: "play", side: "you", cardId: s.heroId, missionId, hidden: true }, PRACTICE_CARDS);
  if (!hid.ok) throw new Error(hid.reason);
  const afterPass = opponentTurn(hid.state);
  const mission = findMission(afterPass, missionId)!;
  const uid = mission.units.find((u) => u.side === "you")!.uid;
  const rev = applyAction(afterPass, { type: "reveal", side: "you", uid }, PRACTICE_CARDS);
  if (!rev.ok) throw new Error(rev.reason);
  return { faceUp, ambush: finish(rev.state, s.chakra) };
}

/* ------------------------------------------------------------------ */
/* Display snapshots: step the board through an action's events so the  */
/* animation can show each effect land before syncing to the engine.   */
/* ------------------------------------------------------------------ */

function mapUnits(state: GameState, fn: (u: UnitState) => UnitState | null): GameState {
  return {
    ...state,
    missions: state.missions.map((m) => ({
      ...m,
      units: m.units.map(fn).filter((u): u is UnitState => u !== null),
    })),
  };
}

export const setHidden = (state: GameState, uid: string, hidden: boolean) =>
  mapUnits(state, (u) => (u.uid === uid ? { ...u, hidden } : u));

export const addTokens = (state: GameState, uid: string, amount: number) =>
  mapUnits(state, (u) => (u.uid === uid ? { ...u, powerTokens: u.powerTokens + amount } : u));

export const removeUnit = (state: GameState, uid: string) => mapUnits(state, (u) => (u.uid === uid ? null : u));
