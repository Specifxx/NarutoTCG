import { describe, expect, it } from "vitest";
import { createRng, pick, randInt } from "@/lib/random";
import { idSlug, isSlug, MAX_SLUG_LENGTH, slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["Kenji Morrow", "kenji-morrow"],
    ["Zoë Marchetti", "zoe-marchetti"],
    ["Søren Ødegård", "soren-odegard"],
    ["Ærøskøbing Straße", "aeroskobing-strasse"],
    ["  --Hello__World--  ", "hello-world"],
    ["Wren Ishikawa-Doyle", "wren-ishikawa-doyle"],
    ["A — B", "a-b"],
    ["O'Brien, Jr.", "o-brien-jr"],
    ["Hokage Cup 2026!", "hokage-cup-2026"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("falls back when nothing is left", () => {
    expect(slugify("うずまき")).toBe("player");
    expect(slugify("---")).toBe("player");
    expect(slugify("", "event")).toBe("event");
  });

  it("never produces a double dash, edge dashes or non-slug characters", () => {
    const rng = createRng("slug-fuzz");
    const alphabet = ["a", "Z", "9", "-", "--", " ", "—", "–", "_", ".", "é", "ø", "ß", "'", "/", "日", "\t"];
    for (let i = 0; i < 2000; i++) {
      const input = Array.from({ length: randInt(rng, 0, 14) }, () => pick(rng, alphabet)).join("");
      const slug = slugify(input);
      expect(slug).not.toContain("--");
      expect(isSlug(slug)).toBe(true);
    }
  });
});

describe("uniqueSlug", () => {
  it("appends -2, -3… and records each slug", () => {
    const used = new Set<string>();
    expect(uniqueSlug("rin-okada", used)).toBe("rin-okada");
    expect(uniqueSlug("rin-okada", used)).toBe("rin-okada-2");
    expect(uniqueSlug("rin-okada", used)).toBe("rin-okada-3");
    expect([...used]).toEqual(["rin-okada", "rin-okada-2", "rin-okada-3"]);
  });

  it("skips suffixes that are already taken", () => {
    const used = new Set(["a", "a-2"]);
    expect(uniqueSlug("a", used)).toBe("a-3");
    expect(uniqueSlug("a-2", used)).toBe("a-2-2");
  });
});

describe("isSlug", () => {
  it("accepts single-dash lowercase slugs only", () => {
    expect(isSlug("local-hokage-cup-2026-09-12")).toBe(true);
    expect(isSlug("a--b")).toBe(false);
    expect(isSlug("-a")).toBe(false);
    expect(isSlug("A")).toBe(false);
    expect(isSlug("")).toBe(false);
  });
});

describe("idSlug", () => {
  it("is slugify for names of usual length", () => {
    expect(idSlug("Example Store Championship — Riverbend", "event")).toBe("example-store-championship-riverbend");
    expect(idSlug("うずまき")).toBe("player");
  });

  it("caps long slugs with a stable hash that keeps them distinct", () => {
    const long = "Konoha Open ".repeat(1_800);
    const id = idSlug(long, "event");
    expect(id.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(isSlug(id)).toBe(true);
    expect(id).toMatch(/^konoha-open-konoha-open-.*-[0-9a-z]{6}$/);
    expect(idSlug(long, "event")).toBe(id);
    expect(idSlug(`${long}!`, "event")).toBe(id);
    expect(idSlug(`${long} 2`, "event")).not.toBe(id);
    const unbroken = idSlug("x".repeat(500));
    expect(unbroken.length).toBe(MAX_SLUG_LENGTH);
    expect(isSlug(unbroken)).toBe(true);
  });
});
