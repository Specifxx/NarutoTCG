import { describe, expect, it } from "vitest";
import { closestMatch, foldDiacritics, isIsoDate, levenshtein, normalizeDate, normalizeName, similarity } from "./text";

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
