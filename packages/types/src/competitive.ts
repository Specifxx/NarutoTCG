import type { DeckEntry } from "./index";

/**
 * Competitive play domain model. This is the canonical tournament record format:
 * seed data, the TO import wizard and any scraper output all normalize to it.
 */

export type EventTier = "store-championship" | "online-open" | "regional-championship" | "national-championship";

export type MatchStage = "swiss" | "top-cut";

/** Who won the match. A bye always has `player2Id: null` and outcome `"bye"`. */
export type MatchOutcome = "p1" | "p2" | "draw" | "bye";

/** A tournament-legal list: one Leader kept outside the main deck, plus the main deck. */
export interface Decklist {
  leaderId: string;
  cards: DeckEntry[];
}

export interface EventLocation {
  city?: string;
  region?: string;
  country?: string;
  venue?: string;
  online?: boolean;
}

export interface TournamentPlayer {
  /** Unique within the tournament; a url-safe slug. Doubles as the global player handle. */
  id: string;
  name: string;
  country?: string;
  /** Normalized archetype id, or `"rogue"` when it does not match a known archetype. */
  archetypeId: string;
  /** Final standing, 1-based, unique within the event. */
  placement: number;
  /** True when the player dropped before the end of Swiss. */
  dropped?: boolean;
  /** Published list; usually only available for top cut players. */
  decklist?: Decklist;
}

export interface MatchRecord {
  /** 1-based. Top cut rounds continue the numbering after the last Swiss round. */
  round: number;
  stage: MatchStage;
  table?: number;
  player1Id: string;
  /** `null` for a bye. */
  player2Id: string | null;
  outcome: MatchOutcome;
  /** Individual game score for best-of-three matches. */
  games?: { p1: number; p2: number };
  /** Intentional draw: counts for standings but is excluded from win-rate statistics. */
  intentionalDraw?: boolean;
}

export interface Tournament {
  /** url-safe slug; imported events are prefixed with `local-`. */
  id: string;
  name: string;
  tier: EventTier;
  /** Format label, e.g. "Standard (NT01–NT04)". */
  format: string;
  /** ISO date (YYYY-MM-DD) of the final day. */
  date: string;
  location: EventLocation;
  organizer: string;
  swissRounds: number;
  /** 0 when there is no single-elimination cut. */
  topCutSize: number;
  bestOf: 1 | 3;
  players: TournamentPlayer[];
  matches: MatchRecord[];
  source: "seed" | "import";
  /** ISO timestamp, set when an event was imported through the wizard or CLI. */
  importedAt?: string;
  notes?: string;
}
