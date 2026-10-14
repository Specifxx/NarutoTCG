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

function parseComments(raw: unknown): DeckComment[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (c): c is DeckComment =>
      !!c &&
      typeof c === "object" &&
      typeof c.id === "string" &&
      typeof c.deckId === "string" &&
      (c.parentId === null || typeof c.parentId === "string") &&
      typeof c.author === "string" &&
      typeof c.body === "string" &&
      typeof c.createdAt === "string",
  );
}

const NO_VOTES: Record<string, Vote> = {};
const NO_COMMENTS: DeckComment[] = [];

export const deckVotesStore = createLocalStore("ntcg.decks.votes.v1", NO_VOTES, parseVoteMap);
export const commentVotesStore = createLocalStore("ntcg.decks.comment-votes.v1", NO_VOTES, parseVoteMap);
export const commentsStore = createLocalStore("ntcg.decks.comments.v1", NO_COMMENTS, parseComments);
export const handleStore = createLocalStore("ntcg.decks.handle.v1", "", (raw) =>
  typeof raw === "string" ? raw.slice(0, 40) : null,
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
    author: input.author.trim().slice(0, 40) || "Anonymous Shinobi",
    body: input.body.trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
    votes: 0,
  };
  commentsStore.set((prev) => [...prev, comment]);
  return comment;
}

export function useHandle() {
  return useLocalStore(handleStore);
}
