/**
 * Simulator Standard format.
 *
 * Round structure, Hidden play, Ambush, Upgrade, Edge and Mission scoring follow the
 * official Naruto Mythos TCG rulebook. Deck construction (40 main / 1 Leader / 3 copies),
 * the Leader zone and the Draw Card / Add Power Token actions are simulator-format rules.
 */
export const FORMAT = {
  name: "Simulator Standard",
  mainDeckSize: 40,
  leaderCount: 1,
  missionCount: 3,
  maxCopiesPerName: 3,
  rounds: 4,
  openingHand: 5,
  mulligans: 1,
  drawPerRound: 2,
  baseChakra: 5,
  chakraPerCharacter: 1,
  hiddenCost: 1,
  /** Add Power Token action: pay this, put one +1 Power token on a face-up friendly character. */
  powerTokenCost: 1,
  /** Draw Card action: pay this, draw one card. */
  drawCardCost: 2,
  missionsPerPlayer: 2,
  minPowerToWin: 1,
} as const;

export type MissionRank = "D" | "C" | "B" | "A";

/** Mission slots in reveal order: one is revealed at the start of each round. */
export const MISSION_RANKS: readonly MissionRank[] = ["D", "C", "B", "A"];

export const RANK_BONUS: Record<MissionRank, number> = { D: 1, C: 2, B: 3, A: 4 };
