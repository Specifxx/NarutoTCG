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
 * Each comment's parent id (null for top level) and nesting depth, in one pass. A comment whose
 * parent is missing, or is itself, is top level. Comments that form a parent loop are corrupt
 * data: every member of the loop becomes top level, and the replies hanging off the loop keep
 * their parents. Iterative with memoized depths, so a chain thousands of comments deep is fine.
 */
function resolveParents(byId: ReadonlyMap<string, DeckComment>): Map<string, { parentId: string | null; depth: number }> {
  const resolved = new Map<string, { parentId: string | null; depth: number }>();
  const parentIdOf = (comment: DeckComment): string | null =>
    comment.parentId && comment.parentId !== comment.id && byId.has(comment.parentId) ? comment.parentId : null;

  for (const start of byId.values()) {
    if (resolved.has(start.id)) continue;
    // Walk up until a resolved comment, a top-level comment, or a comment already on this walk (a loop).
    const path: DeckComment[] = [];
    const onPath = new Map<string, number>();
    let loopStart = -1;
    for (let cursor: DeckComment | undefined = start; cursor && !resolved.has(cursor.id); ) {
      const seenAt = onPath.get(cursor.id);
      if (seenAt !== undefined) {
        loopStart = seenAt;
        break;
      }
      onPath.set(cursor.id, path.length);
      path.push(cursor);
      const parentId = parentIdOf(cursor);
      cursor = parentId === null ? undefined : byId.get(parentId);
    }
    // Assign from the top of the walk down, so each parent is resolved before its child.
    for (let i = path.length - 1; i >= 0; i--) {
      const comment = path[i]!;
      const parentId = loopStart !== -1 && i >= loopStart ? null : parentIdOf(comment);
      const depth = parentId === null ? 0 : resolved.get(parentId)!.depth + 1;
      resolved.set(comment.id, { parentId, depth });
    }
  }
  return resolved;
}

/**
 * Nests comments under their parents and sorts every level. Comments whose parent is missing,
 * or that form a parent loop, become top-level comments. `localVotes` maps comment ids to this
 * browser's vote and is added to the seed votes. No recursion: any depth of reply chain builds.
 */
export function buildCommentTree(
  comments: readonly DeckComment[],
  { sort = "top", localVotes = {} }: { sort?: CommentSort; localVotes?: Readonly<Record<string, number>> } = {},
): CommentNode[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const parents = resolveParents(byId);

  const nodes = new Map<string, CommentNode>();
  for (const comment of byId.values()) {
    const { parentId, depth } = parents.get(comment.id)!;
    const votes = Number.isFinite(comment.votes) ? comment.votes : 0;
    const local = localVotes[comment.id] ?? 0;
    nodes.set(comment.id, {
      comment,
      score: votes + (Number.isFinite(local) ? local : 0),
      depth,
      displayDepth: Math.min(depth, MAX_COMMENT_DEPTH),
      replyTo: parentId === null ? null : byId.get(parentId)!.author,
      children: [],
    });
  }

  const roots: CommentNode[] = [];
  for (const node of nodes.values()) {
    const { parentId } = parents.get(node.comment.id)!;
    (parentId === null ? roots : nodes.get(parentId)!.children).push(node);
  }
  const compare = COMPARATORS[sort];
  roots.sort(compare);
  for (const node of nodes.values()) node.children.sort(compare);
  return roots;
}

/** Every descendant of a node in thread order (depth first), without nesting. Iterative, for deep chains. */
function descendants(node: CommentNode): CommentNode[] {
  const out: CommentNode[] = [];
  const stack = [...node.children].reverse();
  while (stack.length > 0) {
    const next = stack.pop()!;
    out.push({ ...next, children: [] });
    for (let i = next.children.length - 1; i >= 0; i--) stack.push(next.children[i]!);
  }
  return out;
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

/** Total comments in a (sub)tree. Iterative, for deep chains. */
export function countComments(nodes: readonly CommentNode[]): number {
  let count = 0;
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop()!;
    count += 1;
    for (const child of node.children) stack.push(child);
  }
  return count;
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
