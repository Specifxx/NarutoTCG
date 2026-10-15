import {
  CARD_TYPES,
  CHAKRA_ELEMENTS,
  PRINTING_VARIANTS,
  RARITIES,
  type CardPrinting,
  type CardSet,
  type NarutoCard,
} from "@naruto-tcg/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, generateStaticParams } from "@/app/art/[id]/[setId]/[number]/[variant]/route";
import {
  ART_HEIGHT,
  ART_WIDTH,
  SeededRandom,
  escapeXml,
  hashString,
  measureText,
  renderCardArtSvg,
  wrapText,
} from "@/lib/art";
import { getAllCards } from "@/lib/data";
import { generatedArtSrc } from "@/lib/meta";

// The /art route reads the real dataset through the server-only data module.
// Tests may register extra fixture cards (e.g. same-variant reprints) beside it.
const extraCards = vi.hoisted(() => new Map<string, NarutoCard>());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data")>();
  return { ...actual, getCard: (id: string) => extraCards.get(id) ?? actual.getCard(id) };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SET: CardSet = {
  id: "TS01",
  name: "Test Set 01: Fixtures",
  shortName: "Test Set 01",
  kind: "booster",
  releaseDate: "2026-01-01",
  totalCards: 10,
};

const PROMO_SET: CardSet = { ...SET, id: "PRT", name: "Promo Pack Test", shortName: "Promo Pack Test", kind: "promo" };

function makePrinting(overrides: Partial<CardPrinting> = {}): CardPrinting {
  return { setId: SET.id, number: "TS01-001", rarity: "rare", variant: "standard", ...overrides };
}

function makeCard(overrides: Partial<NarutoCard> = {}): NarutoCard {
  return {
    id: "TS01-001",
    name: "Test Ninja",
    title: "Fixture of the Leaf",
    type: "character",
    element: "fire",
    cost: 3,
    power: 4000,
    traits: ["Leaf Village", "Team 7"],
    keywords: ["Rush"],
    effect: "[On Play] Draw 1 card. Then, up to 1 of your {Team 7} characters gains +1000 power until the end of your turn.",
    flavor: "Never give up.",
    artist: "Test Artist",
    printings: [makePrinting()],
    ...overrides,
  };
}

/** A card that exercises every overflow path at once. */
const WORST_CASE = makeCard({
  id: "TS01-999",
  name: "An Extraordinarily Long Card Name That Will Never Fit On One Line",
  title: "With An Equally Long Epithet That Also Needs To Be Shortened Somehow",
  type: "leader",
  cost: undefined,
  power: 123456,
  traits: Array.from({ length: 12 }, (_, k) => `Trait Number ${k + 1}`),
  keywords: ["Rush", "Blocker", "Double Attack", "Sharingan", "Resilient", "Substitution", "Ambush", "Banish"],
  effect: Array.from({ length: 14 }, () => "[When Attacking] [Once Per Turn] K.O. up to 1 of your opponent's characters with 5000 power or less, then {Team 7} [Naruto Uzumaki] draws 1 card.").join(" "),
  flavor: "This flavor text should be dropped because the rules text fills the whole box.",
  printings: [makePrinting({ rarity: "secret-rare", variant: "parallel" })],
});

// ---------------------------------------------------------------------------
// A tiny XML well-formedness checker (tags, attributes, entities, one root)
// ---------------------------------------------------------------------------

const ALLOWED_ELEMENTS = new Set([
  "svg",
  "title",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "pattern",
  "clipPath",
  "mask",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "text",
  "tspan",
  "use",
]);

const ENTITY = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/y;

function checkEntities(text: string, where: string, problems: string[]): void {
  for (let k = text.indexOf("&"); k !== -1; k = text.indexOf("&", k + 1)) {
    ENTITY.lastIndex = k;
    if (!ENTITY.test(text)) problems.push(`bare "&" in ${where}`);
  }
}

interface ParsedSvg {
  problems: string[];
  elements: { name: string; attrs: Record<string, string> }[];
  text: string;
}

