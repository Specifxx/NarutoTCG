import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TIER_CONFIG } from "@/lib/meta/config";
import { methodologyPoints } from "./methodology";
import { IMPORT_FORMATS, INGEST_COMMAND, templateHref } from "./organizer";

const appFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

describe("organizer panel", () => {
  it("links templates that exist in public/templates", () => {
    for (const format of IMPORT_FORMATS) {
      expect(existsSync(appFile(`public/templates/${format.template}`)), format.template).toBe(true);
      expect(format.template.toLowerCase().endsWith(`.${format.kind.toLowerCase()}`)).toBe(true);
    }
    expect(templateHref("standings-template.csv")).toBe("/templates/standings-template.csv");
  });

  it("names the real package and ingest script", () => {
    const pkg = JSON.parse(readFileSync(appFile("package.json"), "utf8")) as { name: string; scripts: Record<string, string> };
    expect(INGEST_COMMAND).toContain(`--filter ${pkg.name} ingest --`);
    expect(pkg.scripts.ingest).toBeDefined();
  });
});

describe("methodologyPoints", () => {
  it("reads every number from the tier config", () => {
    const text = methodologyPoints()
      .map((p) => p.body)
      .join(" ");
    expect(text).toContain(`${TIER_CONFIG.priorMatches} pseudo-games`);
    expect(text).toContain("50% adjusted win rate, 35% top-cut conversion lift and 15% meta share");
    expect(text).toContain(`S from ${TIER_CONFIG.thresholds.S}, A from ${TIER_CONFIG.thresholds.A}, B from ${TIER_CONFIG.thresholds.B}`);
    expect(text).toContain(`Under ${TIER_CONFIG.minEntries} entries or 1% meta share`);
  });

  it("follows a custom config", () => {
    const config = { ...TIER_CONFIG, priorMatches: 30, thresholds: { S: 70, A: 55, B: 42 } };
    const text = methodologyPoints(config)
      .map((p) => p.body)
      .join(" ");
    expect(text).toContain("30 pseudo-games");
    expect(text).toContain("S from 70, A from 55, B from 42");
  });
});
