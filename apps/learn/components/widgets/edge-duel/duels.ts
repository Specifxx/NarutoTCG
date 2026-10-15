import type { ScriptedAction } from "@/lib/game/engine";
import { PRACTICE_CARDS, practiceMission } from "@/lib/game/cards";
import type {
  CardCatalog,
  EmblemName,
  GameAction,
  GameSetup,
  GameState,
  RoundEvaluation,
  Side,
} from "@/lib/game/types";

/** What a duel's explainer gets once both players have passed. */
export interface DuelOutcome {
  evaluation: RoundEvaluation;
  /** Final state after the Action phase (its `edge` is the Edge holder at scoring). */
  state: GameState;
  /** Who passed first this Round (and so took or kept the Edge). */
  firstPasser: Side | null;
  /** Every action you took, in order. */
  yourActions: GameAction[];
  won: boolean;
}

export interface DuelDef {
  id: string;
  order: number;
  title: string;
  tagline: string;
  emblem: EmblemName;
  /** Shown above the board, e.g. "Round 2 · simplified board". */
  roundLabel: string;
  /** One-line win condition. */
  objective: string;
  /** Scenario briefing (RichText markup). */
  briefing: string;
  /** What the scoreboard tracks: points from this Round only, or the whole game. */
  scoreLabel: string;
  /** Progressive hints, weakest first (RichText markup). */
  hints: string[];
  cards: CardCatalog;
  setup: GameSetup;
  opponentScript: ScriptedAction[];
  /** One or two sentences on why you won or lost, referencing the Edge. */
  explain: (outcome: DuelOutcome) => string;
}

const name = (state: GameState, missionId: string) =>
  state.missions.find((m) => m.def.id === missionId)?.def.name ?? "the mission";

/**
 * Three short duels that each turn on the Edge token. Each one was verified by
 * exhaustive search (solvePuzzle): the intended line wins and every tempting
 * alternative loses.
 */