function parseSvg(svg: string): ParsedSvg {
  const problems: string[] = [];
  const elements: ParsedSvg["elements"] = [];
  const stack: string[] = [];
  let rootClosed = false;
  let rootCount = 0;
  let text = "";
  let pos = 0;
  const tag = /<[^<>]*>/g;
  for (let match = tag.exec(svg); match; match = tag.exec(svg)) {
    const between = svg.slice(pos, match.index);
    if (between.includes("<") || between.includes(">")) problems.push(`stray angle bracket near ${match.index}`);
    if (between.trim() && stack.length === 0) problems.push(`text outside the root: ${between.slice(0, 40)}`);
    checkEntities(between, "text", problems);
    text += between;
    pos = match.index + match[0].length;

    const raw = match[0];
    if (rootClosed) problems.push(`content after the root element: ${raw}`);
    if (raw.startsWith("</")) {
      const name = raw.slice(2, -1).trim();
      const open = stack.pop();
      if (open !== name) problems.push(`mismatched </${name}> (open: ${open ?? "none"})`);
      if (stack.length === 0) rootClosed = true;
      continue;
    }
    const selfClosing = raw.endsWith("/>");
    const inner = raw.slice(1, selfClosing ? -2 : -1);
    const nameMatch = /^([A-Za-z][\w:-]*)/.exec(inner);
    if (!nameMatch?.[1]) {
      problems.push(`unparseable tag ${raw.slice(0, 40)}`);
      continue;
    }
    const name = nameMatch[1];
    const attrText = inner.slice(name.length);
    const attrs: Record<string, string> = {};
    const attrPattern = /\s+([A-Za-z_:][\w:.-]*)="([^"<]*)"/y;
    let attrPos = 0;
    while (attrPos < attrText.length) {
      attrPattern.lastIndex = attrPos;
      const attr = attrPattern.exec(attrText);
      if (!attr?.[1]) {
        if (attrText.slice(attrPos).trim()) problems.push(`malformed attributes in <${name}>: ${attrText.slice(attrPos, attrPos + 40)}`);
        break;
      }
      if (attr[1] in attrs) problems.push(`duplicate attribute ${attr[1]} on <${name}>`);
      attrs[attr[1]] = attr[2] ?? "";
      checkEntities(attr[2] ?? "", `${name}@${attr[1]}`, problems);
      attrPos = attrPattern.lastIndex;
    }
    elements.push({ name, attrs });
    if (stack.length === 0) rootCount++;
    if (!selfClosing) stack.push(name);
    else if (stack.length === 0) rootClosed = true;
  }
  const tail = svg.slice(pos);
  if (tail.trim()) problems.push(`trailing content: ${tail.slice(0, 40)}`);
  if (stack.length > 0) problems.push(`unclosed elements: ${stack.join(", ")}`);
  if (rootCount !== 1) problems.push(`expected exactly one root element, found ${rootCount}`);
  if (elements[0]?.name !== "svg") problems.push("root element is not <svg>");
  return { problems, elements, text };
}

