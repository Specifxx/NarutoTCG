import { describe, expect, it } from "vitest";
import type { DeckComment } from "@/lib/decks/types";
import { buildCommentTree, capThreadDepth, countComments, mergeComments, type CommentNode } from "./comments";

let clock = 0;
function comment(id: string, parentId: string | null, votes = 0, createdAt?: string): DeckComment {
  clock += 1;
  return {
    id,
    deckId: "deck",
    parentId,
    author: `user-${id}`,
    body: `Body ${id}`,
    createdAt: createdAt ?? `2026-10-01T${String(clock).padStart(2, "0")}:00:00Z`,
    votes,
  };
}

const ids = (nodes: CommentNode[]) => nodes.map((node) => node.comment.id);

describe("mergeComments", () => {
  it("keeps seed comments first and drops duplicate ids", () => {
    const seed = [comment("a", null), comment("b", null)];
    const local = [comment("b", null), comment("c", null)];
    expect(mergeComments(seed, local).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(mergeComments(seed, local)[1]).toBe(seed[1]);
  });
});

describe("buildCommentTree", () => {
  const thread = [
    comment("a", null, 5, "2026-10-01T01:00:00Z"),
    comment("b", null, 9, "2026-10-01T02:00:00Z"),
    comment("a1", "a", 1, "2026-10-01T03:00:00Z"),
    comment("a2", "a", 4, "2026-10-01T04:00:00Z"),
    comment("c", null, 5, "2026-10-01T05:00:00Z"),
  ];

  it("nests replies under their parents with depth and replyTo", () => {
    const tree = buildCommentTree(thread);
    const a = tree.find((node) => node.comment.id === "a")!;
    expect(a.depth).toBe(0);
    expect(a.replyTo).toBeNull();
    expect(ids(a.children)).toEqual(["a2", "a1"]);
    expect(a.children[0].depth).toBe(1);
    expect(a.children[0].replyTo).toBe("user-a");
    expect(countComments(tree)).toBe(5);
  });

  it("sorts Top by score (seed + this browser's vote), older first on ties", () => {
    expect(ids(buildCommentTree(thread, { sort: "top" }))).toEqual(["b", "a", "c"]);
    const withVotes = buildCommentTree(thread, { sort: "top", localVotes: { c: 1, b: -1 } });
    expect(ids(withVotes)).toEqual(["b", "c", "a"]);
    expect(withVotes.find((node) => node.comment.id === "c")!.score).toBe(6);
  });

  it("sorts New by date, newest first, at every level", () => {
    const tree = buildCommentTree(thread, { sort: "new" });
    expect(ids(tree)).toEqual(["c", "b", "a"]);
    expect(ids(tree[2].children)).toEqual(["a2", "a1"]);
  });

  it("promotes orphans and breaks parent loops instead of losing comments", () => {
    const corrupt = [comment("x", "missing"), comment("y", "z"), comment("z", "y"), comment("self", "self"), comment("ok", "x")];
    const tree = buildCommentTree(corrupt, { sort: "new" });
    expect(countComments(tree)).toBe(5);
    expect(ids(tree).sort()).toEqual(["self", "x", "y", "z"]);
    expect(ids(tree.find((node) => node.comment.id === "x")!.children)).toEqual(["ok"]);
  });

  it("returns an empty thread for no comments", () => {
    expect(buildCommentTree([])).toEqual([]);
  });
});

describe("capThreadDepth", () => {
  // root → d1 → d2 → d3 → d4 → d5, plus a sibling d3b under d2.
  const chain = [
    comment("root", null),
    comment("d1", "root"),
    comment("d2", "d1"),
    comment("d3", "d2", 3),
    comment("d4", "d3"),
    comment("d5", "d4"),
    comment("d3b", "d2", 1),
  ];

  it("flattens everything below the cap into the deepest level, in thread order", () => {
    const capped = capThreadDepth(buildCommentTree(chain, { sort: "top" }), 3);
    const d2 = capped[0].children[0].children[0];
    expect(d2.comment.id).toBe("d2");
    expect(ids(d2.children)).toEqual(["d3", "d4", "d5", "d3b"]);
    expect(d2.children.every((node) => node.children.length === 0)).toBe(true);
    expect(d2.children.map((node) => node.displayDepth)).toEqual([3, 3, 3, 3]);
    expect(d2.children.map((node) => node.depth)).toEqual([3, 4, 5, 3]);
    expect(d2.children[1].replyTo).toBe("user-d3");
    expect(countComments(capped)).toBe(chain.length);
  });

  it("leaves shallow threads untouched", () => {
    const shallow = buildCommentTree([comment("p", null), comment("q", "p")]);
    expect(capThreadDepth(shallow, 3)).toEqual(shallow);
  });
});
