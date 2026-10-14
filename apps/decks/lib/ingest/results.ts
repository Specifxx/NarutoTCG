import type { MatchOutcome, MatchStage } from "@naruto-tcg/types";
import type { WLD } from "@/lib/meta/types";
import { foldDiacritics, normalizeName } from "./text";

export interface ParsedMatchResult {
  outcome: MatchOutcome;
  games?: { p1: number; p2: number };
  intentionalDraw?: boolean;
}

/** Names from the same pairing row, used to read a winner's name. */
export interface MatchResultContext {
  winnerName?: string;
  player1Name?: string;
  player2Name?: string | null;
}

/** Result words, read from player 1's point of view. */
const OUTCOME_WORDS = new Map<string, MatchOutcome>(Object.entries({
  w: "p1", win: "p1", wins: "p1", won: "p1", p1: "p1", player1: "p1", "player 1": "p1", "p1 win": "p1", "p1 wins": "p1",
  "player 1 win": "p1", "player 1 wins": "p1",
  l: "p2", loss: "p2", lose: "p2", lost: "p2", p2: "p2", player2: "p2", "player 2": "p2", "p2 win": "p2", "p2 wins": "p2",
  "player 2 win": "p2", "player 2 wins": "p2",
  d: "draw", t: "draw", draw: "draw", drew: "draw", drawn: "draw", tie: "draw", tied: "draw",
  bye: "bye",
} satisfies Record<string, MatchOutcome>));
const INTENTIONAL_DRAW = new Set(["id", "i d", "intentional draw", "intentional", "ided", "idd"]);
const SCORE = /(\d+)\s*[-–—:/]\s*(\d+)(?:\s*[-–—:/]\s*(\d+))?/;

function nameOutcome(text: string, context: MatchResultContext): MatchOutcome | null {
  const key = normalizeName(text);
  if (!key) return null;
  if (context.player1Name && key === normalizeName(context.player1Name)) return "p1";
  if (context.player2Name && key === normalizeName(context.player2Name)) return "p2";
  return null;
}

const flip = (games: { p1: number; p2: number }) => ({ p1: games.p2, p2: games.p1 });

/**
 * Reads a match result from player 1's point of view. Accepts game scores ("2-1", "0-2",
 * "1-1" draw, "1-1-1" as wins-losses-draws), match scores ("1-0", "0-1"), "W"/"L"/"D",
 * "win"/"loss"/"draw"/"tie", "ID"/"intentional draw", "bye", "P1"/"P2"/"player 1", a player's
 * name, and combinations such as "W 2-1". When the result is empty, `winnerName` decides.
 * A score that contradicts the stated winner is taken as written from the winner's side.
 * Returns null when nothing can be read.
 */
export function parseMatchResult(raw: string | null | undefined, context: MatchResultContext = {}): ParsedMatchResult | null {
  const text = foldDiacritics(raw ?? "").trim().toLowerCase();
  const words = text.replace(/[^a-z0-9]+/g, " ").trim();
  if (INTENTIONAL_DRAW.has(words)) return { outcome: "draw", intentionalDraw: true };
  if (words === "bye") return { outcome: "bye" };

  let games: { p1: number; p2: number } | undefined;
  let scoreOutcome: MatchOutcome | null = null;
  const score = text.match(SCORE);
  if (score) {
    const [p1, p2] = [Number(score[1]), Number(score[2])];
    scoreOutcome = p1 > p2 ? "p1" : p1 < p2 ? "p2" : "draw";
    if (p1 + p2 > 1) games = { p1, p2 };
  }
  const remainder = score ? text.replace(score[0], " ") : text;
  const rest = remainder.replace(/[^a-z0-9]+/g, " ").trim();
  if (score && INTENTIONAL_DRAW.has(rest)) return { outcome: "draw", intentionalDraw: true };

  const winner = context.winnerName ?? "";
  const stated =
    OUTCOME_WORDS.get(rest) ?? nameOutcome(remainder, context) ?? OUTCOME_WORDS.get(normalizeName(winner)) ?? nameOutcome(winner, context);

  if (!score) return stated ? { outcome: stated } : null;
  if (!stated || stated === scoreOutcome) return { outcome: scoreOutcome!, ...(games ? { games } : {}) };
  if (stated === "bye") return { outcome: "bye" };
  if (scoreOutcome !== "draw" && stated !== "draw" && games) return { outcome: stated, games: flip(games) };
  return { outcome: stated };
}

/** "5-1-1", "5/1/1" or "5-1" (optionally followed by a parenthetical) → W/L/D; null otherwise. */
export function parseRecord(raw: string | null | undefined): WLD | null {
  const match = (raw ?? "").trim().match(/^(\d+)\s*[-–—/]\s*(\d+)(?:\s*[-–—/]\s*(\d+))?(?:\s*\(.*\))?$/);
  if (!match) return null;
  return { wins: Number(match[1]), losses: Number(match[2]), draws: match[3] ? Number(match[3]) : 0 };
}

/** A round cell: a number ("3", "R3", "Round 3") or a top cut label ("Top 8", "Semifinals"). */
export type RoundLabel = { round: number } | { cutSize: number };

const CUT_NAMES: ReadonlyArray<[RegExp, number]> = [
  [/^(quarter ?finals?|quarters|qf)$/, 8],
  [/^(semi ?finals?|semis|sf)$/, 4],
  [/^(grand )?finals?$|^championship$/, 2],
];

/** Reads a round cell; top cut labels give the bracket size they start ("Top 8" → 8, "Finals" → 2). */
export function parseRoundLabel(raw: string): RoundLabel | null {
  const key = normalizeName(raw);
  const numbered = key.match(/^(?:r|rd|rnd|round)?\s*(\d+)$/);
  if (numbered) return Number(numbered[1]) >= 1 ? { round: Number(numbered[1]) } : null;
  const cut = key.match(/^(?:top|t|round of|ro)\s*(\d+)$/);
  if (cut) {
    const size = Number(cut[1]);
    return size >= 2 && Number.isInteger(Math.log2(size)) ? { cutSize: size } : null;
  }
  const named = CUT_NAMES.find(([pattern]) => pattern.test(key));
  return named ? { cutSize: named[1] } : null;
}

/** "Swiss" → swiss; "Top cut", "Playoffs", "Elimination", "Top 8", "Finals" → top-cut; else null. */
export function parseStage(raw: string): MatchStage | null {
  const key = normalizeName(raw);
  if (/\b(swiss|pools?|round robin|rr|qualifiers?)\b/.test(key)) return "swiss";
  if (/\b(top|cut|playoffs?|elim|elimination|bracket|single|knockout|ko|t\d+|finals?|semi ?finals?|semis|quarter ?finals?|quarters)\b/.test(key)) {
    return "top-cut";
  }
  return null;
}

const BYE_TOKENS = new Set(["", "bye", "na", "n a", "none", "null", "no opponent"]);

/** True for an empty opponent cell or a bye marker ("BYE", "-", "(bye)", "N/A"). */
export function isByeToken(raw: string | null | undefined): boolean {
  return BYE_TOKENS.has(normalizeName(raw ?? ""));
}