/** Well-formed, only known SVG elements, no event handlers, no external references. */
function expectSafeSvg(svg: string): ParsedSvg {
  const parsed = parseSvg(svg);
  const problems = [...parsed.problems];
  const ids = new Set<string>();
  const refs: string[] = [];
  for (const { name, attrs } of parsed.elements) {
    if (!ALLOWED_ELEMENTS.has(name)) problems.push(`unexpected element <${name}>`);
    if (attrs.id !== undefined) {
      if (ids.has(attrs.id)) problems.push(`duplicate id ${attrs.id}`);
      ids.add(attrs.id);
    }
    for (const [attr, value] of Object.entries(attrs)) {
      if (attr.toLowerCase().startsWith("on")) problems.push(`event handler ${attr}`);
      if (attr === "href" || attr === "xlink:href") {
        if (value.startsWith("#")) refs.push(value.slice(1));
        else problems.push(`external href ${value}`);
      }
      for (const ref of value.matchAll(/url\(([^)]*)\)/g)) {
        if (ref[1]?.startsWith("#")) refs.push(ref[1].slice(1));
        else problems.push(`external url(${ref[1]})`);
      }
    }
  }
  for (const ref of refs) if (!ids.has(ref)) problems.push(`dangling reference #${ref}`);
  if (/undefined|NaN|Infinity|\[object Object\]/.test(svg)) problems.push("leaked undefined/NaN");
  // Geometry is rounded to keep documents small (scale factors use 3 decimals).
  const longDecimal = /="[^"]*?\d\.\d{4,}/.exec(svg);
  if (longDecimal) problems.push(`unrounded number near ${longDecimal[0].slice(-40)}`);
  expect(problems).toEqual([]);
  return parsed;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderCardArtSvg", () => {
  it("returns a standalone 63 × 88 mm SVG document", () => {
    const svg = renderCardArtSvg(makeCard(), makePrinting(), SET);
    expect(ART_WIDTH).toBe(630);
    expect(ART_HEIGHT).toBe(880);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" width="630" height="880"')).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    const parsed = expectSafeSvg(svg);
    expect(parsed.elements.filter((e) => e.name === "svg")).toHaveLength(1);
    expect(parsed.text).toContain("Test Ninja");
  });

  it("is deterministic", () => {
    const card = makeCard();
    const printing = makePrinting();
    const first = renderCardArtSvg(card, printing, SET);
    expect(renderCardArtSvg(card, printing, SET)).toBe(first);
    expect(renderCardArtSvg(structuredClone(card), structuredClone(printing), SET)).toBe(first);
  });

  it("draws a different illustration for each card and for alternate art", () => {
    const ids = ["TS01-001", "TS01-002", "TS01-003", "TS01-004", "TS01-005", "TS01-006"];
    const outputs = ids.map((id) => renderCardArtSvg(makeCard({ id }), makePrinting(), SET));
    expect(new Set(outputs).size).toBe(ids.length);
    // The sky gradient alone already differs between most cards.
    const skies = outputs.map((svg) => /<linearGradient id="sky"[^]*?<\/linearGradient>/.exec(svg)?.[0]);
    expect(new Set(skies).size).toBeGreaterThan(1);

    const card = makeCard();
    const standard = renderCardArtSvg(card, makePrinting(), SET);
    const alt = renderCardArtSvg(card, makePrinting({ variant: "alt-art" }), SET);
    expect(alt).not.toBe(standard);
  });

  it("renders every card type, element, variant and rarity", () => {
    const cardFor = (type: (typeof CARD_TYPES)[number], element: (typeof CHAKRA_ELEMENTS)[number], seed: string) =>
      makeCard({
        id: `TS-${type}-${element}-${seed}`,
        type,
        element,
        cost: type === "leader" ? undefined : 2,
        power: type === "leader" || type === "character" ? 3000 : undefined,
        traits: type === "mission" ? ["B-Rank Mission"] : ["Leaf Village"],
      });
    const cases: [NarutoCard, CardPrinting][] = [];
    // Every type × element × variant (which also exercises both jutsu effects per element)...
    CARD_TYPES.forEach((type, t) =>
      CHAKRA_ELEMENTS.forEach((element, e) =>
        PRINTING_VARIANTS.forEach((variant, v) =>
          cases.push([cardFor(type, element, String(v)), makePrinting({ variant, rarity: RARITIES[(t + e + v) % RARITIES.length] ?? "common" })]),
        ),
      ),
    );
    // ...and every rarity × variant.
    for (const rarity of RARITIES) {
      for (const variant of PRINTING_VARIANTS) cases.push([cardFor("character", "water", rarity), makePrinting({ variant, rarity })]);
    }
    for (const [card, printing] of cases) {
      const svg = renderCardArtSvg(card, printing, printing.variant === "promo" ? PROMO_SET : SET);
      const parsed = expectSafeSvg(svg);
      expect(parsed.text, `${card.id}/${printing.variant}/${printing.rarity}`).toContain(card.type.toUpperCase());
      expect(svg.length).toBeLessThan(40_000);
    }
  });

  it("shows a leader crest instead of a cost, and power only for leaders and characters", () => {
    const leader = parseSvg(renderCardArtSvg(makeCard({ type: "leader", cost: undefined, power: 5000 }), makePrinting(), SET)).text;
    expect(leader).toContain("LEADER");
    expect(leader).toContain("POWER");
    expect(leader).toContain("5000");

    const character = parseSvg(renderCardArtSvg(makeCard({ cost: 7 }), makePrinting(), SET)).text;
    expect(character).toContain("POWER");
    expect(character).toMatch(/>?7/);

    for (const type of ["jutsu", "mission"] as const) {
      const text = parseSvg(renderCardArtSvg(makeCard({ type, power: undefined }), makePrinting(), SET)).text;
      expect(text, type).not.toContain("POWER");
    }
  });

  it("formats the type line, keywords and footer", () => {
    const svg = renderCardArtSvg(makeCard(), makePrinting({ rarity: "super-rare" }), SET);
    const { text } = parseSvg(svg);
    expect(text).toContain("CHARACTER");
    expect(text).toContain("— Leaf Village · Team 7");
    expect(text).toContain("RUSH");
    expect(text).toContain("TS01-001");
    expect(text).toContain("SR");
    expect(text).toContain("Illus. Test Artist");
    expect(text).toContain("SAMPLE DATA");
  });

  it("styles timing tags, keywords, card names and traits in rules text", () => {
    const card = makeCard({
      effect: "[On Play] [Once Per Turn] If your leader is [Naruto Uzumaki], up to 1 {Team 7} character gains [Double Attack].",
    });
    const svg = renderCardArtSvg(card, makePrinting(), SET);
    expect(svg).toMatch(/font-weight="700" fill="#fff"[^>]*>On Play<\/tspan>/);
    expect(svg).toContain(">Once Per Turn</tspan>");
    expect(svg).not.toContain("[On Play]");
    expect(svg).toMatch(/font-weight="700"[^>]*>\[Naruto Uzumaki\]<\/tspan>/);
    expect(svg).toContain("{Team 7}");
    expect(svg).toContain(">Double Attack</tspan>");
    expectSafeSvg(svg);
  });

  it("classifies brackets exactly like the rules readout", () => {
    // "Piercing" is only on the card, not in the glossary; the tags are
    // tag-shaped phrases outside TIMING_TAGS. parseEffectLine reads both as pills.
    const card = makeCard({
      keywords: ["Piercing"],
      effect: "[Piercing] [Activate: Battle] Draw 1 card.\n[Once Per Game] If you control [Kakashi Hatake], gain [piercing].",
    });
    const svg = renderCardArtSvg(card, makePrinting(), SET);
    const keywordPill = (label: string) => new RegExp(`font-weight="700" fill="#f6efe0"[^>]*>${label}</tspan>`);
    const timingPill = (label: string) => new RegExp(`font-weight="700" fill="#fff"[^>]*>${label}</tspan>`);
    expect(svg.match(new RegExp(keywordPill("Piercing").source, "g"))).toHaveLength(2);
    expect(svg).toMatch(timingPill("Activate: Battle"));
    expect(svg).toMatch(timingPill("Once Per Game"));
    expect(svg).toMatch(/font-weight="700"[^>]*>\[Kakashi Hatake\]<\/tspan>/);
    expect(svg).not.toMatch(/\[(?:Piercing|piercing|Activate: Battle|Once Per Game)\]/);
    expectSafeSvg(svg);

    const vanilla = renderCardArtSvg(makeCard({ effect: "", keywords: ["Piercing"] }), makePrinting(), SET);
    expect(vanilla).toMatch(keywordPill("Piercing"));
    expect(vanilla).not.toContain("[Piercing]");
  });

  it("applies variant and rarity treatments", () => {
    const card = makeCard();
    const parallel = renderCardArtSvg(card, makePrinting({ variant: "parallel", rarity: "parallel-rare" }), SET);
    expect(parallel).toContain('id="holo"');
    expect(parallel).toContain("PARALLEL");

    const promo = renderCardArtSvg(card, makePrinting({ variant: "promo", rarity: "promo", setId: PROMO_SET.id, number: "P-001" }), PROMO_SET);
    expect(parseSvg(promo).text).toContain("PROMO");
    expect(parseSvg(promo).text).toContain("PROMO PACK TEST");

    const secret = renderCardArtSvg(card, makePrinting({ rarity: "secret-rare" }), SET);
    expect(secret).toContain('id="fili"');

    const superRare = renderCardArtSvg(card, makePrinting({ rarity: "super-rare" }), SET);
    expect(superRare).toContain('id="gloss"');

    const common = renderCardArtSvg(card, makePrinting({ rarity: "common" }), SET);
    expect(common).not.toContain('id="holo"');
    expect(common).not.toContain('id="gloss"');
    expect(common).not.toContain(">PROMO<");
  });

  it("handles cards without optional fields", () => {
    const minimal = makeCard({
      title: undefined,
      flavor: undefined,
      artist: undefined,
      cost: undefined,
      power: undefined,
      traits: [],
      keywords: [],
      effect: "",
    });
    const svg = renderCardArtSvg(minimal, makePrinting(), undefined);
    const { text } = expectSafeSvg(svg);
    expect(text).not.toContain("Illus.");
    expect(text).toContain("Test Ninja");
  });

  it("writes keyword reminder text for vanilla cards and centres vanilla flavor text", () => {
    const keywordOnly = parseSvg(renderCardArtSvg(makeCard({ effect: "", keywords: ["Blocker"] }), makePrinting(), SET)).text;
    expect(keywordOnly).toContain("Blocker");
    expect(keywordOnly).toContain("When your opponent attacks");

    const flavorOnly = parseSvg(renderCardArtSvg(makeCard({ effect: "", keywords: [], flavor: "Quiet as the forest." }), makePrinting(), SET)).text;
    expect(flavorOnly).toContain("Quiet as the forest.");
  });

  it("keeps the worst-case card well-formed and under 40 KB", () => {
    const svg = renderCardArtSvg(WORST_CASE, WORST_CASE.printings[0] ?? makePrinting(), SET);
    const { text } = expectSafeSvg(svg);
    expect(svg.length).toBeLessThan(40_000);
    expect(text).toContain("…"); // name, title and rules text are ellipsized
    expect(text).not.toContain("This flavor text should be dropped");
    expect(text).toMatch(/\+\d/); // keyword overflow chip
  });
});

