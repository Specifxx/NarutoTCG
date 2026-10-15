import { describe, expect, it } from "vitest";
import {
  clip,
  closestMatch,
  closestMatches,
  escapeControlCharacters,
  foldDiacritics,
  isIsoDate,
  levenshtein,
  MAX_FUZZY_LENGTH,
  normalizeDate,
  normalizeName,
  similarity,
  stripControlCharacters,
  stripControlCharactersDeep,
} from "./text";

describe("normalizeName", () => {
  it.each([
    ["Pain — Deva Path", "pain deva path"],
    ["Pain - Deva Path", "pain deva path"],
    ["PAIN–DEVA   PATH", "pain deva path"],
    ["Fukasaku & Shima", "fukasaku and shima"],
    ["Sage Art: Massive Rasengan", "sage art massive rasengan"],
    ["Zoë  Marchetti ", "zoe marchetti"],
    ["O’Brien's", "obriens"],
    ["  ", ""],
  ])("%s → %s", (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  it("keeps letters from other scripts", () => {
    expect(normalizeName("うずまき ナルト")).toBe("うずまき ナルト");
  });
});

describe("foldDiacritics", () => {
  it("folds letters that do not decompose", () => {
    expect(foldDiacritics("Łódź Øresund Straße")).toBe("Lodz Oresund Strasse");
  });
});

describe("levenshtein / similarity", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("konan", "konan")).toBe(0);
    expect(levenshtein("konnan", "konan")).toBe(levenshtein("konan", "konnan"));
  });

  it("scales similarity to 0..1", () => {
    expect(similarity("", "")).toBe(1);
    expect(similarity("abc", "xyz")).toBe(0);
    expect(similarity("konnan", "konan")).toBeCloseTo(5 / 6, 6);
  });

  it("finds the closest candidate", () => {
    const best = closestMatch("Marisol Teage", ["Hollis Brandvold", "Marisol Teague"], (name) => name);
    expect(best?.candidate).toBe("Marisol Teague");
    expect(best!.score).toBeGreaterThan(0.9);
    expect(closestMatch("x", [], (name: string) => name)).toBeNull();
  });
});

describe("dates", () => {
  it("validates real ISO dates", () => {
    expect(isIsoDate("2026-09-12")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-9-12")).toBe(false);
  });

  it.each([
    ["2026-09-12", "2026-09-12"],
    ["2026-09-12T18:30:00Z", "2026-09-12"],
    ["2026/9/12", "2026-09-12"],
    ["2026.09.12", "2026-09-12"],
    ["September 12, 2026", "2026-09-12"],
    ["Sep 12th 2026", "2026-09-12"],
    ["12 September 2026", "2026-09-12"],
    ["09/12/2026", null],
    ["Smarch 12, 2026", null],
    ["2026-02-30", null],
  ])("normalizeDate(%s) → %s", (input, expected) => {
    expect(normalizeDate(input)).toBe(expected);
  });
});

describe("bounded fuzzy matching", () => {
  it("stops the edit distance once it passes the bound", () => {
    expect(levenshtein("kitten", "sitting", 3)).toBe(3);
    expect(levenshtein("kitten", "sitting", 2)).toBe(3);
    expect(levenshtein("abc", "abcdefgh", 2)).toBe(3);
    expect(similarity("konnan", "konan", 0.8)).toBeCloseTo(5 / 6, 6);
    expect(similarity("abc", "xyz", 0.5)).toBeLessThan(0.5);
  });

  it("finds the best and runner-up in one pass, skipping what cannot reach the floor", () => {
    const candidates = ["marisol teague", "marisol teagues", "hollis brandvold"].map((key) => ({ candidate: key, key }));
    const { best, runnerUp } = closestMatches("marisol teage", candidates, 0.5);
    expect(best?.candidate).toBe("marisol teague");
    expect(runnerUp?.candidate).toBe("marisol teagues");
    expect(closestMatches("zzz", candidates, 0.5)).toEqual({ best: null, runnerUp: null });
    expect(closestMatches("x".repeat(MAX_FUZZY_LENGTH + 1), candidates)).toEqual({ best: null, runnerUp: null });
  });

  it("keeps long names cheap", () => {
    const start = performance.now();
    expect(closestMatch("a".repeat(20_000), ["b".repeat(20_000)], (name) => name)).toBeNull();
    expect(performance.now() - start).toBeLessThan(50);
  });
});

describe("control characters", () => {
  it("strips them from text, keeping tabs and line breaks", () => {
    expect(stripControlCharacters("Ken\u001b[31mji\u0007 Mor\u202erow\u0085\tA\nB")).toBe("Ken[31mji Morrow\tA\nB");
  });

  it("strips them throughout a parsed record without mutating it", () => {
    const record = { name: "A\u001bB", players: [{ name: "C\u0000D", placement: 1 }], ok: "fine" };
    const { value, changed } = stripControlCharactersDeep(record);
    expect(changed).toBe(true);
    expect(value).toEqual({ name: "AB", players: [{ name: "CD", placement: 1 }], ok: "fine" });
    expect(record.name).toBe("A\u001bB");
    const clean = { name: "AB" };
    expect(stripControlCharactersDeep(clean)).toEqual({ value: clean, changed: false });
    expect(stripControlCharactersDeep(clean).value).toBe(clean);
  });

  it("escapes every one of them for printing", () => {
    expect(escapeControlCharacters("Evil\u001b]0;pwned\u0007\nnext\u202e")).toBe("Evil\\u001b]0;pwned\\u0007\\u000anext\\u202e");
    expect(escapeControlCharacters("Zoë Marchetti — Top 8")).toBe("Zoë Marchetti — Top 8");
  });
});

describe("clip", () => {
  it("cuts long text with an ellipsis", () => {
    expect(clip("short")).toBe("short");
    expect(clip("x".repeat(100), 10)).toBe(`${"x".repeat(9)}…`);
  });
});
