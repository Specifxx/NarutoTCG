import type { Decklist, EventTier } from "@naruto-tcg/types";

/** Directory row for a deck: a tournament list or a community-published list. */
export interface DeckSummary {
  /**
   * Tournament decks: `${tournamentId}--${playerId}`. Community decks: `community--${slug}`.
   * Slugs never contain `--`, so the separator is unambiguous.
   */
  id: string;
  name: string;
  archetypeId: string;
  leaderId: string;
  source: "tournament" | "community";
  /** Pilot for tournament decks, author for community decks. `handle` keys /players/[handle]. */
  author: { handle: string; name: string; country?: string };
  /** ISO date: the event date or the publish date. */
  createdAt: string;
  tournament?: {
    id: string;
    name: string;
    tier: EventTier;
    date: string;
    placement: number;
    playerCount: number;
    topCutSize: number;
  };
  /** Event record (tournament decks; byes count as wins) or logged playtest record (community decks). */
  record?: { wins: number; losses: number; draws: number };
  /** (wins + draws / 2) / games, 0..1; undefined when no games. Byes are excluded. */
  winRate?: number;
  winRateSource: "event" | "playtest";
  /** Seed upvote count; client-side votes are layered on top. */
  votes: number;
  /** Up to three highlight cards for the directory card preview. */
  keyCardIds: string[];
  tags: string[];
}

export interface DeckDetail extends DeckSummary {
  decklist: Decklist;
  /** Markdown-free plain paragraphs; community decks carry an author write-up. */
  description?: string[];
  /** Author's own notes for specific matchups, keyed by opponent archetype id. */
  matchupNotes?: Record<string, string>;
}

export interface DeckComment {
  id: string;
  deckId: string;
  /** Null for top-level comments. */
  parentId: string | null;
  author: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  votes: number;
}

export const DECK_ID_SEPARATOR = "--";
export const COMMUNITY_PREFIX = "community";

export function tournamentDeckId(tournamentId: string, playerId: string): string {
  return `${tournamentId}${DECK_ID_SEPARATOR}${playerId}`;
}

export function communityDeckId(slug: string): string {
  return `${COMMUNITY_PREFIX}${DECK_ID_SEPARATOR}${slug}`;
}

export type ParsedDeckId =
  | { kind: "community"; slug: string }
  | { kind: "tournament"; tournamentId: string; playerId: string }
  | null;

export function parseDeckId(id: string): ParsedDeckId {
  const parts = id.split(DECK_ID_SEPARATOR);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return parts[0] === COMMUNITY_PREFIX
    ? { kind: "community", slug: parts[1] }
    : { kind: "tournament", tournamentId: parts[0], playerId: parts[1] };
}
