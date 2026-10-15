import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCommentTree, capThreadDepth, countComments } from "@/components/deck/comments";
import {
  COMMENT_AUTHOR_MAX,
  COMMENT_BODY_MAX,
  MAX_STORED_COMMENTS_PER_DECK,
  addLocalComment,
  commentsStore,
  parseComments,
} from "./community";

const stored = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  deckId: "deck",
  parentId: null,
  author: "kunai_kid",
  body: `Body ${id}`,
  createdAt: "2026-10-01T00:00:00Z",
  votes: 0,
  ...overrides,
});

describe("parseComments", () => {
  it("rejects anything that is not an array", () => {
    expect(parseComments(null)).toBeNull();
    expect(parseComments({ length: 1 })).toBeNull();
  });

  it("drops records missing a required field", () => {
    const parsed = parseComments([
      stored("ok"),
      null,
      "text",
      stored("no-body", { body: 5 }),
      stored("bad-parent", { parentId: 3 }),
      { id: "bare" },
    ]);
    expect(parsed!.map((c) => c.id)).toEqual(["ok"]);
  });

  it("reads a vote count that is not a finite number as 0 instead of dropping the comment", () => {
    const parsed = parseComments([
      stored("string", { votes: "9999" }),
      stored("nan", { votes: Number.NaN }),
      stored("missing", { votes: undefined }),
      stored("object", { votes: { valueOf: 3 } }),
      stored("fine", { votes: 4 }),
    ]);
    expect(parsed!.map((c) => [c.id, c.votes])).toEqual([
      ["string", 0],
      ["nan", 0],
      ["missing", 0],
      ["object", 0],
      ["fine", 4],
    ]);
    // JSON turns Infinity into null; it reads as 0 too.
    expect(parseComments(JSON.parse(JSON.stringify([stored("inf", { votes: Infinity })])))![0]!.votes).toBe(0);
  });

  it("clamps author and body to the form's limits", () => {
    const [comment] = parseComments([stored("long", { author: "a".repeat(500), body: "b".repeat(50_000) })])!;
    expect(comment!.author).toHaveLength(COMMENT_AUTHOR_MAX);
    expect(comment!.body).toHaveLength(COMMENT_BODY_MAX);
  });

  it("keeps only the newest comments per deck, in their stored order", () => {
    const flood = Array.from({ length: MAX_STORED_COMMENTS_PER_DECK + 20 }, (_, i) => stored(`f${i}`));
    const other = [stored("o1", { deckId: "other" }), stored("o2", { deckId: "other" })];
    const parsed = parseComments([other[0], ...flood, other[1]])!;
    const forDeck = parsed.filter((c) => c.deckId === "deck");
    expect(forDeck).toHaveLength(MAX_STORED_COMMENTS_PER_DECK);
    expect(forDeck[0]!.id).toBe("f20");
    expect(forDeck.at(-1)!.id).toBe(`f${MAX_STORED_COMMENTS_PER_DECK + 19}`);
    expect(parsed.filter((c) => c.deckId === "other").map((c) => c.id)).toEqual(["o1", "o2"]);
    expect(parsed[0]!.id).toBe("o1");
    expect(parsed.at(-1)!.id).toBe("o2");
  });

  it("turns tampered storage (a 10,000-deep reply chain, junk votes) into a thread the page can render", () => {
    const chain = Array.from({ length: 10_000 }, (_, i) => stored(`c${i}`, { parentId: i === 0 ? null : `c${i - 1}`, votes: "x" }));
    const parsed = parseComments(chain)!;
    expect(parsed).toHaveLength(MAX_STORED_COMMENTS_PER_DECK);
    expect(parsed.every((c) => c.votes === 0)).toBe(true);
    const tree = capThreadDepth(buildCommentTree(parsed));
    expect(countComments(tree)).toBe(MAX_STORED_COMMENTS_PER_DECK);
  });
});

describe("addLocalComment", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stores a trimmed, clamped comment with 0 votes", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const comment = addLocalComment({ deckId: "deck", parentId: null, author: "   ", body: `  ${"x".repeat(COMMENT_BODY_MAX + 5)} ` });
    expect(comment.author).toBe("Anonymous Shinobi");
    expect(comment.body).toHaveLength(COMMENT_BODY_MAX);
    expect(comment.votes).toBe(0);
    expect(commentsStore.get()).toEqual([comment]);
  });
});
