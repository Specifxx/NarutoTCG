import type { MatchupGuide } from "@/lib/data/guides";
import type { DeckComment } from "@/lib/decks/types";
import type { TierId, WLD } from "@/lib/meta/types";

/** One opponent in the deck's matchup guide: head-to-head numbers plus the strategy guide. */
export interface MatchupEntry {
  opponentId: string;
  record: WLD;
  games: number;
  /** The deck's archetype win rate against the opponent; null without games. */
  winRate: number | null;
  interval: [number, number] | null;
  lowSample: boolean;
  /** The opponent's share of all entries in the snapshot, 0..1. */
  opponentShare: number;
  guide: MatchupGuide | null;
}

/**
 * Everything the deck page needs beyond the deck itself, computed on the server from seed data.
 * Plain JSON so it can cross the server/client boundary; imported decks get {@link EMPTY_DECK_CONTEXT}.
 */
export interface DeckContext {
  /** Seed tier of the deck's archetype; null when unknown (imported decks). */
  tier: TierId | null;
  /** Most-played opponents first; the mirror is left out. */
  matchups: MatchupEntry[];
  /** Matchups with fewer games than this are flagged low-sample. */
  minGames: number;
  /** Events the matchup numbers come from. */
  eventCount: number;
  /** Seed comments, oldest first. */
  comments: DeckComment[];
}

export const EMPTY_DECK_CONTEXT: DeckContext = { tier: null, matchups: [], minGames: 0, eventCount: 0, comments: [] };
