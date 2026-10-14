import { PRACTICE_CARDS, practiceMission } from "@/lib/game/cards";
import type { PuzzleDef } from "@/lib/game/puzzle";

/**
 * Lethal Puzzles: final-Round scenarios with exactly one winning line.
 * `pnpm --filter @naruto-tcg/learn verify:puzzles` brute-forces every line to
 * prove each solution is the unique win.
 */
export const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "ambush-at-the-gate",
    order: 1,
    title: "Ambush at the Gate",
    difficulty: "Genin",
    emblem: "mask",
    tagline: "Five Chakra. One mission. Strike from the mist.",
    briefing:
      "Round 4, the final Round. Your opponent has already **passed**, so they hold the [[Edge token]] and win every tie. They lead **24 to 19** if nothing changes, all because of the A-rank mission **Defend the Leaf**. Take it with strictly more Power and the game is yours.",
    objective: "Win Defend the Leaf with strictly more Power than your opponent (they win ties).",
    teaches: ["hidden", "ambush", "reveal", "edge-token"],
    hints: [
      "Count the gap on Defend the Leaf: you need **more than 8** Power and you have 4.",
      "You can't play a second Rock Lee there, and Kakashi face-up only adds 3.",
      "Play Kakashi **hidden** for 1 Chakra, then reveal him for 4 on your next turn. Since your opponent has passed, you take turns back to back.",
    ],
    cards: PRACTICE_CARDS,
    setup: {
      round: 4,
      missions: [
        { def: practiceMission("catch-tora", "D"), units: [{ side: "you", stack: ["naruto-genin"] }] },
        {
          def: practiceMission("bridge-escort", "C"),
          units: [
            { side: "you", stack: ["ino-yamanaka"] },
            { side: "opp", stack: ["zabuza-demon"] },
            { side: "opp", stack: ["haku-ice"] },
            { side: "opp", stack: ["kankuro-puppet"] },
          ],
        },
        {
          def: practiceMission("forest-of-death", "B"),
          units: [
            { side: "you", stack: ["neji-gentle-fist"] },
            { side: "you", stack: ["hinata-byakugan"] },
            { side: "opp", stack: ["temari-wind"] },
          ],
        },
        {
          def: practiceMission("defend-the-leaf", "A"),
          units: [
            { side: "you", stack: ["rock-lee"] },
            { side: "opp", stack: ["kisame-shark"] },
            { side: "opp", stack: ["gaara-sand"] },
          ],
        },
      ],
      chakra: { you: 5, opp: 0 },
      hands: { you: ["kakashi-copy", "rock-lee", "choji-akimichi"], opp: [] },
      edge: "opp",
      passed: { opp: true },
      active: "you",
      score: { you: 12, opp: 14 },
    },
    opponentScript: [],
    solution: [
      {
        action: { type: "play", side: "you", cardId: "kakashi-copy", missionId: "defend-the-leaf", hidden: true },
        why: "Placing a card [[hidden]] costs only 1 Chakra, whatever its printed cost. It adds 0 Power for now.",
      },
      {
        action: { type: "reveal", side: "you", uid: "u12" },
        why: "Reveal for Kakashi's printed cost of 4. Revealing fires MAIN **and** [[AMBUSH]]: POWERUP 2 makes him 5 Power, so the mission is 9 to 8.",
      },
      {
        action: { type: "pass", side: "you" },
        why: "Out of Chakra. Pass and score: you take Defend the Leaf (6 points) and win **25 to 18**.",
      },
    ],
    xp: 100,
  },
];

export function getPuzzle(id: string): PuzzleDef | undefined {
  return PUZZLES.find((p) => p.id === id);
}

export const puzzleKey = (id: string) => `puzzle:${id}`;
