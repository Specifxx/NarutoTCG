import { describe, expect, it } from "vitest";
import {
  effectSummary,
  keywordAnchorId,
  parseEffectLine,
  parseEffectText,
  referencedKeywords,
} from "@/lib/effect-text";
import { KEYWORD_GLOSSARY } from "@/lib/keywords";

describe("parseEffectLine", () => {
  it("splits timing tags, trait references and plain text", () => {
    expect(
      parseEffectLine(
        "[Activate: Main] [Once Per Turn] Rest 2 of your chakra: Up to 1 of your {Team 7} characters gains +1000 power.",
      ),
    ).toEqual([
      { kind: "tag", label: "Activate: Main", tone: "timing" },
      { kind: "text", text: " " },
      { kind: "tag", label: "Once Per Turn", tone: "limit" },
      { kind: "text", text: " Rest 2 of your chakra: Up to 1 of your " },
      { kind: "trait", label: "Team 7" },
      { kind: "text", text: " characters gains +1000 power." },
    ]);
  });

  it("treats unknown bracketed phrases as card-name references", () => {
    expect(parseEffectLine("If your leader is [Naruto Uzumaki], draw 1 card.")).toEqual([
      { kind: "text", text: "If your leader is " },
      { kind: "card", name: "Naruto Uzumaki" },
      { kind: "text", text: ", draw 1 card." },
    ]);
  });

  it("recognises granted keywords and attaches glossary reminder text", () => {
    const tokens = parseEffectLine("It also gains [Double Attack] until the end of your turn.");
    expect(tokens[1]).toEqual({ kind: "keyword", label: "Double Attack", reminder: KEYWORD_GLOSSARY["Double Attack"] });
  });

  it("prefers timing tags over keywords with the same name", () => {
    expect(parseEffectLine("[Counter] +2000 power.")[0]).toEqual({ kind: "tag", label: "Counter", tone: "counter" });
    expect(parseEffectLine("[Trigger] Draw 1 card.")[0]).toEqual({ kind: "tag", label: "Trigger", tone: "trigger" });
  });

  it("assigns tones to turn-window tags", () => {
    expect(parseEffectLine("[Opponent's Turn] x")[0]).toEqual({ kind: "tag", label: "Opponent's Turn", tone: "turn" });
    expect(parseEffectLine("[Your Turn] x")[0]).toEqual({ kind: "tag", label: "Your Turn", tone: "turn" });
  });

  it("matches tags and keywords case-insensitively and normalises whitespace to the canonical label", () => {
    expect(parseEffectLine("[ on  play ] Gain [rush].")).toEqual([
      { kind: "tag", label: "On Play", tone: "timing" },
      { kind: "text", text: " Gain " },
      { kind: "keyword", label: "Rush", reminder: KEYWORD_GLOSSARY.Rush },
      { kind: "text", text: "." },
    ]);
  });

  it("treats tag-shaped phrases outside TIMING_TAGS as tags, but not names that merely start with the same letters", () => {
    expect(parseEffectLine("[Activate: Battle] x")[0]).toEqual({
      kind: "tag",
      label: "Activate: Battle",
      tone: "timing",
    });
    expect(parseEffectLine("[Once Per Game] x")[0]).toEqual({ kind: "tag", label: "Once Per Game", tone: "limit" });
    expect(parseEffectLine("[Start of Your Turn] x")[0]).toEqual({
      kind: "tag",
      label: "Start of Your Turn",
      tone: "timing",
    });
    expect(parseEffectLine("Play [Onoki] for free.")[1]).toEqual({ kind: "card", name: "Onoki" });
  });

  it("uses extra keywords and known card names from options", () => {
    expect(parseEffectLine("Gains [Shadow Step].", { keywords: ["Shadow Step"] })[1]).toEqual({
      kind: "keyword",
      label: "Shadow Step",
    });
    // A known card name wins over the tag heuristic.
    expect(parseEffectLine("Search for [Your Youth].", { cardNames: ["Your Youth"] })[1]).toEqual({
      kind: "card",
      name: "Your Youth",
    });
  });

  it("keeps unmatched, empty and nested brackets as literal text", () => {
    expect(parseEffectLine("Rest [On Play and {Team")).toEqual([{ kind: "text", text: "Rest [On Play and {Team" }]);
    expect(parseEffectLine("A [ ] B { } C")).toEqual([{ kind: "text", text: "A [ ] B { } C" }]);
    expect(parseEffectLine("[[Rush]]")).toEqual([
      { kind: "text", text: "[" },
      { kind: "keyword", label: "Rush", reminder: KEYWORD_GLOSSARY.Rush },
      { kind: "text", text: "]" },
    ]);
  });

  it("never interprets markup", () => {
    expect(parseEffectLine('<img src=x onerror="alert(1)"> [<b>Bold</b>]')).toEqual([
      { kind: "text", text: '<img src=x onerror="alert(1)"> ' },
      { kind: "card", name: "<b>Bold</b>" },
    ]);
  });

  it("returns no tokens for an empty line", () => {
    expect(parseEffectLine("")).toEqual([]);
  });
});

describe("parseEffectText", () => {
  it("returns no paragraphs for vanilla cards", () => {
    expect(parseEffectText("")).toEqual([]);
    expect(parseEffectText("  \n \n")).toEqual([]);
  });

  it("splits authored lines into paragraphs and trims them", () => {
    const paragraphs = parseEffectText("[On Play] Draw 1 card.\r\n\n  [Trigger] Play this card.  ");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.[0]).toEqual({ kind: "tag", label: "On Play", tone: "timing" });
    expect(paragraphs[1]).toEqual([
      { kind: "tag", label: "Trigger", tone: "trigger" },
      { kind: "text", text: " Play this card." },
    ]);
  });

  it("does not let a bracket span two lines", () => {
    expect(parseEffectText("[On\nPlay]")).toEqual([[{ kind: "text", text: "[On" }], [{ kind: "text", text: "Play]" }]]);
  });

  it("handles long rules text with many tokens", () => {
    const line = Array.from({ length: 500 }, (_, i) => `[On Play] {Trait ${i}} [Card ${i}]`).join(" ");
    const [tokens] = parseEffectText(line);
    expect(tokens?.filter((t) => t.kind === "trait")).toHaveLength(500);
    expect(tokens?.filter((t) => t.kind === "card")).toHaveLength(500);
  });
});

describe("helpers", () => {
  it("lists referenced keywords once, in order", () => {
    expect(
      referencedKeywords(parseEffectText("Gains [Rush] and [Blocker].\nAlso [Rush] and [Naruto Uzumaki].")),
    ).toEqual(["Rush", "Blocker"]);
  });

  it("summarises long text on a word boundary", () => {
    expect(effectSummary("Short  text\nhere.")).toBe("Short text here.");
    const summary = effectSummary("word ".repeat(100), 50);
    expect(summary.length).toBeLessThanOrEqual(50);
    expect(summary.endsWith("word…")).toBe(true);
  });

  it("builds fragment-safe keyword anchors", () => {
    expect(keywordAnchorId("Double Attack")).toBe("keyword-double-attack");
    expect(keywordAnchorId("K.O. Shield")).toBe("keyword-k-o-shield");
    expect(keywordAnchorId("!!!")).toBe("keyword-unnamed");
  });
});