describe("XML safety", () => {
  it("escapes all five XML special characters", () => {
    expect(escapeXml(`<script>&"'`)).toBe("&lt;script&gt;&amp;&quot;&apos;");
    expect(escapeXml("plain text")).toBe("plain text");
  });

  it("strips characters that are illegal in XML", () => {
    expect(escapeXml("a\u0000b\u0007c\u001Fd￾e")).toBe("abcde");
    expect(escapeXml("lone \uD800 surrogate")).toBe("lone  surrogate");
    expect(escapeXml("tab\tnewline\n emoji \u{1F525}")).toBe("tab\tnewline\n emoji \u{1F525}");
  });

  it("escapes every interpolated string from hostile card data", () => {
    const hostile = `<script>&"'`;
    const card = makeCard({
      id: `x"><script>alert(1)</script>`,
      name: hostile,
      title: `]]><evil attr="1">`,
      traits: ["<b>bold</b>", "A & B"],
      keywords: ["<img src=x onerror=alert(1)>"],
      effect: `[On Play] Deal {<i>} damage & [</text><script>] stuff \u0007 with control chars.`,
      flavor: `"Quotes" & 'apostrophes' <tags>`,
      artist: "Evil </text> Artist",
      printings: [makePrinting({ setId: `<set>`, number: `N<1>&` })],
    });
    for (const variant of PRINTING_VARIANTS) {
      const svg = renderCardArtSvg(card, makePrinting({ setId: `<set>`, number: `N<1>&`, variant }), {
        ...PROMO_SET,
        shortName: `<promo & "pack">`,
      });
      expect(svg).not.toMatch(/<script|<img|<b>|<i>|<evil|<\/text><script/i);
      expect(svg).toContain("&lt;script&gt;&amp;&quot;&apos;");
      expect(svg).not.toContain("\u0007");
      expectSafeSvg(svg);
    }
  });
});

