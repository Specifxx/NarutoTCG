import { useCallback } from "react";
import type { DeckComment } from "@/lib/decks/types";
import { createLocalStore, useLocalStore } from "./local-store";

/** Per-browser community state: deck votes, posted comments, comment votes and display name. */

export type Vote = 1 | -1;

const isVote = (v: unknown): v is Vote => v === 1 || v === -1;

function parseVoteMap(raw: unknown): Record<string, Vote> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, Vote> = {};
  for (const [key, value] of Object.entries(raw)) if (isVote(value)) out[key] = value;
  return out;
}

/** Longest display name and comment body kept (the comment form enforces the same limits). */
export const COMMENT_AUTHOR_MAX = 40;
export const COMMENT_BODY_MAX = 2000;
/** Comments kept per deck; the oldest go first. Orphaned replies are shown as top-level comments. */
export const MAX_STORED_COMMENTS_PER_DECK = 500;

const ANONYMOUS = "Anonymous Shinobi";

type StoredComment = Omit<DeckComment, "votes"> & { votes?: unknown };

const isStoredComment = (c: unknown): c is StoredComment => {
  if (!c || typeof c !== "object") return false;
  const r = c as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.deckId === "string" &&
    (r.parentId === null || typeof r.parentId === "string") &&
    typeof r.author === "string" &&
    typeof r.body === "string" &&
    typeof r.createdAt === "string"
  );
};

/**
 * Stored comments, repaired and bounded: tampered or corrupt storage must never break the deck
 * page. Records missing a required field are dropped; a vote count that is not a finite number
 * reads as 0 (comments from this browser always start at 0); author and body are clamped to the
 * form's limits; and only the newest {@link MAX_STORED_COMMENTS_PER_DECK} per deck are kept.
 */
export function parseComments(raw: unknown): DeckComment[] | null {
  if (!Array.isArray(raw)) return null;
  const kept: DeckComment[] = [];
  const perDeck = new Map<string, number>();
  // Newest last in storage: walk backwards to keep the newest per deck, then restore the order.
  for (let i = raw.length - 1; i >= 0; i--) {
    const c: unknown = raw[i];
    if (!isStoredComment(c)) continue;
    const count = perDeck.get(c.deckId) ?? 0;
    if (count >= MAX_STORED_COMMENTS_PER_DECK) continue;
    perDeck.set(c.deckId, count + 1);
    kept.push({
      id: c.id,
      deckId: c.deckId,
      parentId: c.parentId,
      author: c.author.slice(0, COMMENT_AUTHOR_MAX),
      body: c.body.slice(0, COMMENT_BODY_MAX),
      createdAt: c.createdAt,
      votes: typeof c.votes === "number" && Number.isFinite(c.votes) ? c.votes : 0,
    });
  }
  return kept.reverse();
}

const NO_VOTES: Record<string, Vote> = {};
const NO_COMMENTS: DeckComment[] = [];

export const deckVotesStore = createLocalStore("ntcg.decks.votes.v1", NO_VOTES, parseVoteMap);
export const commentVotesStore = createLocalStore("ntcg.decks.comment-votes.v1", NO_VOTES, parseVoteMap);
export const commentsStore = createLocalStore("ntcg.decks.comments.v1", NO_COMMENTS, parseComments);
export const handleStore = createLocalStore("ntcg.decks.handle.v1", "", (raw) =>
  typeof raw === "string" ? raw.slice(0, COMMENT_AUTHOR_MAX) : null,
);

function useVote(store: typeof deckVotesStore, id: string): [Vote | 0, (vote: Vote) => void] {
  const [votes, setVotes] = useLocalStore(store);
  const toggle = useCallback(
    (vote: Vote) =>
      setVotes((prev) => {
        const next = { ...prev };
        if (next[id] === vote) delete next[id];
        else next[id] = vote;
        return next;
      }),
    [id, setVotes],
  );
  return [votes[id] ?? 0, toggle];
}

/** This browser's vote on a deck; calling the setter with the current vote clears it. */
export function useDeckVote(deckId: string) {
  return useVote(deckVotesStore, deckId);
}

export function useCommentVote(commentId: string) {
  return useVote(commentVotesStore, commentId);
}

/** Comments posted from this browser for one deck, oldest first. */
export function useLocalComments(deckId: string): DeckComment[] {
  const [all] = useLocalStore(commentsStore);
  return all.filter((c) => c.deckId === deckId);
}

export function addLocalComment(input: { deckId: string; parentId: string | null; author: string; body: string }): DeckComment {
  const comment: DeckComment = {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    deckId: input.deckId,
    parentId: input.parentId,
    author: input.author.trim().slice(0, COMMENT_AUTHOR_MAX) || ANONYMOUS,
    body: input.body.trim().slice(0, COMMENT_BODY_MAX),
    createdAt: new Date().toISOString(),
    votes: 0,
  };
  commentsStore.set((prev) => [...prev, comment]);
  return comment;
}

export function useHandle() {
  return useLocalStore(handleStore);
}
