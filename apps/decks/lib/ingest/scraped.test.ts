import { describe, expect, it } from "vitest";
import { readTemplate } from "./__fixtures__/files";
import { convertScraped, parseLocation, parseTier, ScrapedTournamentSchema } from "./scraped";

const template = () => JSON.parse(readTemplate("scraped-template.json")) as Record<string, unknown>;

describe("parseTier", () => {
  it.each([
    ["store-championship", "store-championship"],
    ["Store Champ", "store-championship"],
    ["SC", "store-championship"],
    ["Locals", "store-championship"],
    ["Regional", "regional-championship"],
    ["Regional Championship", "regional-championship"],
    ["RC Seattle", "regional-championship"],
    ["Nationals", "national-championship"],
    ["National Championship", "national-championship"],
    ["Online", "online-open"],
    ["Online Open", "online-open"],
    ["Worlds", null],
  ])("%s → %s", (raw, expected) => {
    expect(parseTier(raw)).toBe(expected);
  });
});

describe("parseLocation", () => {
  it.each([
    ["Riverbend", { city: "Riverbend" }],
    ["Riverbend, WA", { city: "Riverbend", region: "WA" }],
    ["Riverbend, WA, US", { city: "Riverbend", region: "WA", country: "US" }],
    ["Paper Lantern Games, Riverbend, WA, US", { city: "Riverbend", region: "WA", country: "US", venue: "Paper Lantern Games" }],
    ["Online (webcam)", { online: true }],
    ["", {}],
  ])("%s", (text, expected) => {
    expect(parseLocation(text)).toEqual(expected);
  });
});

