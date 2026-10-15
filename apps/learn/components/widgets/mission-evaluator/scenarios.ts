import { createGame, evaluateRound } from "@/lib/game/engine";
import { PRACTICE_CARDS, practiceMission, type PracticeMissionId } from "@/lib/game/cards";
import type { GameState, MissionOutcome, Rank, RoundEvaluation, Side } from "@/lib/game/types";

/** What the learner thinks will happen on a mission. */
export type Prediction = Side | "none";

export const PREDICTION_LABEL: Record<Prediction, string> = {
  you: "You",
  opp: "Opponent",
  none: "Nobody",
};

/** A character as it sits on one side of a mission. */
export interface EvalUnit {
  cardId: string;
  hidden?: boolean;
  tokens?: number;
}

export interface EvalMissionSpec {
  missionId: PracticeMissionId;
  rank: Rank;
  you: EvalUnit[];
  opp: EvalUnit[];
  /** Short label for the idea this mission tests, shown with the result. */
  focus: string;
  /** One line explaining why the result is what it is. */
  insight: string;
}

export interface EvalScenario {
  id: string;
  title: string;
  tagline: string;
  edge: Side;
  /** Why this side holds the Edge token. */
  edgeNote: string;
  /** Mission points before this Round 4 evaluation. */
  score: Record<Side, number>;
  /** In rank order D, C, B, A. */
  missions: EvalMissionSpec[];
}

export const EVAL_SCENARIOS: readonly EvalScenario[] = [
  {
    id: "valley-clash",
    title: "Valley Clash",
    tagline: "You trail by 3 going into the final evaluation.",
    edge: "opp",
    edgeNote: "Your opponent passed first this Round, so they hold the Edge.",
    score: { you: 7, opp: 10 },
    missions: [
      {
        missionId: "catch-tora",
        rank: "D",
        you: [{ cardId: "rock-lee" }, { cardId: "ino-yamanaka" }],
        opp: [{ cardId: "kankuro-puppet" }],
        focus: "Most Power wins",
        insight: "Rock Lee and Ino total 5 against Kankuro's 2, so the bigger side takes it.",
      },
      {
        missionId: "bridge-escort",
        rank: "C",
        you: [{ cardId: "sasuke-avenger" }, { cardId: "sakura-medic" }],
        opp: [{ cardId: "orochimaru-sannin" }],
        focus: "Ties go to the Edge",
        insight: "4 against 4 is a tie, and the Edge holder wins ties. Orochimaru's SCORE then adds 1 point.",
      },
      {
        missionId: "forest-of-death",
        rank: "B",
        you: [{ cardId: "kakashi-copy", hidden: true }],
        opp: [],
        focus: "0 Power can't win",
        insight: "A hidden character without tokens has 0 Power. With 0 on both sides, nobody scores, Edge or not.",
      },
      {
        missionId: "find-tsunade",
        rank: "A",
        you: [{ cardId: "naruto-genin", tokens: 1 }, { cardId: "neji-gentle-fist" }],
        opp: [{ cardId: "kisame-shark" }, { cardId: "haku-ice", hidden: true, tokens: 1 }],
        focus: "Tokens count",
        insight: "Naruto's token makes your side 6. The hidden Haku keeps its token, so the opponent has 5. 6 beats 5.",
      },
    ],
  },
  {
    id: "edge-of-victory",
    title: "Edge of Victory",
    tagline: "You lead by 1, and the Edge is yours.",
    edge: "you",
    edgeNote: "You passed first this Round and took the Edge.",
    score: { you: 11, opp: 10 },
    missions: [
      {
        missionId: "defend-the-leaf",
        rank: "D",
        you: [{ cardId: "choji-akimichi" }, { cardId: "hinata-byakugan" }],
        opp: [{ cardId: "zabuza-demon" }],
        focus: "Ties go to the Edge",
        insight: "Choji and Hinata make 4, matching Zabuza. You hold the Edge, so the tie is yours.",
      },
      {
        missionId: "catch-tora",
        rank: "C",
        you: [{ cardId: "shikamaru-shadow", hidden: true }],
        opp: [{ cardId: "itachi-akatsuki", hidden: true, tokens: 1 }],
        focus: "Hidden cards keep tokens",
        insight: "Both characters are hidden, but the opponent's carries a Power token: 1 Power beats 0.",
      },
      {
        missionId: "rescue-kazekage",
        rank: "B",
        you: [{ cardId: "gaara-sand" }, { cardId: "temari-wind" }, { cardId: "kankuro-puppet" }],
        opp: [{ cardId: "tsunade-hokage" }, { cardId: "neji-gentle-fist" }],
        focus: "Count active effects",
        insight: "Gaara gains +1 for each other friendly character here, so he has 5 and your side totals 10 against 9.",
      },
      {
        missionId: "forest-of-death",
        rank: "A",
        you: [{ cardId: "naruto-genin" }, { cardId: "rock-lee" }],
        opp: [{ cardId: "orochimaru-sannin" }, { cardId: "kisame-shark" }],
        focus: "The biggest prize",
        insight: "8 beats 6 on the A-rank mission, and Orochimaru's SCORE adds 1 more point for the opponent.",
      },
    ],
  },
];

export interface BuiltScenario {
  scenario: EvalScenario;
  state: GameState;
  evaluation: RoundEvaluation;
  /** Outcome per mission id. */
  outcomes: Record<string, MissionOutcome>;
}

/** Builds the Round 4 board with the engine and evaluates it, so every result matches the rules engine. */
export function buildScenario(scenario: EvalScenario): BuiltScenario {
  const state = createGame({
    round: 4,
    missions: scenario.missions.map((m) => ({
      def: practiceMission(m.missionId, m.rank),
      units: [
        ...m.you.map((u) => ({ side: "you" as const, stack: [u.cardId], hidden: u.hidden, powerTokens: u.tokens })),
        ...m.opp.map((u) => ({ side: "opp" as const, stack: [u.cardId], hidden: u.hidden, powerTokens: u.tokens })),
      ],
    })),
    chakra: { you: 0, opp: 0 },
    hands: { you: [], opp: [] },
    edge: scenario.edge,
    passed: { you: true, opp: true },
    score: { ...scenario.score },
  });
  const evaluation = evaluateRound(state, PRACTICE_CARDS);
  const outcomes: Record<string, MissionOutcome> = {};
  for (const o of evaluation.outcomes) outcomes[o.missionId] = o;
  return { scenario, state, evaluation, outcomes };
}

export const toPrediction = (winner: Side | null): Prediction => winner ?? "none";

const sideName = (side: Side) => (side === "you" ? "You" : "Your opponent");

/** One-line reason for a mission result, built from the engine outcome. */
export function outcomeReason(outcome: MissionOutcome, edge: Side): string {
  const { you, opp } = outcome.power;
  switch (outcome.reason) {
    case "power": {
      const w = outcome.winner === "you" ? you : opp;
      const l = outcome.winner === "you" ? opp : you;
      return `${sideName(outcome.winner ?? "you")} ${outcome.winner === "you" ? "win" : "wins"} ${w}–${l} on Power.`;
    }
    case "edge-tiebreak":
      return `Tied ${you}–${opp}: the Edge holder (${edge === "you" ? "you" : "your opponent"}) wins ties.`;
    case "no-power":
      return `${you}–${opp}: nobody has the 1 Power needed to win, so nobody scores.`;
  }
}