export const DUELS: DuelDef[] = [
  {
    id: "keep-the-edge",
    order: 1,
    title: "Keep the Edge",
    tagline: "You lead. Will you give that up for 2 points?",
    emblem: "edge",
    roundLabel: "Round 2 · simplified board",
    objective: "Score more Mission points than your rival this Round.",
    briefing:
      "You passed first last Round, so you hold the [[Edge token]] and it is your turn. The C mission is level at 5 Power each, and your rival is down to **1 Chakra**: no more Power is coming from them. Your Naruto could grab the D mission... but every card you play hands them a turn.",
    scoreLabel: "Points this Round",
    hints: [
      "Count what each mission is worth: D pays **2**, C pays **4**.",
      "Who wins the tied C mission? Whoever holds the Edge when it is scored.",
      "If you play anything, your rival can [[pass]] first and take the Edge. Passing now keeps it.",
    ],
    cards: PRACTICE_CARDS,
    setup: {
      round: 2,
      missions: [
        { def: practiceMission("catch-tora", "D"), units: [{ side: "opp", stack: ["kankuro-puppet"] }] },
        {
          def: practiceMission("bridge-escort", "C"),
          units: [
            { side: "you", stack: ["naruto-genin"] },
            { side: "opp", stack: ["kisame-shark"] },
            { side: "you", stack: ["neji-gentle-fist"] },
            { side: "opp", stack: ["ino-yamanaka"] },
          ],
        },
      ],
      chakra: { you: 2, opp: 1 },
      hands: { you: ["naruto-genin", "kakashi-copy"], opp: ["itachi-akatsuki", "zabuza-demon"] },
      edge: "you",
      active: "you",
      score: { you: 0, opp: 0 },
    },
    opponentScript: [],
    explain: ({ won, evaluation, state, firstPasser }) => {
      const c = evaluation.outcomes.find((o) => o.rank === "C");
      const cName = c ? name(state, c.missionId) : "the C mission";
      if (won) {
        return `You passed first and kept the Edge, so the tied ${cName} went to you for ${c?.points ?? 4} points. The 2-point D mission was never worth handing your rival the turn.`;
      }
      if (firstPasser === "opp") {
        return `Your play gave your rival a turn: they passed first and took the Edge, so the tied ${cName} (${c?.points ?? 4} points) went to them. Passing straight away keeps the Edge, and with it the bigger mission.`;
      }
      return "The Edge won the tie, but it was not enough this time. Keep the Edge, and keep the bigger mission level.";
    },
  },
  {
    id: "steal-the-edge",
    order: 2,
    title: "Steal the Edge",
    tagline: "They lead. Match them, then pass at the perfect moment.",
    emblem: "kunai",
    roundLabel: "Round 1 · simplified board",
    objective: "Win the mission.",
    briefing:
      "Your rival won the coin flip at setup, so they hold the [[Edge token]] and take the first turn. They have two cheap ninjas to commit. You have the Chakra for one big play and a tricky [[AMBUSH]]. Ties go to the Edge holder, and the first player to [[pass]] takes the Edge.",
    scoreLabel: "Points this Round",
    hints: [
      "Your rival will finish on **4 Power** with no cards left. Can you beat 4, or only match it?",
      "If you only match them, you need the Edge, so you must pass **before** they do.",
      "Play Kisame face-up now, then pass on your next turn, before your rival passes.",
    ],
    cards: PRACTICE_CARDS,
    setup: {
      round: 1,
      missions: [{ def: practiceMission("forest-of-death", "D"), units: [] }],
      chakra: { you: 5, opp: 5 },
      hands: { you: ["kisame-shark", "hinata-byakugan"], opp: ["haku-ice", "kankuro-puppet"] },
      edge: "opp",
      active: "opp",
      score: { you: 0, opp: 0 },
    },
    opponentScript: [
      { type: "play", cardId: "haku-ice", missionId: "forest-of-death", hidden: false },
      { type: "play", cardId: "kankuro-puppet", missionId: "forest-of-death", hidden: false },
      { type: "pass" },
    ],
    explain: ({ won, evaluation, state, yourActions }) => {
      const o = evaluation.outcomes[0];
      const you = o?.power.you ?? 0;
      const opp = o?.power.opp ?? 0;
      if (won) {
        return you === opp
          ? `You matched them at ${you} Power, then passed first and stole the Edge, so the tie went to you.`
          : `You finished ahead on Power (${you} to ${opp}), so the Edge never came into play.`;
      }
      if (state.edge === "you") {
        return `You took the Edge, but too soon: it only wins ties, and they finished ahead ${opp} to ${you}. Get level first, then pass.`;
      }
      if (you === opp) {
        // Did your own (power-changing) play make it level? Then the rival got the next turn and passed first.
        const lastMove = [...yourActions].reverse().find((a) => a.type !== "pass");
        const levelledByYou =
          lastMove !== undefined && (lastMove.type !== "play" || !lastMove.hidden);
        if (levelledByYou) {
          return `You drew level at ${you} with your own play, which gave your rival the next turn: they passed first and kept the Edge, so the tie went to them. Get level on their play, then pass straight away.`;
        }
        return `You got level at ${you}, but your rival passed first and kept the Edge, so the tie went to them. Pass the moment you have matched them.`;
      }
      return `Your rival kept the Edge and finished ahead ${opp} to ${you}. Match their Power first, then pass before they do.`;
    },
  },
  {
    id: "final-tally",
    order: 3,
    title: "Final Tally",
    tagline: "Level scores after Round 4? The Edge holder wins the game.",
    emblem: "kage",
    roundLabel: "Round 4 · final tally · simplified board",
    objective: "Win the game at the final tally.",
    briefing:
      "It's the last Round. Only the A-rank mission is still in doubt; every other mission is already counted in the score. Your rival passes at once to keep the [[Edge token]], because if the final totals are level, the Edge holder wins the game. You now take turns on your own until you pass.",
    scoreLabel: "Game score",
    hints: [
      "Add it up: the A mission is worth **7**. If you win it, what is the final score?",
      "A tied game goes to the Edge holder, and your rival has already kept the Edge.",
      "You need one extra point: look for a [[SCORE]] effect in your hand.",
    ],
    cards: PRACTICE_CARDS,
    setup: {
      round: 4,
      missions: [
        {
          def: practiceMission("rescue-kazekage", "A"),
          units: [
            { side: "you", stack: ["neji-gentle-fist"] },
            { side: "opp", stack: ["kisame-shark"] },
            { side: "you", stack: ["ino-yamanaka"] },
            { side: "opp", stack: ["haku-ice"] },
          ],
        },
      ],
      chakra: { you: 6, opp: 2 },
      hands: { you: ["rock-lee", "sakura-medic", "orochimaru-sannin"], opp: ["itachi-akatsuki"] },
      edge: "opp",
      active: "opp",
      score: { you: 13, opp: 20 },
    },
    opponentScript: [],
    explain: ({ won, evaluation }) => {
      const { scoreAfter } = evaluation;
      if (won) {
        return `Orochimaru's SCORE point made it ${scoreAfter.you} to ${scoreAfter.opp}: a strict lead, so your rival's Edge never came into play.`;
      }
      if (evaluation.decidedByEdge) {
        return `You won the mission, but the game finished level at ${scoreAfter.you} to ${scoreAfter.opp}, and your rival kept the Edge by passing first, so they win the tie. You needed one more point.`;
      }
      return `Your rival won the A mission and the game ${scoreAfter.opp} to ${scoreAfter.you}. Win the mission, and find one extra point so the Edge can't decide it.`;
    },
  },
];

export const duelKey = (duel: DuelDef) => duel.id;