describe("wrapText", () => {
  const paragraph =
    "Look at the top 5 cards of your deck; reveal up to 1 Team 7 card and add it to your hand. Then, place the rest at the bottom of your deck in any order.";

  it("never exceeds the maximum width and keeps every word", () => {
    for (const [width, size] of [
      [200, 16],
      [320, 20],
      [120, 12],
    ] as const) {
      const lines = wrapText(paragraph, width, size);
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) expect(measureText(line, size)).toBeLessThanOrEqual(width);
      expect(lines.join(" ")).toBe(paragraph);
    }
  });

  it("ellipsizes text that needs more than maxLines", () => {
    const lines = wrapText(paragraph, 200, 16, { maxLines: 2 });
    expect(lines).toHaveLength(2);
    const last = lines[1] ?? "";
    expect(last.endsWith("…")).toBe(true);
    expect(measureText(last, 16)).toBeLessThanOrEqual(200);
    expect(wrapText(paragraph, 10_000, 16, { maxLines: 1 })).toEqual([paragraph]);
  });

  it("breaks words that are longer than a whole line", () => {
    const word = "Supercalifragilisticexpialidocious".repeat(4);
    const lines = wrapText(`Before ${word} after`, 100, 14);
    expect(lines.length).toBeGreaterThan(3);
    for (const line of lines) expect(measureText(line, 14)).toBeLessThanOrEqual(100);
    expect(lines.join("").replace(/\s/g, "")).toBe(`Before${word}after`);
    // Even a single character wider than the line is placed rather than looping forever.
    expect(wrapText("WWW", 1, 40)).toEqual(["W", "W", "W"]);
  });

  it("ellipsizes a single over-long word on one line", () => {
    const [line] = wrapText("Pneumonoultramicroscopicsilicovolcanoconiosis", 80, 14, { maxLines: 1 });
    expect(line?.endsWith("…")).toBe(true);
    expect(measureText(line ?? "", 14)).toBeLessThanOrEqual(80);
  });

  it("handles empty input, extra whitespace and explicit newlines", () => {
    expect(wrapText("", 100, 14)).toEqual([]);
    expect(wrapText("   ", 100, 14)).toEqual([]);
    expect(wrapText("  spaced    out  ", 500, 14)).toEqual(["spaced out"]);
    expect(wrapText("first\nsecond", 500, 14)).toEqual(["first", "second"]);
  });

  it("measures bold text wider than regular text", () => {
    expect(measureText("Naruto Uzumaki", 20, { bold: true })).toBeGreaterThan(measureText("Naruto Uzumaki", 20));
    expect(measureText("", 20)).toBe(0);
    expect(measureText("ab", 10, { letterSpacing: 2 })).toBeCloseTo(measureText("ab", 10) + 4);
  });
});

