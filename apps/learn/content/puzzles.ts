import { PRACTICE_CARDS, practiceMission } from "@/lib/game/cards";
import type { PuzzleDef } from "@/lib/game/puzzle";
import type { CardCatalog, CardDef } from "@/lib/game/types";

/**
 * Lethal Puzzles: final-Round scenarios with exactly one winning line.
 * `pnpm --filter @naruto-tcg/learn verify:puzzles` brute-forces every line to
 * prove each solution is the unique win.
 *
 * Prior scores are kept reachable: before Round 4 only the D-rank mission
 * (scored 3 times), the C-rank mission (twice) and the B-rank mission (once)
 * have awarded points, so the two totals never exceed what those missions
 * could have paid out.
 */

/**
 * Puzzle-only practice card. Like every practice card, its stats and text are
 * invented for teaching; only the character is from Naruto.
 */
const NARUTO_NINE_TAILS: CardDef = {
  id: "naruto-nine-tails",
  name: "Naruto Uzumaki",
  title: "Nine-Tails Chakra Mode",
  cost: 5,
  power: 4,
  faction: "leaf",
  emblem: "chakra",
  keywords: ["Team 7", "Jinchuriki"],
  effects: [
    {
      trigger: "UPGRADE",
      spec: { kind: "powerup", amount: 2, target: "other-friendlies-here" },
      text: "POWERUP 2 on each other friendly character in this mission.",
    },
  ],
  flavor: "He shares the fox's chakra with everyone fighting beside him.",
};

const NINE_TAILS_RALLY_CARDS: CardCatalog = { ...PRACTICE_CARDS, [NARUTO_NINE_TAILS.id]: NARUTO_NINE_TAILS };

