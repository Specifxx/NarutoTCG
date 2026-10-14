import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { eventTotals, filterEvents, formatOptions, mergeEventSummaries, normalizeQuery, offeredOr, regionOptions } from "./directory";
import { classifyRegion } from "./region";
import { summarize, type TournamentSummary } from "./summary";
import { fixtureTournament } from "./test-fixtures";

const SEED = SEED_TOURNAMENTS.map(summarize);

const event = (overrides: Partial<TournamentSummary>): TournamentSummary => ({ ...summarize(fixtureTournament()), ...overrides });

describe("classifyRegion", () => {
  it("reads online events and ISO codes", () => {
    expect(classifyRegion({ online: true, country: "US" })).toBe("online");
    expect(classifyRegion({ country: "US" })).toBe("north-america");
    expect(classifyRegion({ country: "ca" })).toBe("north-america");
    expect(classifyRegion({ country: "GB" })).toBe("europe");
    expect(classifyRegion({ country: "DE" })).toBe("europe");
    expect(classifyRegion({ country: "AU" })).toBe("oceania");
    expect(classifyRegion({ country: "NZ" })).toBe("oceania");
  });
  it("reads country names and falls back to the region field", () => {
    expect(classifyRegion({ country: "United States" })).toBe("north-america");
    expect(classifyRegion({ country: "New Zealand" })).toBe("oceania");
    expect(classifyRegion({ city: "Leeds", region: "England" })).toBe("europe");
  });
  it("never reads a state code in the region field as a country", () => {
    expect(classifyRegion({ city: "Dover", region: "DE" })).toBe("other");
    expect(classifyRegion({ city: "Billings", region: "MT" })).toBe("other");
    expect(classifyRegion({ city: "Dover", region: "DE", country: "US" })).toBe("north-america");
  });
  it("puts unknown places in other", () => {
    expect(classifyRegion({ country: "JP" })).toBe("other");
    expect(classifyRegion({})).toBe("other");
  });
  it("classifies every seed event into a named region", () => {
    for (const summary of SEED) expect(classifyRegion(summary.location)).not.toBe("other");
  });
});

describe("filterEvents", () => {
  it("sorts newest first", () => {
    const dates = filterEvents(SEED).map((e) => e.date);
    expect(dates).toEqual(dates.slice().sort().reverse());
    expect(filterEvents(SEED)).toHaveLength(SEED.length);
  });

  it("matches word prefixes in name, city, organizer and winner, ignoring case and accents", () => {
    const events = [
      event({ id: "a", name: "Konoha Regional — Seattle", location: { city: "Seattle", country: "US" }, organizer: "Shinobi Play" }),
      event({ id: "b", name: "Store Championship", location: { city: "Portland", country: "US" }, organizer: "Hidden Leaf Games" }),
      event({ id: "c", name: "Online Open", location: { online: true }, organizer: "League", winner: { id: "z", name: "Zoë Ångström", archetypeId: "rogue" } }),
    ];
    expect(filterEvents(events, { text: "seat" }).map((e) => e.id)).toEqual(["a"]);
    expect(filterEvents(events, { text: "PORT" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterEvents(events, { text: "hidden leaf" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterEvents(events, { text: "zoe angstrom" }).map((e) => e.id)).toEqual(["c"]);
    expect(filterEvents(events, { text: "eattle" })).toEqual([]);
    expect(filterEvents(events, { text: "   " })).toHaveLength(3);
  });

  it("filters by tier, region and format", () => {
    const nationals = filterEvents(SEED, { tiers: ["national-championship"] });
    expect(nationals.length).toBeGreaterThan(0);
    expect(nationals.every((e) => e.tier === "national-championship")).toBe(true);

    const online = filterEvents(SEED, { region: "online" });
    expect(online.length).toBeGreaterThan(0);
    expect(online.every((e) => e.location.online)).toBe(true);

    const europe = filterEvents(SEED, { region: "europe" });
    expect(europe.every((e) => e.location.country === "GB")).toBe(true);

    const format = SEED[0]!.format;
    expect(filterEvents(SEED, { format }).every((e) => e.format === format)).toBe(true);
    expect(filterEvents(SEED, { format: "all", region: "all", tiers: [] })).toHaveLength(SEED.length);
  });

  it("combines filters", () => {
    const result = filterEvents(SEED, { tiers: ["store-championship"], region: "north-america" });
    expect(result.length).toBeGreaterThan(0);
    for (const e of result) {
      expect(e.tier).toBe("store-championship");
      expect(classifyRegion(e.location)).toBe("north-america");
    }
  });
});

describe("mergeEventSummaries", () => {
  it("keeps the first row for a duplicated id", () => {
    const seed = [event({ id: "x", name: "Seed" })];
    const imported = [event({ id: "x", name: "Imported", source: "import" }), event({ id: "local-y", source: "import" })];
    const merged = mergeEventSummaries(seed, imported);
    expect(merged.map((e) => [e.id, e.name])).toEqual([
      ["x", "Seed"],
      ["local-y", merged[1]!.name],
    ]);
  });
});

describe("eventTotals", () => {
  it("adds up players, matches and decklists", () => {
    const totals = eventTotals([event({ players: 10, matches: 20, decklists: 4 }), event({ players: 6, matches: 9, decklists: 0 })]);
    expect(totals).toEqual({ events: 2, players: 16, matches: 29, decklists: 4 });
    expect(eventTotals([])).toEqual({ events: 0, players: 0, matches: 0, decklists: 0 });
  });
});

describe("options", () => {
  it("lists formats with the most recent first", () => {
    const options = formatOptions([
      event({ format: "Old", date: "2026-01-01" }),
      event({ format: "New", date: "2026-09-01" }),
      event({ format: "Old", date: "2026-02-01" }),
    ]);
    expect(options).toEqual(["New", "Old"]);
    expect(formatOptions(SEED)[0]).toBe("Standard (NT01–NT04)");
  });

  it("offers other regions only when needed", () => {
    expect(regionOptions(SEED)).toEqual(["online", "north-america", "europe", "oceania"]);
    expect(regionOptions([event({ location: { country: "JP" } })])).toContain("other");
  });

  it("drops a filter choice that is no longer offered", () => {
    expect(offeredOr("europe", regionOptions(SEED))).toBe("europe");
    expect(offeredOr("other", regionOptions(SEED))).toBe("all");
    expect(offeredOr("Old", ["New"])).toBe("all");
    expect(offeredOr("all", ["New"])).toBe("all");
  });

  it("normalizes queries", () => {
    expect(normalizeQuery("  Hokage-Cup  #3 ")).toBe("hokage cup 3");
  });
});