describe("seeded randomness", () => {
  it("hashes strings deterministically", () => {
    expect(hashString("ST01-001")).toBe(hashString("ST01-001"));
    expect(hashString("ST01-001")).not.toBe(hashString("ST01-002"));
    expect(hashString("")).toBe(0x811c9dc5);
  });

  it("produces repeatable sequences within range", () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    for (let k = 0; k < 100; k++) {
      const value = a.next();
      expect(value).toBe(b.next());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    const rng = new SeededRandom(7);
    for (let k = 0; k < 100; k++) {
      const value = rng.int(2, 4);
      expect([2, 3, 4]).toContain(value);
    }
  });
});

// ---------------------------------------------------------------------------
// Generated art URLs and the /art route
// ---------------------------------------------------------------------------

/** A card reprinted in two booster sets and two promo packs: two printings per variant. */
const REPRINTED = makeCard({
  id: "TS-REPRINT",
  printings: [
    makePrinting({ setId: "ST01", number: "ST01-099", rarity: "rare" }),
    makePrinting({ setId: "NR02", number: "NR02-045", rarity: "common" }),
    makePrinting({ setId: "PR01", number: "P-007", rarity: "promo", variant: "promo" }),
    makePrinting({ setId: "PR02", number: "P-015", rarity: "promo", variant: "promo" }),
  ],
});

type ArtRouteParams = Awaited<Parameters<typeof GET>[1]["params"]>;

async function fetchArt(params: ArtRouteParams): Promise<Response> {
  return GET(new Request("http://localhost/art"), { params: Promise.resolve(params) });
}

/** Route params for a generated-art URL, exactly as the browser requests it. */
function paramsFromSrc(src: string): ArtRouteParams {
  const [, root, id = "", setId = "", number = "", variant = ""] = src.split("/");
  expect(root).toBe("art");
  return { id, setId, number, variant };
}

