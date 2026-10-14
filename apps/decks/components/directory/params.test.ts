import { describe, expect, it } from "vitest";
import {
  DEFAULT_DECK_PARAMS,
  MAX_CARD_FILTERS,
  MAX_TEXT_LENGTH,
  activeFilterCount,
  hasActiveFilters,
  parseDeckParams,
  resetDeckFilters,
  serializeDeckParams,
  toDeckQuery,
  toggleValue,
  type DeckParams,
} from "./params";

describe("parseDeckParams", () => {
  it("returns the defaults for an empty query", () => {
    expect(parseDeckParams("")).toEqual(DEFAULT_DECK_PARAMS);
    expect(parseDeckParams(new URLSearchParams())).toEqual(DEFAULT_DECK_PARAMS);
  });

  it("reads a deep link with a single archetype", () => {
    expect(parseDeckParams("archetype=akatsuki-pain")).toEqual({ ...DEFAULT_DECK_PARAMS, archetypeIds: ["akatsuki-pain"] });
  });

  it("accepts repeated keys and comma lists, deduplicates and orders archetypes canonically", () => {
    const state = parseDeckParams("archetype=sand-gaara,uchiha-avenger&archetype=sand-gaara&archetype=Hyuga-Gentle-Fist");
    expect(state.archetypeIds).toEqual(["uchiha-avenger", "hyuga-gentle-fist", "sand-gaara"]);
  });

  it("ignores unknown archetypes, tiers, sources, placements and sorts", () => {
    const state = parseDeckParams("archetype=nope&tier=galactic&source=friends&placement=top3&sort=random&sort=votes");
    expect(state).toEqual(DEFAULT_DECK_PARAMS);
  });

  it("does not treat prototype keys as valid values", () => {
    expect(parseDeckParams("sort=constructor&placement=toString&source=__proto__")).toEqual(DEFAULT_DECK_PARAMS);
  });

  it("reads tiers by slug or full id, in prestige order", () => {
    expect(parseDeckParams("tier=store,nationals&tier=online-open").tiers).toEqual([
      "national-championship",
      "online-open",
      "store-championship",
    ]);
  });

  it("reads valid source, placement and sort values", () => {
    const state = parseDeckParams("source=community&placement=top8&sort=winrate");
    expect(state.source).toBe("community");
    expect(state.placement).toBe("top8");
    expect(state.sort).toBe("winrate");
  });

  it("validates card ids case-insensitively and keeps insertion order", () => {
    const state = parseDeckParams("card=nt02-003&card=NOPE-1,NT01-L01&card=NT02-003");
    expect(state.cardIds).toEqual(["NT02-003", "NT01-L01"]);
  });

  it("caps the number of card filters", () => {
    const ids = ["NT01-001", "NT01-002", "NT01-003", "NT01-004", "NT01-005", "NT01-006", "NT01-007", "NT01-008", "NT01-009", "NT01-010", "NT01-011"];
    expect(parseDeckParams(`card=${ids.join(",")}`).cardIds).toHaveLength(MAX_CARD_FILTERS);
  });

  it("trims and limits the text search", () => {
    expect(parseDeckParams("q=%20%20sage%20mode%20").text).toBe("sage mode");
    expect(parseDeckParams(`q=${"a".repeat(300)}`).text).toHaveLength(MAX_TEXT_LENGTH);
  });
});

describe("serializeDeckParams", () => {
  it("omits every default", () => {
    expect(serializeDeckParams(DEFAULT_DECK_PARAMS)).toBe("");
  });

  it("writes lists as repeated keys and tiers as slugs", () => {
    const state: DeckParams = {
      text: " itachi ",
      archetypeIds: ["sand-gaara", "uchiha-avenger"],
      source: "tournament",
      tiers: ["store-championship", "national-championship"],
      placement: "top4",
      cardIds: ["NT02-003"],
      sort: "votes",
    };
    expect(serializeDeckParams(state)).toBe(
      "q=itachi&archetype=uchiha-avenger&archetype=sand-gaara&source=tournament&tier=nationals&tier=store&placement=top4&card=NT02-003&sort=votes",
    );
  });

  it("keeps foreign keys from the base query and replaces its own", () => {
    const query = serializeDeckParams({ ...DEFAULT_DECK_PARAMS, sort: "placement" }, "?ref=nav&sort=votes&archetype=sand-gaara");
    expect(new URLSearchParams(query).get("ref")).toBe("nav");
    expect(new URLSearchParams(query).getAll("sort")).toEqual(["placement"]);
    expect(new URLSearchParams(query).has("archetype")).toBe(false);
  });

  it("round-trips through parse", () => {
    const state: DeckParams = {
      text: "kirin & chidori",
      archetypeIds: ["itachi-tsukuyomi", "akatsuki-pain"],
      source: "all",
      tiers: ["regional-championship"],
      placement: "winner",
      cardIds: ["NT01-L01", "NT02-007"],
      sort: "placement",
    };
    expect(parseDeckParams(serializeDeckParams(state))).toEqual(state);
  });

  it("drops invalid values that slip into the state", () => {
    const state = { ...DEFAULT_DECK_PARAMS, archetypeIds: ["made-up"], cardIds: ["XX-000"], sort: "bogus" } as unknown as DeckParams;
    expect(serializeDeckParams(state)).toBe("");
  });
});

describe("filter state helpers", () => {
  it("counts filter groups but not the text search or sort", () => {
    expect(activeFilterCount(DEFAULT_DECK_PARAMS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_DECK_PARAMS, text: "x", sort: "votes" })).toBe(0);
    expect(
      activeFilterCount({
        ...DEFAULT_DECK_PARAMS,
        archetypeIds: ["sand-gaara", "uchiha-avenger"],
        source: "community",
        tiers: ["online-open"],
        placement: "top16",
        cardIds: ["NT02-003"],
      }),
    ).toBe(6);
  });

  it("treats text as a filter and sort as not", () => {
    expect(hasActiveFilters(DEFAULT_DECK_PARAMS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_DECK_PARAMS, sort: "votes" })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_DECK_PARAMS, text: "  " })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_DECK_PARAMS, text: "pain" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_DECK_PARAMS, placement: "winner" })).toBe(true);
  });

  it("resets filters but keeps the sort", () => {
    const state: DeckParams = { ...DEFAULT_DECK_PARAMS, text: "x", source: "community", sort: "winrate" };
    expect(resetDeckFilters(state)).toEqual({ ...DEFAULT_DECK_PARAMS, sort: "winrate" });
  });

  it("maps the state onto a catalog query", () => {
    const state: DeckParams = { ...DEFAULT_DECK_PARAMS, text: "lee", tiers: ["online-open"], cardIds: ["NT01-L04"] };
    expect(toDeckQuery(state)).toMatchObject({ text: "lee", tiers: ["online-open"], cardIds: ["NT01-L04"], sort: "newest" });
  });

  it("toggles list values", () => {
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
  });
});
