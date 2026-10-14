import type { DeckComment } from "@/lib/decks/types";

/** Comment thread building and ordering for the deck page. Pure; no storage access. */

export type CommentSort = "top" | "new";

export const COMMENT_SORT_LABELS: Record<CommentSort, string> = { top: "Top", new: "New" };

/** Deepest indentation level; deeper replies are shown at this level, after their parent. */
export const MAX_COMMENT_DEPTH = 3;

export interface CommentNode {
  comment: DeckComment;
  /** Seed votes plus this browser's vote. */
  score: number;
  /** Nesting depth in the thread, 0 for top-level comments. */
  depth: number;
  /** Indentation level, capped at the display depth. */
  displayDepth: number;
  /** Author of the parent comment; null for top-level comments. */
  replyTo: string | null;
  children: CommentNode[];
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const COMPARATORS: Record<CommentSort, (a: CommentNode, b: CommentNode) => number> = {
  top: (a, b) => b.score - a.score || compareIds(a.comment.createdAt, b.comment.createdAt) || compareIds(a.comment.id, b.comment.id),
  new: (a, b) => compareIds(b.comment.createdAt, a.comment.createdAt) || compareIds(a.comment.id, b.comment.id),
};

/** Seed comments followed by this browser's, dropping any id seen before. */
export function mergeComments(seed: readonly DeckComment[], local: readonly DeckComment[]): DeckComment[] {
  const seen = new Set<string>();
  return [...seed, ...local].filter((comment) => {
    if (seen.has(comment.id)) return false;
    seen.add(comment.id);
    return true;
  });
}

/**
 * Nests comments under their parents and sorts every level. Comments whose parent is missing,
 * or whose parent chain loops back on itself, become top-level comments. `localVotes` maps comment
 * ids to this browser's vote and is added to the seed votes.
 */
export function buildCommentTree(
  comments: readonly DeckComment[],
  { sort = "top", localVotes = {} }: { sort?: CommentSort; localVotes?: Readonly<Record<string, number>> } = {},
): CommentNode[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));

  const parentOf = (comment: DeckComment): DeckComment | null => {
    if (!comment.parentId || comment.parentId === comment.id) return null;
    const parent = byId.get(comment.parentId);
    if (!parent) return null;
    // Walk up the chain; a loop back to this comment means the data is corrupt, so detach it.
    const visited = new Set([comment.id]);
    for (let cursor: DeckComment | undefined = parent; cursor; cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined) {
      if (visited.has(cursor.id)) return null;
      visited.add(cursor.id);
    }
    return parent;
  };

  const children = new Map<string | null, DeckComment[]>();
  for (const comment of byId.values()) {
    const key = parentOf(comment)?.id ?? null;
    children.set(key, [...(children.get(key) ?? []), comment]);
  }

  const build = (parent: DeckComment | null, depth: number): CommentNode[] =>
    (children.get(parent?.id ?? null) ?? [])
      .map((comment) => ({
        comment,
        score: comment.votes + (localVotes[comment.id] ?? 0),
        depth,
        displayDepth: Math.min(depth, MAX_COMMENT_DEPTH),
        replyTo: parent?.author ?? null,
        children: build(comment, depth + 1),
      }))
      .sort(COMPARATORS[sort]);

  return build(null, 0);
}

/** Every descendant of a node in thread order, without nesting. */
function descendants(node: CommentNode): CommentNode[] {
  return node.children.flatMap((child) => [{ ...child, children: [] }, ...descendants(child)]);
}

/**
 * Caps visual nesting at `maxDepth` levels: replies of a node one level above the cap are shown as
 * one flat list (in thread order), so the deepest indentation is `maxDepth`.
 */
export function capThreadDepth(nodes: readonly CommentNode[], maxDepth: number = MAX_COMMENT_DEPTH): CommentNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.depth >= maxDepth - 1 ? descendants(node) : capThreadDepth(node.children, maxDepth),
  }));
}

/** Total comments in a (sub)tree. */
export function countComments(nodes: readonly CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countComments(node.children), 0);
}

/** Longest comment the local store keeps. */
export const COMMENT_MAX_LENGTH = 2000;

/** Name shown for comments posted without a display name. */
export const ANONYMOUS_NAME = "Anonymous Shinobi";

/** Why a draft cannot be posted yet, or null when it can. */
export function commentDraftError(body: string): string | null {
  const length = body.trim().length;
  if (length === 0) return "Write something before posting.";
  if (length > COMMENT_MAX_LENGTH) return `Keep it under ${COMMENT_MAX_LENGTH} characters (${length} now).`;
  return null;
}

/**
 * Profile link for a comment author: only the deck's own author and known profile handles get
 * one, since most commenter handles have no player page.
 */
export function commentAuthorHref(author: string, profileHandles: ReadonlySet<string>): string | null {
  return profileHandles.has(author) ? `/players/${encodeURIComponent(author)}` : null;
}

/**
 * How a comment's author is credited. Seed comments get a profile link (when the handle has one)
 * and the "Deck author" badge; comments posted from this browser get neither, since their name is
 * whatever was typed into the display-name field.
 */
export function commentAuthorCredit(
  author: string,
  { local, deckAuthorHandle, profileHandles }: { local: boolean; deckAuthorHandle: string; profileHandles: ReadonlySet<string> },
): { href: string | null; deckAuthor: boolean } {
  if (local) return { href: null, deckAuthor: false };
  return { href: commentAuthorHref(author, profileHandles), deckAuthor: author === deckAuthorHandle };
}