describe("generatedArtSrc", () => {
  it("names the whole printing, so reprints that share a variant get their own URL", () => {
    expect(REPRINTED.printings.map((printing) => generatedArtSrc(REPRINTED, printing))).toEqual([
      "/art/TS-REPRINT/ST01/ST01-099/standard",
      "/art/TS-REPRINT/NR02/NR02-045/standard",
      "/art/TS-REPRINT/PR01/P-007/promo",
      "/art/TS-REPRINT/PR02/P-015/promo",
    ]);
    expect(generatedArtSrc(REPRINTED)).toBe("/art/TS-REPRINT/ST01/ST01-099/standard");
  });

  it("encodes every path segment", () => {
    const card = makeCard({ id: "TS 01" });
    expect(generatedArtSrc(card, makePrinting({ setId: "T/S", number: "001/120 #A?" }))).toBe(
      "/art/TS%2001/T%2FS/001%2F120%20%23A%3F/standard",
    );
  });
});

describe("/art/[id]/[setId]/[number]/[variant] route", () => {
  afterEach(() => extraCards.clear());

  it("prerenders exactly one URL per printing", () => {
    const srcs = getAllCards().flatMap((card) => card.printings.map((printing) => generatedArtSrc(card, printing)));
    const params = generateStaticParams();
    expect(params).toHaveLength(srcs.length);
    expect(new Set(srcs).size).toBe(srcs.length);
    expect(params.map((p) => `/art/${[p.id, p.setId, p.number, p.variant].map((s) => encodeURIComponent(s)).join("/")}`)).toEqual(srcs);
  });

  it("serves every printing in the dataset its own face", async () => {
    for (const card of getAllCards()) {
      for (const printing of card.printings) {
        const src = generatedArtSrc(card, printing);
        const response = await fetchArt(paramsFromSrc(src));
        expect(response.status, src).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
        expect(await response.text(), src).toContain(`(${escapeXml(printing.number)})</title>`);
      }
    }
  });

  it("draws ST01-002's Promo Pack 1 printing with its promo number and stamp", async () => {
    const response = await fetchArt({ id: "ST01-002", setId: "PR01", number: "P-007", variant: "promo" });
    expect(response.status).toBe(200);
    const { text } = parseSvg(await response.text());
    expect(text).toContain("P-007");
    expect(text).toContain("PROMO PACK 1");
    expect(text).not.toContain("ST01-002");
  });

  it("keeps reprints that share a variant apart", async () => {
    extraCards.set(REPRINTED.id, REPRINTED);
    const faces = await Promise.all(
      REPRINTED.printings.map(async (printing) => {
        const response = await fetchArt(paramsFromSrc(generatedArtSrc(REPRINTED, printing)));
        expect(response.status).toBe(200);
        return parseSvg(await response.text()).text;
      }),
    );
    const [st01, nr02, pr01, pr02] = faces;
    expect(st01).toContain("ST01-099");
    expect(st01).not.toContain("NR02-045");
    expect(nr02).toContain("NR02-045");
    expect(nr02).not.toContain("ST01-099");
    expect(pr01).toContain("P-007");
    expect(pr01).toContain("PROMO PACK 1");
    expect(pr01).not.toContain("P-015");
    expect(pr02).toContain("P-015");
    expect(pr02).toContain("PROMO PACK 2");
    expect(pr02).not.toContain("P-007");
  });

  it("accepts URL-encoded params", async () => {
    extraCards.set("TS-ENC", makeCard({ id: "TS-ENC", printings: [makePrinting({ number: "001/120 #A" })] }));
    const encoded = await fetchArt(paramsFromSrc("/art/TS-ENC/TS01/001%2F120%20%23A/standard"));
    expect(encoded.status).toBe(200);
    expect(await encoded.text()).toContain("(001/120 #A)</title>");

    const decoded = await fetchArt({ id: "TS-ENC", setId: "TS01", number: "001/120 #A", variant: "standard" });
    expect(decoded.status).toBe(200);
  });

  it("returns 404 unless the set, number and variant all name one printing", async () => {
    const valid = { id: "ST01-002", setId: "PR01", number: "P-007", variant: "promo" };
    expect((await fetchArt(valid)).status).toBe(200);
    for (const params of [
      { ...valid, id: "NOPE-000" },
      { ...valid, setId: "ST01" }, // ST01 printing is ST01-002 standard
      { ...valid, number: "ST01-002" },
      { ...valid, variant: "standard" },
      { ...valid, number: "%E0%A4%A" }, // malformed escape
    ]) {
      const response = await fetchArt(params);
      expect(response.status, JSON.stringify(params)).toBe(404);
      expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    }
  });
});
