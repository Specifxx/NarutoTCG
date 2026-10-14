import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeText, checkFileBeforeRead, formatBytes, kindFromName, MAX_FILE_BYTES, readErrorMessage } from "./source-files";

const template = (name: string) => readFileSync(new URL(`../../public/templates/${name}`, import.meta.url), "utf8");

describe("analyzeText", () => {
  it("reads a CSV: kind from the name, automatic mapping, preview rows", () => {
    const info = analyzeText("standings-template.csv", template("standings-template.csv"));
    expect(info).toMatchObject({ type: "csv", kind: "standings", kindFrom: "name", rowCount: 8, detectedKind: "standings" });
    if (info.type !== "csv") throw new Error("expected csv");
    expect(info.previewRows).toHaveLength(5);
    expect(info.mapping).toMatchObject({ player: "Player", archetype: "Deck", placement: "Placement" });
  });

  it("detects the kind from the headers when the name says nothing", () => {
    const info = analyzeText("export.csv", template("pairings-template.csv"));
    expect(info).toMatchObject({ type: "csv", kind: "pairings", kindFrom: "headers" });
    if (info.type !== "csv") throw new Error("expected csv");
    expect(info.confidence).toBeGreaterThan(0.6);
  });

  it("honors a chosen kind and sniffs JSON in pasted text", () => {
    expect(analyzeText("pasted.csv", template("decklists-template.csv"), { kind: "standings", origin: "paste" })).toMatchObject({
      kind: "standings",
      kindFrom: "chosen",
      origin: "paste",
    });
    expect(analyzeText("pasted.txt", template("scraped-template.json"))).toMatchObject({ type: "json", format: "scraped" });
  });

  it("reads tournament JSON with counts and event details", () => {
    expect(analyzeText("t.json", template("tournament-template.json"))).toMatchObject({
      type: "json",
      format: "canonical",
      players: 8,
      matches: 15,
      meta: { name: "Example Store Championship — Riverbend", tier: "store-championship", swissRounds: 3, bestOf: 3 },
    });
    expect(analyzeText("s.json", template("scraped-template.json"))).toMatchObject({
      type: "json",
      players: 8,
      matches: 15,
      meta: { date: "2026-09-12", topCutSize: 4, location: { city: "Riverbend", venue: "Paper Lantern Games" } },
    });
  });

  it("recognizes event details files", () => {
    expect(analyzeText("meta.json", template("event-meta-template.json"))).toMatchObject({ type: "event-meta", meta: { topCutSize: 4 } });
    const bad = analyzeText("meta.json", JSON.stringify({ name: "X", date: "2026-01-01", tier: "worlds" }));
    expect(bad.type).toBe("invalid");
  });

  it("explains unusable input", () => {
    const cases: Array<[string, string, RegExp]> = [
      ["empty.csv", "  \n", /empty/],
      ["bad.json", "{ nope", /isn't valid JSON/],
      ["array.json", "[1, 2]", /Unrecognized JSON/],
      ["headers.csv", "Player,Deck\n", /no data rows/],
      ["binary.csv", "PK\u0003\u0004\u0000\u0000", /binary file/],
      ["scraped.json", JSON.stringify({ event: { name: "" } }), /"event" block/],
    ];
    for (const [name, text, message] of cases) {
      const info = analyzeText(name, text);
      expect(info.type, name).toBe("invalid");
      if (info.type === "invalid") expect(info.error, name).toMatch(message);
    }
  });

  it("strips a byte order mark", () => {
    const info = analyzeText("standings.csv", `﻿${template("standings-template.csv")}`);
    expect(info.type === "csv" && info.headers[0]).toBe("Placement");
  });
});

describe("file checks", () => {
  it("accepts csv, json and txt within the size limit", () => {
    expect(checkFileBeforeRead("a.CSV", 10)).toBeNull();
    expect(checkFileBeforeRead("a.json", 10)).toBeNull();
    expect(checkFileBeforeRead("a.txt", 10)).toBeNull();
    expect(checkFileBeforeRead("a.xlsx", 10)).toMatch(/Export the sheet as CSV/);
    expect(checkFileBeforeRead("a.pdf", 10)).toMatch(/".pdf" files aren't supported/);
    expect(checkFileBeforeRead("README", 10)).toMatch(/without an extension/);
    expect(checkFileBeforeRead("a.csv", 0)).toMatch(/empty/);
    expect(checkFileBeforeRead("a.csv", MAX_FILE_BYTES + 1)).toMatch(/command-line importer/);
  });

  it("formats sizes and read errors", () => {
    expect(formatBytes(842)).toBe("842 B");
    expect(formatBytes(12_700)).toBe("12.4 KB");
    expect(formatBytes(1_300_000)).toBe("1.2 MB");
    expect(readErrorMessage(new Error("NotReadableError"))).toMatch(/\(NotReadableError\)/);
    expect(readErrorMessage("x")).not.toMatch(/\(/);
  });

  it("reads the kind from file names like the CLI", () => {
    expect(kindFromName("RC-Standings.csv")).toBe("standings");
    expect(kindFromName("pairing.csv")).toBe("pairings");
    expect(kindFromName("top8-decklists.csv")).toBe("decklists");
    expect(kindFromName("export.csv")).toBeNull();
  });
});
