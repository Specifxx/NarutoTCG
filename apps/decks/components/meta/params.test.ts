import { describe, expect, it } from "vitest";
import {
  DATE_PRESETS,
  DEFAULT_META_PARAMS,
  formatSlug,
  hasActiveFilters,
  normalizeTiers,
  resetFilters,
  parseMetaParams,
  presetFilter,
  resolveFormat,
  serializeMetaParams,
  shiftIsoDate,
  toMetaFilter,
} from "./params";

const FORMATS = ["Standard (NT01–NT04)", "Standard (NT01–NT03)"];

describe("parseMetaParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseMetaParams("")).toEqual(DEFAULT_META_PARAMS);
  });

  it("reads every known param", () => {
    expect(parseMetaParams("range=30d&tiers=store,nationals&format=standard-nt01-nt04&imports=1")).toEqual({
      range: "30d",
      tiers: ["national-championship", "store-championship"],
      format: "standard-nt01-nt04",
      imports: true,
    });
  });

  it("ignores invalid values", () => {
    expect(parseMetaParams("range=7d&tiers=worlds,,online&imports=yes&format=%20%20")).toEqual({
      ...DEFAULT_META_PARAMS,
      tiers: ["online-open"],
    });
  });

  it("accepts full tier ids, dedupes, and collapses all four tiers to 'all'", () => {
    expect(parseMetaParams("tiers=online-open,online,ONLINE").tiers).toEqual(["online-open"]);
    expect(parseMetaParams("tiers=store,online,regionals,nationals").tiers).toEqual([]);
  });

  it("accepts URLSearchParams", () => {
    expect(parseMetaParams(new URLSearchParams({ range: "90d" })).range).toBe("90d");
  });

  it("knows the latest-set preset", () => {
    expect(DATE_PRESETS.at(-1)).toMatchObject({ id: "nt04", label: "Since NT04", from: "2026-07-17" });
    expect(parseMetaParams("range=nt04").range).toBe("nt04");
  });
});

describe("serializeMetaParams", () => {
  it("omits defaults", () => {
    expect(serializeMetaParams(DEFAULT_META_PARAMS)).toBe("");
    expect(hasActiveFilters(DEFAULT_META_PARAMS)).toBe(false);
  });

  it("writes non-defaults in a stable order and round-trips", () => {
    const state = {
      range: "60d",
      tiers: ["store-championship", "regional-championship"] as const,
      format: "standard-nt01-nt03",
      imports: true,
    };
    const query = serializeMetaParams({ ...state, tiers: [...state.tiers] });
    expect(query).toBe("range=60d&tiers=regionals%2Cstore&format=standard-nt01-nt03&imports=1");
    expect(parseMetaParams(query)).toEqual({ ...state, tiers: ["regional-championship", "store-championship"] });
    expect(hasActiveFilters(parseMetaParams(query))).toBe(true);
  });

  it("treats the imports toggle as a data source, not a filter", () => {
    const state = { ...DEFAULT_META_PARAMS, imports: true };
    expect(hasActiveFilters(state)).toBe(false);
    expect(resetFilters({ ...state, range: "30d", tiers: ["online-open"] })).toEqual(state);
  });

  it("keeps unrelated params and replaces its own", () => {
    expect(serializeMetaParams({ ...DEFAULT_META_PARAMS, range: "30d" }, "foo=bar&range=90d&tiers=store")).toBe(
      "foo=bar&range=30d",
    );
  });

  it("drops unknown ranges and slugs format labels", () => {
    expect(serializeMetaParams({ ...DEFAULT_META_PARAMS, range: "7d", format: "Standard (NT01–NT04)" })).toBe(
      "format=standard-nt01-nt04",
    );
  });
});

describe("formats", () => {
  it("slugs labels", () => {
    expect(formatSlug("Standard (NT01–NT04)")).toBe("standard-nt01-nt04");
    expect(formatSlug("  ")).toBe("");
  });

  it("resolves a slug against the formats present", () => {
    expect(resolveFormat("standard-nt01-nt03", FORMATS)).toBe("Standard (NT01–NT03)");
    expect(resolveFormat("standard-nt01-nt09", FORMATS)).toBeUndefined();
    expect(resolveFormat(null, FORMATS)).toBeUndefined();
  });
});

describe("normalizeTiers", () => {
  it("orders by prestige", () => {
    expect(normalizeTiers(["store-championship", "national-championship", "store-championship"])).toEqual([
      "national-championship",
      "store-championship",
    ]);
  });
});

describe("date presets", () => {
  it("shifts ISO dates across month and year boundaries", () => {
    expect(shiftIsoDate("2026-10-10", -30)).toBe("2026-09-10");
    expect(shiftIsoDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftIsoDate("2027-01-15", -90)).toBe("2026-10-17");
    expect(shiftIsoDate("not-a-date", 3)).toBe("not-a-date");
  });

  it("counts day windows back from the newest event, not today", () => {
    expect(presetFilter("30d", "2026-10-10")).toEqual({ from: "2026-09-10" });
    expect(presetFilter("60d", "2026-10-10")).toEqual({ from: "2026-08-11" });
    expect(presetFilter("90d", "2026-06-01")).toEqual({ from: "2026-03-03" });
  });

  it("handles all, fixed-start, unknown presets and missing data", () => {
    expect(presetFilter("all", "2026-10-10")).toEqual({});
    expect(presetFilter("nt04", null)).toEqual({ from: "2026-07-17" });
    expect(presetFilter("30d", null)).toEqual({});
    expect(presetFilter("bogus", "2026-10-10")).toEqual({});
  });

  it("builds the full engine filter", () => {
    const state = parseMetaParams("range=30d&tiers=store&format=standard-nt01-nt04");
    expect(toMetaFilter(state, { newestDate: "2026-10-10", formats: FORMATS })).toEqual({
      from: "2026-09-10",
      tiers: ["store-championship"],
      format: "Standard (NT01–NT04)",
    });
    expect(toMetaFilter(parseMetaParams("format=unknown"), { newestDate: "2026-10-10", formats: FORMATS })).toEqual({});
  });
});