describe("convertScraped", () => {
  it("converts the template", () => {
    expect(ScrapedTournamentSchema.safeParse(template()).success).toBe(true);
    const { raw, issues } = convertScraped(template());
    expect(issues).toEqual([]);
    expect(raw!.meta).toEqual({
      name: "Example Store Championship — Riverbend",
      date: "2026-09-12",
      tier: "store-championship",
      format: "Standard (NT01–NT04)",
      location: { city: "Riverbend", region: "WA", country: "US", venue: "Paper Lantern Games" },
      organizer: "Paper Lantern Games",
      swissRounds: 3,
      topCutSize: 4,
      bestOf: 3,
      notes: "Example data for the import templates. All players and results are fictional. Source: https://example.com/events/riverbend-sc-2026-09-12",
    });
    expect(raw!.standings).toHaveLength(8);
    expect(raw!.pairings).toHaveLength(15);
    expect(raw!.decklistRows).toEqual([]);
  });

  it("turns standings fields into text rows", () => {
    const { raw } = convertScraped(template());
    const [winner, second] = raw!.standings;
    expect(winner).toMatchObject({ row: 1, name: "Kenji Morrow", playerId: "kmorrow", placement: "1", record: "4-1", points: "6", dropped: undefined });
    expect(winner!.decklist!.startsWith("Leader: Naruto Uzumaki — Sage of Mount Myoboku\n")).toBe(true);
    expect(second!.decklist!.split("\n")[0]).toBe("Leader: Sasuke Uchiha — Avenger");
    expect(second!.decklist!.split("\n")[1]).toMatch(/^\d+ .+ \(NT\d\d-\d{3}\)$/);
    expect(raw!.standings[7]).toMatchObject({ name: "Dmitri Halvorsen", dropped: "yes" });
  });

  it("turns pairings into text rows with byes as empty opponents", () => {
    const { raw } = convertScraped(template());
    const bye = raw!.pairings.find((p) => p.result === "BYE")!;
    expect(bye.player2).toBe("");
    expect(raw!.pairings.at(-1)).toMatchObject({ round: "Finals", stage: "Top Cut", table: "1" });
  });

  it("accepts loose values", () => {
    const { raw, issues } = convertScraped({
      event: { name: "Fixture Online Open", date: "2026-08-22", tier: "Online", location: { online: true }, bestOf: 1, swissRounds: "5" },
      standings: [{ player: "Hollis Brandvold", placement: "1st", record: { wins: 5, losses: 0 }, dropped: "R4" }],
      pairings: [{ round: "1", player1: "Hollis Brandvold", player2: null, result: "bye" }],
    });
    expect(issues).toEqual([]);
    expect(raw!.meta).toMatchObject({ tier: "online-open", location: { online: true }, bestOf: 1, swissRounds: 5, organizer: "" });
    expect(raw!.standings[0]).toMatchObject({ placement: "1st", record: "5-0-0", dropped: "R4" });
    expect(raw!.pairings[0]).toMatchObject({ round: "1", player2: "" });
  });

  it("defaults a missing or unknown tier with a warning", () => {
    expect(convertScraped({ event: { name: "X", date: "2026-08-22" } }).issues.map((i) => i.code)).toEqual(["missing-tier"]);
    const unknown = convertScraped({ event: { name: "X", date: "2026-08-22", tier: "Worlds", bestOf: "Bo5" } });
    expect(unknown.raw!.meta.tier).toBe("store-championship");
    expect(unknown.issues.map((i) => i.code)).toEqual(["unknown-tier", "best-of-ignored"]);
  });

  it("skips malformed rows with an error each", () => {
    const { raw, issues } = convertScraped({
      event: { name: "X", date: "2026-08-22", tier: "SC" },
      standings: [{ player: "Hollis Brandvold" }, { placement: 2 }, { player: "Marisol Teague", decklist: { cards: "4 Konan" } }],
      pairings: [{ round: 1, player1: "Hollis Brandvold", player2: "Marisol Teague", result: "2-0" }, { player1: "A" }],
    });
    expect(raw!.standings.map((s) => s.name)).toEqual(["Hollis Brandvold"]);
    expect(raw!.pairings).toHaveLength(1);
    expect(issues.map((i) => [i.code, i.source, i.row, i.field])).toEqual([
      ["schema", "standings", 2, "standings[1].player"],
      ["schema", "standings", 3, "standings[2].decklist"],
      ["schema", "pairings", 2, "pairings[1].round"],
    ]);
    expect(issues.every((i) => i.severity === "error" && i.message.endsWith("(row skipped)"))).toBe(true);
  });

  it("rejects a missing or broken event block", () => {
    const missing = convertScraped({ standings: [] });
    expect(missing.raw).toBeNull();
    expect(missing.issues.map((i) => i.field)).toEqual(["event"]);
    const broken = convertScraped({ event: { name: "", date: "2026-08-22" } });
    expect(broken.raw).toBeNull();
    expect(broken.issues.map((i) => i.field)).toEqual(["event.name"]);
  });

  it("keeps an unreadable date for validation to report", () => {
    expect(convertScraped({ event: { name: "X", date: "12/09/2026", tier: "SC" } }).raw!.meta.date).toBe("12/09/2026");
  });

  it("skips rows with over-long values or absurd card counts, with an error each", () => {
    const { raw, issues } = convertScraped({
      event: { name: "X", date: "2026-08-22", tier: "SC", notes: "n".repeat(10_000) },
      standings: [
        { player: "Hollis Brandvold", archetype: "x".repeat(5_000) },
        { player: "Marisol Teague", decklist: { leader: "Pain", cards: [{ quantity: 1e9, name: "Konan" }] } },
        { player: "Ansel Kirkby", decklist: { leader: "Pain", cards: [{ quantity: "1000000000", name: "Konan" }] } },
      ],
      pairings: [{ round: 1, player1: "Ansel Kirkby", result: "1".repeat(5_000) }],
    });
    // A count given as text is left to the list parser, which rejects it.
    expect(raw!.standings.map((s) => s.name)).toEqual(["Ansel Kirkby"]);
    expect(raw!.pairings).toEqual([]);
    expect(raw!.meta.notes).toHaveLength(10_000);
    expect(issues.map((i) => [i.code, i.source, i.row, i.field])).toEqual([
      ["cell-too-long", "standings", 1, "standings[0].archetype"],
      ["schema", "standings", 2, "standings[1].decklist.cards[0].quantity"],
      ["cell-too-long", "pairings", 1, "pairings[0].result"],
    ]);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
    const longName = convertScraped({ event: { name: "x".repeat(5_000), date: "2026-08-22" } });
    expect(longName.raw).toBeNull();
    expect(longName.issues.map((i) => [i.code, i.field])).toEqual([["cell-too-long", "event.name"]]);
  });

  it("removes control characters with one warning", () => {
    const { raw, issues } = convertScraped({
      event: { name: "Evil\u001b[2J Cup", date: "2026-08-22", tier: "SC" },
      standings: [{ player: "Hollis\u0007 Brandvold", archetype: "Pain\u202e" }],
    });
    expect(raw!.meta.name).toBe("Evil[2J Cup");
    expect(raw!.standings[0]).toMatchObject({ name: "Hollis Brandvold", archetype: "Pain" });
    expect(issues.map((i) => [i.severity, i.code])).toEqual([["warning", "control-characters-removed"]]);
  });
});
