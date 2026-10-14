import type { CardPrinting, CardSet, NarutoCard } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  MAX_QUERY_LENGTH,
  activeFacetCount,
  applyFilters,
  buildSearchIndex,
  clearFacet,
  countFacets,
  facetCounts,
  filtersFromSearchParams,
  hasActiveFilters,
  highlightSegments,
  matchQuery,
  normalize,
  search,
  searchSuggestions,
  stateFromSearchParams,
  toQueryString,
  toSearchParams,
  toggleFacetValue,
  tokenize,
  type BrowserState,
  type CardFilters,
  type SortKey,
  cardsHref,
  phraseQuery,
} from "@/lib/search";

// --- fixtures ---------------------------------------------------------------

const SETS: CardSet[] = [
  { id: "NR02", name: "Booster 02", shortName: "B2", kind: "booster", releaseDate: "2026-07-01", totalCards: 10 },
  { id: "ST01", name: "Starter 01", shortName: "S1", kind: "starter", releaseDate: "2026-03-01", totalCards: 10 },
  { id: "PR01", name: "Promo 01", shortName: "P1", kind: "promo", releaseDate: "2026-05-01", totalCards: 10 },
  { id: "EMPTY", name: "Empty", shortName: "E", kind: "booster", releaseDate: "2027-01-01", totalCards: 10 },
];

const printing = (setId: string, number: string, rarity: CardPrinting["rarity"] = "common", variant: CardPrinting["variant"] = "standard"): CardPrinting => ({
  setId,
  number,
  rarity,
  variant,
});

function card(partial: Partial<NarutoCard> & Pick<NarutoCard, "id" | "name">): NarutoCard {
  return {
    type: "character",
    element: "fire",
    cost: 2,
    power: 2000,
    traits: [],
    keywords: [],
    effect: "",
    printings: [printing(partial.id.slice(0, 4), partial.id)],
    ...partial,
  };
}

// Canonical order (as lib/data provides it): ST01, then PR01-debuts, then NR02.
const CARDS: NarutoCard[] = [
  card({
    id: "ST01-001",
    name: "Naruto Uzumaki",
    title: "Number One Hyperactive Ninja",
    type: "leader",
    element: "wind",
    cost: undefined,
    power: 5000,
    traits: ["Leaf Village", "Team 7", "Jinchuriki"],
    effect: "[Activate: Main] Up to 1 of your {Team 7} characters gains +1000 power.",
    printings: [printing("ST01", "ST01-001", "super-rare"), printing("ST01", "ST01-001", "parallel-rare", "parallel")],
  }),
  card({
    id: "ST01-002",
    name: "Sasuke Uchiha",
    title: "Last of the Uchiha",
    element: "lightning",
    cost: 4,
    power: 5000,
    traits: ["Leaf Village", "Team 7", "Uchiha Clan"],
    keywords: ["Rush"],
    effect: "[On Play] K.O. up to 1 of your opponent's characters with 3000 power or less.",
    printings: [printing("ST01", "ST01-002", "super-rare"), printing("PR01", "P-007", "promo", "promo")],
  }),
  card({
    id: "ST01-003",
    name: "Sakura Haruno",
    element: "earth",
    cost: 2,
    power: 2000,
    traits: ["Leaf Village", "Team 7", "Medical Ninja"],
    effect: "[On Play] If your leader is [Naruto Uzumaki], draw 1 card.",
    printings: [printing("ST01", "ST01-003", "rare")],
  }),
  card({
    id: "ST01-011",
    name: "Rasengan",
    type: "jutsu",
    element: "wind",
    cost: 2,
    power: undefined,
    traits: ["Ninjutsu"],
    keywords: ["Counter"],
    effect: "[Counter] Up to 1 of your leader or characters gains +2000 power during this battle.",
    printings: [printing("ST01", "ST01-011", "rare")],
  }),
  card({
    id: "NR02-001",
    name: "Kankurō",
    title: "Puppet Master of the Sand",
    element: "earth",
    cost: 3,
    power: 4000,
    traits: ["Sand Village", "Puppet Corps"],
    keywords: ["Blocker"],
    effect: "Naruto's rival puppets block attacks.",
    printings: [printing("NR02", "NR02-001", "uncommon")],
    reveal: { date: "2026-06-10", source: "Test", url: "https://example.com/a" },
  }),
  card({
    id: "NR02-002",
    name: "Itachi Uchiha",
    title: "Akatsuki Agent",
    element: "fire",
    cost: 6,
    power: 7000,
    traits: ["Akatsuki", "Uchiha Clan", "Rogue Ninja"],
    keywords: ["Sharingan"],
    effect: "[On Play] Your opponent trashes 1 card.",
    printings: [printing("NR02", "NR02-002", "secret-rare")],
    reveal: { date: "2026-06-20", source: "Test", url: "https://example.com/b" },
  }),
  card({
    id: "NR02-003",
    name: "Mission: Escort",
    type: "mission",
    element: "water",
    cost: 1,
    power: undefined,
    traits: [],
    effect: "Draw 1 card when a {Team 7} character attacks.",
    printings: [printing("NR02", "NR02-003", "common")],
  }),
];

