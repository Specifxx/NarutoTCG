import { describe, expect, it } from "vitest";
import { getAllPlayerHandles, getPlayerProfile } from "@/lib/decks/repository";
import type { PlayerResult } from "@/lib/players/profiles";
import { countryName, flagEmoji } from "./country";
import { archetypeRows, bestResult, matchWinRate } from "./profile";

const result = (overrides: Partial<PlayerResult>): PlayerResult => ({
  tournamentId: "event",
  tournamentName: "Event",
  date: "2026-05-01",
  tier: "store-championship",
  placement: 9,
  playerCount: 32,
  topCutSize: 8,
  archetypeId: "sand-gaara",
  record: { wins: 3, losses: 2, draws: 0 },
  ...overrides,
});

describe("flagEmoji", () => {
  it("maps ISO alpha-2 codes to regional indicator pairs", () => {
    expect(flagEmoji("US")).toBe("\u{1F1FA}\u{1F1F8}");
    expect(flagEmoji("jp")).toBe("\u{1F1EF}\u{1F1F5}");
    expect(flagEmoji("GB")).toBe("🇬🇧");
  });

  it("rejects anything that is not two letters", () => {
    expect(flagEmoji(undefined)).toBeNull();
    expect(flagEmoji("")).toBeNull();
    expect(flagEmoji("USA")).toBeNull();
    expect(flagEmoji("1A")).toBeNull();
  });
});

describe("countryName", () => {
  it("names known regions and falls back to the code for malformed input", () => {
    expect(countryName("de")).toBe("Germany");
    expect(countryName("not-a-code")).toBe("NOT-A-CODE");
  });
});

describe("archetypeRows", () => {
  it("sorts by count then name, with share and scale", () => {
    const rows = archetypeRows({ "sand-gaara": 1, "uchiha-avenger": 3, "akatsuki-pain": 1, ghost: 0 });
    // Ties sort by display name: "Sand Coffin Gaara" before "Six Paths of Pain".
    expect(rows.map((row) => row.archetypeId)).toEqual(["uchiha-avenger", "sand-gaara", "akatsuki-pain"]);
    expect(rows[0]).toMatchObject({ count: 3, share: 0.6, scale: 1 });
    expect(rows[1]!.scale).toBeCloseTo(1 / 3);
  });

  it("keeps unknown archetype ids by id and handles an empty record", () => {
    expect(archetypeRows({ "brand-new": 2 })[0]).toMatchObject({ name: "brand-new", share: 1, scale: 1 });
    expect(archetypeRows({})).toEqual([]);
  });
});

describe("matchWinRate", () => {
  it("counts draws as half and is null without matches", () => {
    expect(matchWinRate({ wins: 6, losses: 3, draws: 1 })).toBeCloseTo(0.65);
    expect(matchWinRate({ wins: 0, losses: 0, draws: 0 })).toBeNull();
  });
});

describe("bestResult", () => {
  it("prefers the lowest placement, then prestige, field size and recency", () => {
    expect(bestResult([])).toBeNull();
    const store = result({ tournamentId: "store", placement: 3 });
    const regional = result({ tournamentId: "regional", placement: 3, tier: "regional-championship" });
    const winner = result({ tournamentId: "winner", placement: 1 });
    expect(bestResult([store, regional])?.tournamentId).toBe("regional");
    expect(bestResult([store, regional, winner])?.tournamentId).toBe("winner");

    const big = result({ tournamentId: "big", placement: 3, playerCount: 64 });
    expect(bestResult([store, big])?.tournamentId).toBe("big");
    const newer = result({ tournamentId: "newer", placement: 3, date: "2026-09-01" });
    expect(bestResult([store, newer])?.tournamentId).toBe("newer");
  });

  it("agrees with the profile totals for seed players", () => {
    for (const handle of getAllPlayerHandles().slice(0, 50)) {
      const profile = getPlayerProfile(handle)!;
      expect(bestResult(profile.results)?.placement ?? null).toBe(profile.totals.bestPlacement);
    }
  });
});