export const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "ambush-at-the-gate",
    order: 1,
    title: "Ambush at the Gate",
    difficulty: "Genin",
    emblem: "mask",
    tagline: "Five Chakra. One mission. Strike from the mist.",
    briefing:
      "Round 4, the final Round. Your opponent has already **passed**, so they hold the [[Edge token]] and win every tie. They lead **21 to 15** if nothing changes, all because of the A-rank mission **Defend the Leaf**. Take it with strictly more Power and the game is yours.",
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
      // Rounds 1–3 paid out 19 points: you took D twice and C once, they took D, C and B.
      score: { you: 8, opp: 11 },
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
        why: "Out of Chakra. Pass and score: you take Defend the Leaf (6 points) and win **21 to 15**.",
      },
    ],
    xp: 100,
  },
  {
    id: "nine-tails-rally",
    order: 2,
    title: "Nine-Tails Rally",
    difficulty: "Chunin",
    emblem: "spiral",
    tagline: "Three Narutos, one upgrade. The order is everything.",
    briefing:
      "Round 4, the final Round. Your opponent played Orochimaru, then **passed** to keep the [[Edge token]], so they win every tie. If nothing changes they win **25 to 14**: Itachi, Kisame and Orochimaru hold the B-rank **Find the Legendary Sannin** with **13 Power** (6 points, plus 1 from Orochimaru's [[SCORE]]). You have **7 Chakra**, Sakura and three versions of Naruto. Take that mission and the game is yours.",
    objective: "Win Find the Legendary Sannin with strictly more Power: you need 14 (they win ties).",
    teaches: ["upgrading", "upgrade", "powerup", "power-token", "edge-token"],
    hints: [
      "Hinata gives you 2 Power and you need **14**. Playing Sage Mode straight from your hand costs 5 of your 7 Chakra and skips its [[UPGRADE]] effect. There's a cheaper way into a 5-cost Naruto.",
      "[[upgrading|Upgrade]] the 2-cost Naruto and you pay only the 3 Chakra difference, keep his [[power tokens]] and fire the new card's UPGRADE. Sage Mode only boosts Naruto; Nine-Tails Chakra Mode boosts **everyone else** on the mission. Count both: one of them only ties.",
      "Naruto (Genin of the Leaf) first, then Sakura, **then** upgrade him to Nine-Tails Chakra Mode, so Sakura is already there to collect its [[POWERUP]].",
    ],
    cards: NINE_TAILS_RALLY_CARDS,
    setup: {
      round: 4,
      missions: [
        {
          def: practiceMission("catch-tora", "D"),
          units: [
            { side: "you", stack: ["rock-lee"] },
            { side: "you", stack: ["shikamaru-shadow"] },
            { side: "opp", stack: ["haku-ice"] },
          ],
        },
        {
          def: practiceMission("bridge-escort", "C"),
          units: [
            { side: "you", stack: ["neji-gentle-fist"] },
            { side: "opp", stack: ["zabuza-demon"] },
            { side: "opp", stack: ["temari-wind"] },
          ],
        },
        {
          def: practiceMission("find-tsunade", "B"),
          units: [
            { side: "you", stack: ["hinata-byakugan"] },
            { side: "opp", stack: ["itachi-akatsuki"] },
            { side: "opp", stack: ["kisame-shark"] },
            { side: "opp", stack: ["orochimaru-sannin"] },
          ],
        },
        { def: practiceMission("defend-the-leaf", "A"), units: [{ side: "you", stack: ["choji-akimichi"] }] },
      ],
      // Start phase: you 5 + 4 characters = 9, minus Choji (2). They 5 + 5 = 10, minus Orochimaru (5).
      chakra: { you: 7, opp: 5 },
      hands: { you: ["naruto-genin", "naruto-sage", "naruto-nine-tails", "sakura-medic"], opp: [] },
      edge: "opp",
      passed: { opp: true },
      active: "you",
      // Rounds 1–3 paid out 20 points: you took D three times, they took C twice and B once.
      score: { you: 6, opp: 14 },
    },
    opponentScript: [],
    solution: [
      {
        action: { type: "play", side: "you", cardId: "naruto-genin", missionId: "find-tsunade", hidden: false },
        why: "Start with the 2-cost Naruto. His [[MAIN]] effect is POWERUP 1, so he is 3 Power and ready to be [[upgrading|upgraded]]. Mission: 5 to 13.",
      },
      {
        action: { type: "play", side: "you", cardId: "sakura-medic", missionId: "find-tsunade", hidden: false },
        why: "Sakura's MAIN puts a [[Power token]] on each other friendly character here: Hinata 3, Naruto 4. She has to land **after** Naruto to boost him, and **before** the upgrade so she's there to be boosted in turn. Mission: 8 to 13.",
      },
      {
        action: { type: "upgrade", side: "you", cardId: "naruto-nine-tails", uid: "u12" },
        why: "Upgrade for just 3 Chakra (5 minus 2). Naruto keeps his 2 tokens (4 printed + 2 = 6) and the [[UPGRADE]] effect gives Hinata and Sakura 2 tokens each: Hinata 5, Sakura 3. Mission: **14 to 13**. Sage Mode would only have tied at 13, and the Edge breaks ties for them.",
      },
      {
        action: { type: "pass", side: "you" },
        why: "Out of Chakra. Pass and score: you take Find the Legendary Sannin (6 points), and Orochimaru's SCORE never fires. You win **20 to 18**.",
      },
    ],
    xp: 150,
  },
  {
    id: "eyes-in-the-mist",
    order: 3,
    title: "Eyes in the Mist",
    difficulty: "Jonin",
    emblem: "eye",
    tagline: "They have a plan. Break it before it breaks you.",
    briefing:
      "Round 4, the final Round. You hold the [[Edge token]]: you opened with Rock Lee on Defend the Leaf, they answered with a face-down card there, and it's your turn again. Your scouts have read their face-down card on **Rescue the Kazekage**: it's **Zabuza**, whose [[AMBUSH]] defeats an enemy with Power 3 or less there. Their plan, in order: a face-down card on Defend the Leaf, **Temari** onto Rescue the Kazekage (her [[MAIN]] effect [[hide|hides]] a face-up enemy with Power 2 or less there), a face-down card on Forest of Death, then flip Zabuza. If you simply [[pass]] now, they win **24 to 14**.",
    objective: "Win the game. You start with the Edge: keep it, and every tie is yours.",
    teaches: ["hidden", "ambush", "defeat", "hide", "edge-token"],
    hints: [
      "A [[hidden]] character has **0 Power**, so an effect that hits 'Power 2 or less' can hit the face-down Zabuza. Hinata's [[AMBUSH]] does exactly that, but only when you [[reveal]] her.",
      "Temari hides a face-up enemy with Power 2 or less when she lands, so a face-up Hinata is exposed. A face-down card can't be hidden again. Flip Hinata **after** Temari lands and **before** Zabuza's turn comes round.",
      "Hinata face-down on Rescue the Kazekage, then Sakura on the same mission (her token reaches the face-down Hinata too), then reveal Hinata, then pass.",
    ],
    cards: PRACTICE_CARDS,
    setup: {
      round: 4,
      missions: [
        {
          def: practiceMission("catch-tora", "D"),
          units: [
            { side: "you", stack: ["naruto-genin"] },
            { side: "opp", stack: ["haku-ice"] },
          ],
        },
        {
          def: practiceMission("forest-of-death", "C"),
          units: [
            { side: "you", stack: ["shikamaru-shadow"] },
            { side: "opp", stack: ["kankuro-puppet"] },
            { side: "opp", stack: ["itachi-akatsuki"] },
          ],
        },
        {
          def: practiceMission("rescue-kazekage", "B"),
          units: [
            { side: "you", stack: ["neji-gentle-fist"] },
            { side: "opp", stack: ["kisame-shark"] },
            { side: "opp", stack: ["zabuza-demon"], hidden: true },
          ],
        },
        {
          // Both cards here were played this Round: your Rock Lee, then their face-down reply.
          def: practiceMission("defend-the-leaf", "A"),
          units: [
            { side: "you", stack: ["rock-lee"] },
            { side: "opp", stack: ["orochimaru-sannin"], hidden: true },
          ],
        },
      ],
      // Start phase: you 5 + 3 characters = 8, minus Rock Lee (3). They 5 + 5 characters = 10, minus 1.
      chakra: { you: 5, opp: 9 },
      hands: {
        you: ["hinata-byakugan", "sakura-medic", "kakashi-copy", "choji-akimichi"],
        opp: ["kankuro-puppet", "temari-wind", "haku-ice"],
      },
      edge: "you",
      // Rounds 1–3 paid out 20 points: you took D and C once each, they took D twice, C once and B.
      score: { you: 6, opp: 14 },
    },
    opponentScript: [
      { type: "play", cardId: "kankuro-puppet", missionId: "defend-the-leaf", hidden: true },
      { type: "play", cardId: "temari-wind", missionId: "rescue-kazekage", hidden: false },
      { type: "play", cardId: "haku-ice", missionId: "forest-of-death", hidden: true },
      { type: "reveal", uid: "u8" },
    ],
    solution: [
      {
        action: { type: "play", side: "you", cardId: "hinata-byakugan", missionId: "rescue-kazekage", hidden: true },
        why: "Place Hinata [[hidden]] for 1 Chakra. A face-down card can't be hidden again, so Temari's effect can't touch her. Revealing her straight away would fail: Temari would land next and hide her.",
      },
      {
        action: { type: "play", side: "you", cardId: "sakura-medic", missionId: "rescue-kazekage", hidden: false },
        why: "Sakura's MAIN gives a [[Power token]] to each other friendly character here, face-down Hinata included: Neji is now 4. Temari arrives next and hides Sakura, your only face-up character with Power 2 or less, but the tokens Sakura handed out stay put.",
      },
      {
        action: { type: "reveal", side: "you", uid: "u11" },
        why: "Temari has landed, so it's safe to flip. Pay 2 to [[reveal]]: MAIN and [[AMBUSH]] both fire. Face-down Zabuza has 0 Power, so Hinata [[defeat|defeats]] him before he can strike. With her token she has 3 Power. Mission: 7 to 7.",
      },
      {
        action: { type: "pass", side: "you" },
        why: "Out of Chakra, and passing first keeps the [[Edge token]]. Their last move, flipping Zabuza, is gone, so they pass second. Rescue the Kazekage ties 7 to 7 and Catch Tora the Cat 2 to 2: the Edge takes both, and you win **20 to 18**.",
      },
    ],
    xp: 200,
  },
];

export function getPuzzle(id: string): PuzzleDef | undefined {
  return PUZZLES.find((p) => p.id === id);
}

export const puzzleKey = (id: string) => `puzzle:${id}`;