const index = buildSearchIndex(CARDS, SETS);
const ids = (filters: Partial<CardFilters>, sort: SortKey = "relevance") =>
  search(index, { ...EMPTY_FILTERS, ...filters }, sort).map((hit) => hit.card.id);

// --- normalize / tokenize ---------------------------------------------------

describe("normalize", () => {
  it("lowercases, strips diacritics and apostrophes, and collapses whitespace", () => {
    expect(normalize("  Kankurō   THE\tPuppet  ")).toBe("kankuro the puppet");
    expect(normalize("Opponent’s Turn")).toBe("opponents turn");
    expect(normalize("ＮＡＲＵＴＯ")).toBe("naruto");
  });
});

describe("tokenize", () => {
  it("splits on whitespace and normalizes", () => {
    expect(tokenize("  Naruto   UZUMAKI ")).toEqual(["naruto", "uzumaki"]);
  });

  it("keeps quoted phrases together", () => {
    expect(tokenize('"Team 7" rush')).toEqual(["team 7", "rush"]);
    expect(tokenize("“Leaf Village” blocker")).toEqual(["leaf village", "blocker"]);
  });

  it("treats an unterminated quote as a phrase to the end", () => {
    expect(tokenize('rush "team 7')).toEqual(["rush", "team 7"]);
  });

  it("drops empty phrases and duplicates", () => {
    expect(tokenize('"" naruto Naruto ""')).toEqual(["naruto"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

// --- matching and scoring ---------------------------------------------------

describe("text matching", () => {
  it("requires every token to match (AND)", () => {
    expect(ids({ query: "uchiha" })).toEqual(["ST01-002", "NR02-002"]);
    expect(ids({ query: "uchiha akatsuki" })).toEqual(["NR02-002"]);
    expect(ids({ query: "uchiha nonexistent" })).toEqual([]);
  });

  it("matches character tags, keywords, rules text, IDs and printing numbers", () => {
    expect(ids({ query: '"medical ninja"' })).toEqual(["ST01-003"]);
    expect(ids({ query: "blocker" })).toEqual(["NR02-001"]);
    expect(ids({ query: "trashes" })).toEqual(["NR02-002"]);
    expect(ids({ query: "st01-011" })).toEqual(["ST01-011"]);
    expect(ids({ query: "p-007" })).toEqual(["ST01-002"]);
  });

  it("ignores diacritics in both directions", () => {
    expect(ids({ query: "kankuro" })).toEqual(["NR02-001"]);
    expect(ids({ query: "Kankurō" })).toEqual(["NR02-001"]);
  });

  it("matches phrases only as contiguous text", () => {
    expect(ids({ query: '"team 7"' })).toEqual(["ST01-001", "ST01-002", "ST01-003", "NR02-003"]);
    expect(ids({ query: '"7 team"' })).toEqual([]);
  });

  it("does not match short tokens in the middle of rules-text words", () => {
    // "ay" appears inside "Play" but no word starts with it.
    expect(ids({ query: "ay" })).toEqual([]);
  });

  it("ranks name > title > id > traits > keywords > effect", () => {
    // "naruto": name (ST01-001) beats rules text mentions (ST01-003 and NR02-001).
    const naruto = ids({ query: "naruto" });
    expect(naruto[0]).toBe("ST01-001");
    expect(new Set(naruto.slice(1))).toEqual(new Set(["ST01-003", "NR02-001"]));

    // "akatsuki": title (NR02-002 "Akatsuki Agent") outranks a bare trait match.
    const sasuke = search(index, { ...EMPTY_FILTERS, query: "akatsuki" });
    expect(sasuke.map((h) => h.card.id)).toEqual(["NR02-002"]);
    expect(sasuke[0]?.score).toBe(80);
  });

  it("prefers name prefix over word-start over substring", () => {
    const local = buildSearchIndex([
      card({ id: "A-001", name: "Shino Aburame" }), // substring ("ino" inside "shino")
      card({ id: "A-002", name: "Yamanaka Ino" }), // word start
      card({ id: "A-003", name: "Ino Yamanaka" }), // prefix
      card({ id: "A-004", name: "Ino" }), // exact
    ]);
    expect(search(local, { ...EMPTY_FILTERS, query: "ino" }).map((h) => h.card.id)).toEqual([
      "A-004",
      "A-003",
      "A-002",
      "A-001",
    ]);
  });

  it("orders equal scores canonically and falls back to canonical order without a query", () => {
    expect(ids({ query: "leaf" })).toEqual(["ST01-001", "ST01-002", "ST01-003"]);
    expect(ids({})).toEqual(CARDS.map((c) => c.id));
  });
});

// --- facets -----------------------------------------------------------------

describe("facets", () => {
  it("is OR within a facet and AND across facets", () => {
    expect(ids({ elements: ["wind", "earth"] })).toEqual(["ST01-001", "ST01-003", "ST01-011", "NR02-001"]);
    expect(ids({ elements: ["wind", "earth"], types: ["character"] })).toEqual(["ST01-003", "NR02-001"]);
    expect(ids({ elements: ["wind"], types: ["mission"] })).toEqual([]);
  });

  it("combines facets with the query", () => {
    expect(ids({ query: '"team 7"', types: ["character"] })).toEqual(["ST01-002", "ST01-003"]);
  });

  it("matches rarity across any printing", () => {
    expect(ids({ rarities: ["parallel-rare"] })).toEqual(["ST01-001"]);
    expect(ids({ rarities: ["promo"] })).toEqual(["ST01-002"]);
    expect(ids({ rarities: ["super-rare"] })).toEqual(["ST01-001", "ST01-002"]);
  });

  it("matches set across any printing", () => {
    expect(ids({ sets: ["PR01"] })).toEqual(["ST01-002"]);
    expect(ids({ sets: ["ST01"] })).toEqual(["ST01-001", "ST01-002", "ST01-003", "ST01-011"]);
    expect(ids({ sets: ["EMPTY"] })).toEqual([]);
  });

  it("never matches leaders (no cost) against an active cost filter", () => {
    expect(ids({ costs: [2] })).toEqual(["ST01-003", "ST01-011"]);
    expect(ids({ costs: [0, 1, 2, 3, 4, 5, 6] })).not.toContain("ST01-001");
    expect(ids({ types: ["leader"], costs: [2] })).toEqual([]);
  });
});

describe("facet counts", () => {
  it("counts every option against the query and the other facets only", () => {
    const filters: CardFilters = { ...EMPTY_FILTERS, elements: ["earth"], types: ["character"] };
    const counts = facetCounts(index, filters);
    expect(counts.total).toBe(2);
    // Element counts ignore the element selection but keep type=character.
    expect(Object.fromEntries(counts.elements)).toEqual({ fire: 1, water: 0, lightning: 1, earth: 2, wind: 0 });
    // Type counts ignore the type selection but keep element=earth.
    expect(Object.fromEntries(counts.types)).toEqual({ leader: 0, character: 2, mission: 0, jutsu: 0 });
    // Other facets apply both selections.
    expect(counts.costs.get(2)).toBe(1);
    expect(counts.costs.get(3)).toBe(1);
    expect(counts.costs.get(6)).toBe(0);
  });

  it("counts multi-printing cards once per rarity and set they appear in", () => {
    const counts = facetCounts(index, EMPTY_FILTERS);
    expect(counts.total).toBe(CARDS.length);
    expect(counts.rarities.get("super-rare")).toBe(2);
    expect(counts.rarities.get("parallel-rare")).toBe(1);
    expect(counts.rarities.get("promo")).toBe(1);
    expect(counts.sets.get("ST01")).toBe(4);
    expect(counts.sets.get("PR01")).toBe(1);
    expect(counts.sets.get("EMPTY")).toBe(0);
    // Costs list only the distinct costs present; leaders are not counted.
    expect([...counts.costs.keys()]).toEqual([1, 2, 3, 4, 6]);
    expect([...counts.costs.values()].reduce((a, b) => a + b, 0)).toBe(CARDS.length - 1);
  });

  it("applies the query to counts", () => {
    const counts = facetCounts(index, { ...EMPTY_FILTERS, query: "uchiha" });
    expect(counts.total).toBe(2);
    expect(counts.elements.get("lightning")).toBe(1);
    expect(counts.elements.get("fire")).toBe(1);
    expect(counts.elements.get("wind")).toBe(0);
  });

  it("agrees with applyFilters when a single option is selected", () => {
    const result = matchQuery(index, "");
    for (const rarity of ["common", "super-rare", "promo"] as const) {
      const base: CardFilters = { ...EMPTY_FILTERS, elements: ["lightning", "fire"] };
      const expected = applyFilters(result, { ...base, rarities: [rarity] }).length;
      expect(countFacets(index, result, base).rarities.get(rarity)).toBe(expected);
    }
  });
});

// --- sorting ----------------------------------------------------------------

describe("sorting", () => {
  it("sorts by name, cost and power with missing values last", () => {
    expect(ids({}, "name")[0]).toBe("NR02-002"); // Itachi
    expect(ids({}, "cost-asc")).toEqual(["NR02-003", "ST01-003", "ST01-011", "NR02-001", "ST01-002", "NR02-002", "ST01-001"]);
    expect(ids({}, "cost-desc").at(-1)).toBe("ST01-001");
    expect(ids({}, "power-desc").slice(-2)).toEqual(["ST01-011", "NR02-003"]);
  });

  it("sorts newest set first, then newest reveal", () => {
    expect(ids({}, "newest").slice(0, 3)).toEqual(["NR02-002", "NR02-001", "NR02-003"]);
  });

  it("uses canonical order for the set sort even with a query", () => {
    expect(ids({ query: "naruto" }, "set")).toEqual(["ST01-001", "ST01-003", "NR02-001"]);
  });
});

// --- URL contract -----------------------------------------------------------

describe("URL serialization", () => {
  // Release order, as the browser passes it: ST01, PR01, NR02, EMPTY.
  const context = { setIds: index.setIds };
  const parse = (qs: string) => stateFromSearchParams(new URLSearchParams(qs), context);

  it("omits defaults", () => {
    expect(toQueryString({ filters: EMPTY_FILTERS, sort: "relevance", view: "grid" })).toBe("");
    expect(toSearchParams({}).toString()).toBe("");
  });

  it("writes literal commas and encodes the query", () => {
    const state: BrowserState = {
      filters: { ...EMPTY_FILTERS, query: "team 7", types: ["leader", "jutsu"], costs: [2, 10] },
      sort: "cost-desc",
      view: "list",
    };
    expect(toQueryString(state)).toBe("?q=team%207&type=leader,jutsu&cost=2,10&sort=cost-desc&view=list");
  });

  it("round-trips every field", () => {
    const state: BrowserState = {
      filters: {
        query: 'naruto "team 7"',
        types: ["leader", "character"],
        elements: ["water", "wind"],
        costs: [0, 3, 12],
        rarities: ["parallel-rare", "secret-rare", "promo"],
        sets: ["ST01", "NR02"],
      },
      sort: "newest",
      view: "list",
    };
    expect(parse(toQueryString(state).slice(1))).toEqual(state);
    expect(parse(toSearchParams(state).toString())).toEqual(state);
  });

  it("drops unknown values, dedupes, canonicalizes order and case", () => {
    const state = parse(
      "type=jutsu,LEADER,jutsu,wizard&element=fire,,yin&cost=3,-1,21,abc,2.5,3,0&rarity=promo,mythic&set=st01,NOPE,ST01&sort=bogus&view=table",
    );
    expect(state).toEqual({
      filters: { query: "", types: ["leader", "jutsu"], elements: ["fire"], costs: [0, 3], rarities: ["promo"], sets: ["ST01"] },
      sort: "relevance",
      view: "grid",
    });
  });

  it("accepts repeated params and encoded commas", () => {
    expect(parse("element=fire&element=water%2Cwind").filters.elements).toEqual(["fire", "water", "wind"]);
  });

  it("clamps and cleans the query", () => {
    const long = "x".repeat(MAX_QUERY_LENGTH + 50);
    expect(parse(`q=${long}`).filters.query).toHaveLength(MAX_QUERY_LENGTH);
    expect(parse("q=%20%20team%20%20%207%20").filters.query).toBe("team 7");
    expect(parse("q=team+7").filters.query).toBe("team 7");
  });

  it("never produces a query that cannot be encoded", () => {
    const cut = `${"x".repeat(MAX_QUERY_LENGTH - 1)}🍥`; // the emoji straddles the limit
    const state: BrowserState = { filters: { ...EMPTY_FILTERS, query: cut }, sort: "relevance", view: "grid" };
    expect(() => toQueryString(state)).not.toThrow();
    expect(parse(toQueryString(state).slice(1)).filters.query).toBe("x".repeat(MAX_QUERY_LENGTH - 1));
    expect(toQueryString({ filters: { ...EMPTY_FILTERS, query: "a\uD800b 🍥" } })).toBe("?q=ab%20%F0%9F%8D%A5");
  });

  it("orders known sets by the given set order and validates unknown ones by shape", () => {
    expect(index.setIds).toEqual(["ST01", "PR01", "NR02", "EMPTY"]);
    expect(parse("set=NR02,ST01").filters.sets).toEqual(["ST01", "NR02"]);
    expect(filtersFromSearchParams(new URLSearchParams("set=ST01,<script>,NR99")).sets).toEqual(["ST01", "NR99"]);
  });

  it("survives garbage without throwing", () => {
    const garbage = new URLSearchParams();
    for (let i = 0; i < 500; i += 1) garbage.append("type", "leader,".repeat(50));
    garbage.append("cost", "9".repeat(400));
    garbage.append("%%%", "%%%");
    const state = stateFromSearchParams(garbage, context);
    expect(state.filters.types).toEqual(["leader"]);
    expect(state.filters.costs).toEqual([]);
  });
});

// --- state helpers ----------------------------------------------------------

describe("filter helpers", () => {
  it("toggles values in canonical order", () => {
    let f = toggleFacetValue(EMPTY_FILTERS, "elements", "wind");
    f = toggleFacetValue(f, "elements", "fire");
    expect(f.elements).toEqual(["fire", "wind"]);
    f = toggleFacetValue(f, "elements", "wind");
    expect(f.elements).toEqual(["fire"]);
    f = toggleFacetValue(f, "costs", 7);
    f = toggleFacetValue(f, "costs", 2);
    expect(f.costs).toEqual([2, 7]);
    f = toggleFacetValue(f, "sets", "NR02", ["ST01", "NR02"]);
    f = toggleFacetValue(f, "sets", "ST01", ["ST01", "NR02"]);
    expect(f.sets).toEqual(["ST01", "NR02"]);
    expect(activeFacetCount(f)).toBe(5);
    expect(hasActiveFilters(f)).toBe(true);
    expect(clearFacet(f, "costs").costs).toEqual([]);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "  " })).toBe(false);
  });
});

// --- highlighting and suggestions --------------------------------------------

describe("highlightSegments", () => {
  const marked = (text: string, query: string) =>
    highlightSegments(text, tokenize(query))
      .map((s) => (s.match ? `[${s.text}]` : s.text))
      .join("");

  it("marks every token occurrence without changing the text", () => {
    expect(marked("Naruto Uzumaki", "uzu naru")).toBe("[Naru]to [Uzu]maki");
    expect(marked("Sasuke Uchiha", "")).toBe("Sasuke Uchiha");
    expect(highlightSegments("", ["a"])).toEqual([]);
  });

  it("maps normalized matches back to the original characters", () => {
    expect(marked("Kankurō", "kuro")).toBe("Kan[kurō]");
    expect(marked("Opponent’s  Turn", "opponents turn")).toBe("[Opponent’s]  [Turn]");
    expect(marked("Team  7", '"team 7"')).toBe("[Team  7]");
  });
});

describe("searchSuggestions", () => {
  it("suggests the most common tags and keywords, quoting phrases", () => {
    const suggestions = searchSuggestions(index, 6);
    expect(suggestions[0]).toBe('"Leaf Village"');
    expect(suggestions).toContain('"Team 7"');
    expect(suggestions).toHaveLength(6);
  });

  it("handles an empty index", () => {
    expect(searchSuggestions(buildSearchIndex([]))).toEqual([]);
    expect(search(buildSearchIndex([]), EMPTY_FILTERS)).toEqual([]);
  });
});

describe("cardsHref", () => {
  it("links to the bare database when nothing is set", () => {
    expect(cardsHref()).toBe("/cards");
    expect(cardsHref({ query: "   " })).toBe("/cards");
  });

  it("encodes filters with the shared URL contract", () => {
    expect(cardsHref({ elements: ["fire"] })).toBe("/cards?element=fire");
    expect(cardsHref({ query: "team 7", sets: ["NR01"] }, { view: "list" })).toBe("/cards?q=team%207&set=NR01&view=list");
    expect(cardsHref({ query: "a&b=c" })).toBe("/cards?q=a%26b%3Dc");
  });
});

describe("phraseQuery", () => {
  it("quotes multi-word terms and strips stray quotes", () => {
    expect(phraseQuery("Leaf Village")).toBe('"Leaf Village"');
    expect(phraseQuery("  Rush ")).toBe("Rush");
    expect(phraseQuery('Team "7"')).toBe('"Team 7"');
  });
});
