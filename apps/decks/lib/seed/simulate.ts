import type { MatchRecord } from "@naruto-tcg/types";
import { createRng, type Rng } from "@/lib/random";
import {
  ARCHETYPE_RATINGS,
  DROP_FROM_ROUND,
  DROP_ONE_WIN_MIN_LOSSES,
  DROP_RATE_ONE_WIN,
  DROP_RATE_WINLESS,
  INTENTIONAL_DRAW_CUSHION,
  INTENTIONAL_DRAW_RATE,
  MATCHUP_ADJUSTMENTS,
  SKILL_SCALE,
  TIME_DRAW_RATE,
} from "@/lib/seed/config";
import { computeRecords, computeSwissStandings } from "@/lib/tournament/standings";
import { pairSwissRound } from "@/lib/tournament/swiss";
import { runTopCut, type TopCutResult } from "@/lib/tournament/topcut";

/** What the match model needs to know about a player at one event. */
export interface Competitor {
  id: string;
  archetypeId: string;
  skill: number;
}

export interface SimulateEventArgs {
  /** Namespaces the event's random streams, so each event is reproducible on its own. */
  seed: string;
  competitors: readonly Competitor[];
  swissRounds: number;
  topCutSize: number;
}

export interface SimulatedEvent {
  /** Sorted by round, then table; byes last within their round. */
  matches: MatchRecord[];
  droppedIds: Set<string>;
}

type GameScore = { p1: number; p2: number };

const ADJUSTMENTS = new Map<string, number>();
for (const [a, b, logit] of MATCHUP_ADJUSTMENTS) {
  ADJUSTMENTS.set(`${a}|${b}`, logit);
  ADJUSTMENTS.set(`${b}|${a}`, -logit);
}

/** Antisymmetric matchup term in logits from `a`'s side; 0 for mirrors and unlisted pairs. */
export function matchupAdjustment(a: string, b: string): number {
  return a === b ? 0 : (ADJUSTMENTS.get(`${a}|${b}`) ?? 0);
}

/** P(a wins the match) = logistic(rating gap + matchup adjustment + scaled skill gap). */
export function matchWinProbability(a: Omit<Competitor, "id">, b: Omit<Competitor, "id">): number {
  const logit =
    (ARCHETYPE_RATINGS[a.archetypeId] ?? 0) -
    (ARCHETYPE_RATINGS[b.archetypeId] ?? 0) +
    matchupAdjustment(a.archetypeId, b.archetypeId) +
    SKILL_SCALE * (a.skill - b.skill);
  return 1 / (1 + Math.exp(-logit));
}

/** Per-game win probability whose best-of-three win probability, p²(3 − 2p), equals `matchP`. */
export function gameWinProbability(matchP: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (mid * mid * (3 - 2 * mid) < matchP) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function playBestOfThree(gameP: number, rng: Rng): GameScore {
  const score = { p1: 0, p2: 0 };
  while (score.p1 < 2 && score.p2 < 2) {
    if (rng() < gameP) score.p1++;
    else score.p2++;
  }
  return score;
}

function decided(games: GameScore): Required<TopCutResult> {
  return { outcome: games.p1 > games.p2 ? "p1" : "p2", games };
}

/**
 * Simulates a full event: Swiss with drops and last-round intentional draws, then a single
 * elimination top cut (no draws). Deterministic for a given seed.
 */
export function simulateEvent(args: SimulateEventArgs): SimulatedEvent {
  const { seed, competitors, swissRounds, topCutSize } = args;
  const byId = new Map(competitors.map((c) => [c.id, c]));
  const players = competitors.map((c) => ({ id: c.id, dropped: false }));
  const pairingRng = createRng(`${seed}:pairings`);
  const resultRng = createRng(`${seed}:results`);
  const dropRng = createRng(`${seed}:drops`);
  const matches: MatchRecord[] = [];

  const play = (player1Id: string, player2Id: string) =>
    playBestOfThree(gameWinProbability(matchWinProbability(byId.get(player1Id)!, byId.get(player2Id)!)), resultRng);

  for (let round = 1; round <= swissRounds; round++) {
    const pairings = pairSwissRound({ round, players, matches, rng: pairingRng });

    // Last round: players comfortably above the cut line may draw into the top cut.
    let lockedPoints = Number.POSITIVE_INFINITY;
    const points = new Map<string, number>();
    if (round === swissRounds && topCutSize > 0) {
      const standings = computeSwissStandings(players, matches, { throughRound: round - 1 }).filter((row) => !row.dropped);
      for (const row of standings) points.set(row.playerId, row.matchPoints);
      const cutLine = standings[Math.min(topCutSize, standings.length) - 1];
      if (cutLine) lockedPoints = cutLine.matchPoints + INTENTIONAL_DRAW_CUSHION;
    }
    const locked = (id: string) => (points.get(id) ?? 0) >= lockedPoints;

    let table = 0;
    for (const { player1Id, player2Id } of pairings) {
      if (player2Id === null) {
        matches.push({ round, stage: "swiss", player1Id, player2Id: null, outcome: "bye" });
        continue;
      }
      const base = { round, stage: "swiss" as const, table: ++table, player1Id, player2Id };
      if (locked(player1Id) && locked(player2Id) && resultRng() < INTENTIONAL_DRAW_RATE) {
        matches.push({ ...base, outcome: "draw", intentionalDraw: true });
      } else if (resultRng() < TIME_DRAW_RATE) {
        matches.push({ ...base, outcome: "draw", games: { p1: 1, p2: 1 } });
      } else {
        matches.push({ ...base, ...decided(play(player1Id, player2Id)) });
      }
    }

    if (round >= DROP_FROM_ROUND && round < swissRounds) {
      const records = computeRecords(matches, { stage: "swiss" });
      for (const player of players) {
        const record = records.get(player.id);
        if (player.dropped || !record) continue;
        const rate =
          record.wins === 0
            ? DROP_RATE_WINLESS
            : record.wins === 1 && record.losses >= DROP_ONE_WIN_MIN_LOSSES
              ? DROP_RATE_ONE_WIN
              : 0;
        if (rate > 0 && dropRng() < rate) player.dropped = true;
      }
    }
  }

  if (topCutSize > 0) {
    const seeds = computeSwissStandings(players, matches)
      .filter((row) => !row.dropped)
      .slice(0, topCutSize)
      .map((row) => row.playerId);
    matches.push(...runTopCut({ seeds, swissRounds, resolve: (p1, p2) => decided(play(p1, p2)) }));
  }

  return { matches, droppedIds: new Set(players.filter((p) => p.dropped).map((p) => p.id)) };
}
