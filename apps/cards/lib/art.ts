// Procedural card-face artwork. `renderCardArtSvg` turns a card printing into
// a standalone SVG document: no scripts, web fonts or external references, so
// it renders inside a plain <img>. Output is fully deterministic: the scene is
// seeded by a hash of the card ID (alternate art uses its own seed), so the
// same data always produces byte-identical artwork.
//
// Every interpolated string goes through `escapeXml`: card data may come from
// scraped sources, and a single unescaped character would break the document.
import type { CardPrinting, CardSet, ChakraElement, NarutoCard, Rarity } from "@naruto-tcg/types";
import { KEYWORD_GLOSSARY, TIMING_TAGS } from "./keywords";
import { ELEMENT_GLYPHS, ELEMENT_META, RARITY_META, TYPE_META } from "./meta";

/** Card face size in SVG user units: 63 × 88 mm at 10 units per mm. */
export const ART_WIDTH = 630;
export const ART_HEIGHT = 880;

// ---------------------------------------------------------------------------
// XML + number formatting
// ---------------------------------------------------------------------------

const XML_ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Characters XML 1.0 forbids outright: C0 controls (except tab/LF/CR), U+FFFE/U+FFFF and lone surrogates. */
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Escape text for use in XML content or a double/single-quoted attribute. */
export function escapeXml(value: string): string {
  return value.replace(INVALID_XML_CHARS, "").replace(/[&<>"']/g, (ch) => XML_ENTITIES[ch] ?? "");
}

/** Round to one decimal for compact path data; never prints "-0". */
function n(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? "0" : String(rounded);
}

/** Integer rounding for dense decorative geometry (trees, rooftops). */
function i(value: number): string {
  const rounded = Math.round(value);
  return rounded === 0 ? "0" : String(rounded);
}

/** Three-decimal rounding for scale factors. */
function k3(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? "0" : String(rounded);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

type Rgb = readonly [number, number, number];

function parseHex(hex: string): Rgb {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const digits = match?.[1];
  if (!digits) return [128, 128, 128];
  const value = Number.parseInt(digits, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

/** Linear blend from `a` (t = 0) to `b` (t = 1). */
export function mixColor(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
}

const lighten = (color: string, t: number) => mixColor(color, "#ffffff", t);
const darken = (color: string, t: number) => mixColor(color, "#000000", t);

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** 32-bit FNV-1a hash of a string. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let k = 0; k < input.length; k++) {
    hash ^= input.charCodeAt(k);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Small, fast seeded PRNG (mulberry32). */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly [T, ...T[]]): T {
    return items[Math.floor(this.next() * items.length)] ?? items[0];
  }

  weighted<T>(entries: readonly [readonly [T, number], ...(readonly [T, number])[]]): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return entries[0][0];
  }
}

// ---------------------------------------------------------------------------
// Text measurement + wrapping (SVG text does not wrap on its own)
// ---------------------------------------------------------------------------

// Helvetica/Arial advance widths (1/1000 em) for ASCII 32..126. The font
// stacks below lead with Arial-metric faces (Helvetica, Arial, Liberation
// Sans), and every line is also pinned with textLength, so estimates hold.
const SANS_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
] as const;

const SANS_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611,
  556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389,
  280, 389, 584,
] as const;

function glyphWidth(code: number, bold: boolean): number {
  if (code >= 32 && code <= 126) return (bold ? SANS_BOLD : SANS_REGULAR)[code - 32] ?? 556;
  if (code < 32 || (code >= 0x300 && code <= 0x36f) || code === 0x200b) return 0; // controls, combining marks
  if (code === 0x2026 || code === 0x2014) return 1000; // … —
  if (code === 0x2013) return 556; // –
  if (code === 0xb7 || code === 0x2018 || code === 0x2019) return 278; // · ‘ ’
  if (code === 0x201c || code === 0x201d) return 400; // “ ”
  if (code >= 0x2e80) return 1000; // CJK, full-width forms, emoji
  return bold ? 640 : 600;
}

export interface MeasureOptions {
  bold?: boolean;
  /** Extra space added after every character, in px. */
  letterSpacing?: number;
}

/** Approximate rendered width of a single line of text, in px. */
export function measureText(text: string, fontSize: number, options: MeasureOptions = {}): number {
  let units = 0;
  let count = 0;
  for (const ch of text) {
    units += glyphWidth(ch.codePointAt(0) ?? 32, options.bold === true);
    count++;
  }
  return (units / 1000) * fontSize + (options.letterSpacing ?? 0) * count;
}

/**
 * Pin a text element to its estimated width. Our widths come from Arial
 * metrics, so on systems that substitute a wider or narrower face the glyphs
 * are scaled slightly instead of overflowing their box.
 */
function fitWidth(width: number): string {
  return width > 0.5 ? ` textLength="${n(width)}" lengthAdjust="spacingAndGlyphs"` : "";
}

/** How a run of rules text is drawn. Pills are timing tags / keywords drawn as badges. */
type RunStyle = "text" | "strong" | "italic" | "name" | "trait" | "timing" | "keyword";

interface Run {
  text: string;
  style: RunStyle;
}

/** A breakable unit: one or more runs with no whitespace between them. */
interface Word {
  runs: Run[];
}

const PILL_PAD = 0.3; // em, each side
const PILL_SCALE = 0.84; // pill label size relative to body text
const ELLIPSIS = "…";

const TIMING_LOOKUP = new Map<string, string>(TIMING_TAGS.map((tag) => [tag.toLowerCase(), tag]));
const KEYWORD_LOOKUP = new Map<string, string>(Object.keys(KEYWORD_GLOSSARY).map((kw) => [kw.toLowerCase(), kw]));

const isPill = (style: RunStyle) => style === "timing" || style === "keyword";

function runWidth(run: Run, size: number): number {
  switch (run.style) {
    case "timing":
    case "keyword":
      return measureText(run.text, size * PILL_SCALE, { bold: true }) + 2 * PILL_PAD * size;
    case "strong":
    case "name":
    case "trait":
      return measureText(run.text, size, { bold: true });
    case "italic":
    case "text":
      return measureText(run.text, size);
  }
}

const wordWidth = (word: Word, size: number) => word.runs.reduce((sum, run) => sum + runWidth(run, size), 0);

/**
 * Split text into words. In rich mode, `[Timing Tag]`, `[Keyword]`,
 * `[Card Name]` and `{Trait}` groups become single styled runs that never
 * break internally (unless they are wider than a whole line).
 */
function tokenize(text: string, baseStyle: RunStyle, rich: boolean): Word[] {
  const words: Word[] = [];
  let runs: Run[] = [];
  let buffer = "";
  const flushBuffer = () => {
    if (buffer) runs.push({ text: buffer, style: baseStyle });
    buffer = "";
  };
  const flushWord = () => {
    flushBuffer();
    if (runs.length > 0) words.push({ runs });
    runs = [];
  };

  let pos = 0;
  while (pos < text.length) {
    const ch = text.charAt(pos);
    if (/\s/.test(ch)) {
      flushWord();
      pos++;
      continue;
    }
    if (rich && (ch === "[" || ch === "{")) {
      const close = ch === "[" ? "]" : "}";
      const end = text.indexOf(close, pos + 1);
      const inner = end > pos ? text.slice(pos + 1, end).replace(/\s+/g, " ").trim() : "";
      if (inner && end - pos <= 64 && !inner.includes(ch)) {
        flushBuffer();
        if (ch === "{") {
          runs.push({ text: `{${inner}}`, style: "trait" });
        } else {
          const key = inner.toLowerCase();
          const timing = TIMING_LOOKUP.get(key);
          const keyword = KEYWORD_LOOKUP.get(key);
          if (timing) runs.push({ text: timing, style: "timing" });
          else if (keyword) runs.push({ text: keyword, style: "keyword" });
          else runs.push({ text: `[${inner}]`, style: "name" });
        }
        pos = end + 1;
        continue;
      }
    }
    buffer += ch;
    pos++;
  }
  flushWord();
  return words;
}

/** Break a word wider than `maxWidth` into pieces that each fit. */
function splitLongWord(word: Word, maxWidth: number, size: number): Word[] {
  const pieces: Word[] = [];
  let runs: Run[] = [];
  let width = 0;
  for (const run of word.runs) {
    const pad = isPill(run.style) ? 2 * PILL_PAD * size : 0;
    let text = "";
    let textWidth = pad;
    for (const ch of run.text) {
      const w = runWidth({ text: ch, style: run.style }, size) - pad;
      if (width + textWidth + w > maxWidth && (width > 0 || text !== "")) {
        if (text) runs.push({ text, style: run.style });
        pieces.push({ runs });
        runs = [];
        width = 0;
        text = "";
        textWidth = pad;
      }
      text += ch;
      textWidth += w;
    }
    if (text) {
      runs.push({ text, style: run.style });
      width += textWidth;
    }
  }
  if (runs.length > 0) pieces.push({ runs });
  return pieces;
}

function lineWidth(words: readonly Word[], size: number): number {
  if (words.length === 0) return 0;
  const space = measureText(" ", size);
  return words.reduce((sum, word) => sum + wordWidth(word, size), 0) + space * (words.length - 1);
}

/** Greedy line breaking. Returns words per line. */
function breakLines(words: readonly Word[], maxWidth: number, size: number): Word[][] {
  const space = measureText(" ", size);
  const lines: Word[][] = [];
  let line: Word[] = [];
  let width = 0;
  for (const original of words) {
    const pieces = wordWidth(original, size) > maxWidth ? splitLongWord(original, maxWidth, size) : [original];
    for (const word of pieces) {
      const w = wordWidth(word, size);
      if (line.length > 0 && width + space + w > maxWidth) {
        lines.push(line);
        line = [];
        width = 0;
      }
      width += (line.length > 0 ? space : 0) + w;
      line.push(word);
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

/** Trim a line until it fits with a trailing ellipsis, then append one. */
function ellipsizeLine(line: readonly Word[], maxWidth: number, size: number, style: RunStyle): Word[] {
  const words = line.map((word) => ({ runs: word.runs.map((run) => ({ ...run })) }));
  const ellipsisWidth = measureText(ELLIPSIS, size, { bold: style === "strong" });
  while (words.length > 0 && lineWidth(words, size) + ellipsisWidth > maxWidth) {
    const last = words[words.length - 1];
    if (!last) break;
    if (words.length > 1) {
      words.pop();
      continue;
    }
    const run = last.runs[last.runs.length - 1];
    if (!run) {
      words.pop();
      continue;
    }
    run.text = Array.from(run.text).slice(0, -1).join("");
    if (!run.text) last.runs.pop();
    if (last.runs.length === 0) words.pop();
  }
  const tail = words[words.length - 1];
  const tailRun = tail?.runs[tail.runs.length - 1];
  if (tailRun && !isPill(tailRun.style)) tailRun.text = tailRun.text.replace(/[\s,;:.—-]+$/u, "");
  if (tail) tail.runs.push({ text: ELLIPSIS, style });
  else words.push({ runs: [{ text: ELLIPSIS, style }] });
  return words;
}

/** Lay out paragraphs (split on newlines) into lines, ellipsizing past `maxLines`. */
function layoutParagraphs(
  text: string,
  maxWidth: number,
  size: number,
  options: { style?: RunStyle; rich?: boolean; maxLines?: number } = {},
): { lines: Word[][]; truncated: boolean } {
  const style = options.style ?? "text";
  const lines = text
    .split(/\n+/)
    .flatMap((paragraph) => breakLines(tokenize(paragraph, style, options.rich === true), maxWidth, size));
  const maxLines = options.maxLines ?? Number.POSITIVE_INFINITY;
  if (lines.length <= maxLines) return { lines, truncated: false };
  const kept = lines.slice(0, Math.max(0, maxLines));
  const last = kept.pop();
  if (last) kept.push(ellipsizeLine(last, maxWidth, size, style));
  return { lines: kept, truncated: true };
}

export interface WrapOptions {
  bold?: boolean;
  /** Ellipsize the last line when the text needs more lines than this. */
  maxLines?: number;
}

/**
 * Word-wrap plain text to `maxWidth` px at `fontSize` using approximate glyph
 * widths. Words longer than a line are broken across lines; text past
 * `maxLines` is cut and the last kept line ends with an ellipsis.
 */
export function wrapText(text: string, maxWidth: number, fontSize: number, options: WrapOptions = {}): string[] {
  const style: RunStyle = options.bold ? "strong" : "text";
  const { lines } = layoutParagraphs(text, maxWidth, fontSize, { style, maxLines: options.maxLines });
  return lines.map((line) => line.map((word) => word.runs.map((run) => run.text).join("")).join(" "));
}

/** Largest font size in [min, max] at which `text` fits on one line, else min size ellipsized. */
function fitLine(
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  bold: boolean,
): { text: string; size: number; width: number } {
  for (let size = maxSize; size >= minSize; size -= 1) {
    const width = measureText(text, size, { bold });
    if (width <= maxWidth) return { text, size, width };
  }
  const fitted = wrapText(text, maxWidth, minSize, { bold, maxLines: 1 })[0] ?? "";
  return { text: fitted, size: minSize, width: Math.min(maxWidth, measureText(fitted, minSize, { bold })) };
}

/** Position the runs of one line, merging adjacent plain runs into one span. */
interface PlacedRun extends Run {
  x: number;
  width: number;
}

function placeLine(words: readonly Word[], size: number): PlacedRun[] {
  const space = measureText(" ", size);
  const placed: PlacedRun[] = [];
  let x = 0;
  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) x += space;
    word.runs.forEach((run, runIndex) => {
      const width = runWidth(run, size);
      const prev = placed[placed.length - 1];
      if (prev && prev.style === run.style && !isPill(run.style)) {
        prev.text += `${runIndex === 0 ? " " : ""}${run.text}`;
        prev.width = x + width - prev.x;
      } else {
        placed.push({ ...run, x, width });
      }
      x += width;
    });
  });
  return placed;
}

// ---------------------------------------------------------------------------
// Card layout
// ---------------------------------------------------------------------------

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PANEL: Box = { x: 22, y: 22, w: 586, h: 836 };
const BANNER: Box = { x: 30, y: 30, w: 570, h: 72 };
const ART: Box = { x: 32, y: 108, w: 566, h: 390 };
const TYPE_LINE: Box = { x: 32, y: 504, w: 566, h: 36 };
const TEXT_BOX: Box = { x: 38, y: 546, w: 554, h: 246 };
const POWER_PLATE: Box = { x: 444, y: 800, w: 154, h: 50 };
const ORB = { cx: 74, cy: 74, r: 46 };
const SIGIL = { cx: 566, cy: 66, r: 23 };

const SANS = "Helvetica,Arial,'Liberation Sans','Nimbus Sans','Helvetica Neue','Segoe UI',sans-serif";
const SERIF = "Georgia,'Times New Roman','Liberation Serif',serif";
const CJK =
  "'Hiragino Mincho ProN','Yu Mincho','Noto Serif CJK JP','Source Han Serif JP','MS Mincho','Noto Sans CJK JP','IPAGothic','WenQuanYi Zen Hei',serif";

/** Serif italic advance relative to the sans estimates (between Times and Georgia). */
const SERIF_FACTOR = 0.92;

/** Element glyph (24-unit icon) centered at (cx, cy) with the given size. */
function glyph(element: ChakraElement, cx: number, cy: number, size: number, color: string, opacity = 1): string {
  const icon = ELEMENT_GLYPHS[element];
  const s = size / 24;
  const paint = icon.stroke
    ? `fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"`
    : `fill="${color}"`;
  return `<path transform="translate(${n(cx - 12 * s)} ${n(cy - 12 * s)}) scale(${k3(s)})" d="${icon.d}" ${paint}${opacity < 1 ? ` opacity="${n(opacity)}"` : ""}/>`;
}

const RARITY_COLOR: Record<Rarity, string> = {
  common: "#a6a6ba",
  uncommon: "#34d399",
  rare: "#5cc8ff",
  "super-rare": "#b794ff",
  "parallel-rare": "#f0abfc",
  "secret-rare": "#f5d06b",
  promo: "#ff8a2a",
};

const TIMING_COLORS: Readonly<Record<string, string>> = {
  "on play": "#1f6fb5",
  "when attacking": "#7a3db8",
  "on block": "#23795a",
  "on k.o.": "#3d3d4f",
  "activate: main": "#c2560f",
  main: "#c2560f",
  counter: "#b3122e",
  trigger: "#a07c08",
  "once per turn": "#a8306b",
  "your turn": "#2a5d8a",
  "opponent's turn": "#6a2c4d",
  "end of your turn": "#46546a",
};

type FrameStyle = "element" | "gold" | "rainbow";

interface Treatment {
  frame: FrameStyle;
  /** Illustration fills the whole card behind translucent panels. */
  fullArt: boolean;
  /** Whole-card gloss highlight (super/secret rares). */
  gloss: boolean;
  /** Iridescent foil lines over the artwork. */
  holo: boolean;
  /** Soft glare across the art window (any foil). */
  glare: boolean;
  promo: boolean;
  alt: boolean;
}

function treatmentFor(printing: CardPrinting): Treatment {
  const { rarity, variant } = printing;
  return {
    frame: rarity === "secret-rare" ? "gold" : variant === "parallel" || rarity === "parallel-rare" ? "rainbow" : "element",
    fullArt: variant === "parallel",
    gloss: rarity === "super-rare" || rarity === "secret-rare",
    holo: variant === "parallel" || rarity === "parallel-rare",
    glare: RARITY_META[rarity].foil !== "none",
    promo: variant === "promo" || rarity === "promo",
    alt: variant === "alt-art",
  };
}

/** Collects <defs> entries so components can declare gradients next to their use. */
class Defs {
  private readonly items: string[] = [];
  add(markup: string): void {
    this.items.push(markup);
  }
  linear(id: string, stops: readonly (readonly [number, string, number?])[], dir: [number, number, number, number] = [0, 0, 0, 1], extra = ""): string {
    this.items.push(
      `<linearGradient id="${id}" x1="${n(dir[0])}" y1="${n(dir[1])}" x2="${n(dir[2])}" y2="${n(dir[3])}"${extra}>${stopMarkup(stops)}</linearGradient>`,
    );
    return `url(#${id})`;
  }
  radial(id: string, stops: readonly (readonly [number, string, number?])[], extra = ""): string {
    this.items.push(`<radialGradient id="${id}"${extra}>${stopMarkup(stops)}</radialGradient>`);
    return `url(#${id})`;
  }
  toString(): string {
    return `<defs>${this.items.join("")}</defs>`;
  }
}

function stopMarkup(stops: readonly (readonly [number, string, number?])[]): string {
  return stops
    .map(([offset, color, opacity]) => `<stop offset="${n(offset)}" stop-color="${color}"${opacity === undefined ? "" : ` stop-opacity="${n(opacity)}"`}/>`)
    .join("");
}

const rect = (b: Box, rx: number, attrs: string) =>
  `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}"${rx ? ` rx="${n(rx)}"` : ""} ${attrs}/>`;

// ---------------------------------------------------------------------------
// Illustration
// ---------------------------------------------------------------------------

type Mood = "dawn" | "day" | "dusk" | "night" | "storm" | "ukiyo";
type SceneKind = "peaks" | "village" | "lake" | "cliffs" | "forest";

interface MoodBase {
  sky: readonly [string, string, string];
  sun: string;
  haze: string;
  dark: string;
}

const MOODS: Record<Mood, MoodBase> = {
  dawn: { sky: ["#1b1d4a", "#8f4f86", "#ffb68c"], sun: "#fff1d2", haze: "#b67a8f", dark: "#130d24" },
  day: { sky: ["#1a4b88", "#5b9bd3", "#d8edf4"], sun: "#fffbe8", haze: "#7ea3c0", dark: "#0d1925" },
  dusk: { sky: ["#170f36", "#8f2f54", "#ff9b52"], sun: "#ffd57d", haze: "#8a4259", dark: "#0f0816" },
  night: { sky: ["#03050e", "#0c1631", "#26385f"], sun: "#f5f2df", haze: "#28375b", dark: "#02040a" },
  storm: { sky: ["#090c14", "#212839", "#4a5367"], sun: "#d5ddeb", haze: "#353d51", dark: "#05070b" },
  ukiyo: { sky: ["#efe2c2", "#ead7ad", "#e2c48f"], sun: "#cf3a2c", haze: "#88a9ab", dark: "#13233a" },
};

const MOOD_WEIGHTS: Record<ChakraElement, readonly [readonly [Mood, number], ...(readonly [Mood, number])[]]> = {
  fire: [["dusk", 4], ["night", 3], ["dawn", 2], ["day", 1]],
  water: [["day", 3], ["night", 3], ["dawn", 2], ["storm", 1]],
  lightning: [["storm", 4], ["night", 3], ["dusk", 2], ["day", 1]],
  earth: [["dawn", 3], ["day", 3], ["dusk", 2], ["night", 1]],
  wind: [["day", 4], ["dawn", 3], ["dusk", 2], ["night", 1]],
};

const SCENE_WEIGHTS: Record<ChakraElement, readonly [readonly [SceneKind, number], ...(readonly [SceneKind, number])[]]> = {
  fire: [["village", 3], ["peaks", 2], ["forest", 2], ["cliffs", 1]],
  water: [["lake", 4], ["cliffs", 2], ["peaks", 1], ["village", 1]],
  lightning: [["peaks", 3], ["cliffs", 2], ["village", 2], ["forest", 1]],
  earth: [["peaks", 3], ["cliffs", 3], ["village", 1], ["forest", 1]],
  wind: [["forest", 3], ["peaks", 2], ["village", 2], ["lake", 1]],
};

interface Palette {
  mood: Mood;
  sky: readonly [string, string, string];
  sun: string;
  haze: string;
  far: string;
  mid: string;
  near: string;
  ground: string;
  rim: string;
  cloud: string;
  cloudOpacity: number;
  lit: boolean;
}

function buildPalette(mood: Mood, hex: string): Palette {
  const base = MOODS[mood];
  const ukiyo = mood === "ukiyo";
  const tint = (color: string, t: number) => (ukiyo ? color : mixColor(color, hex, t));
  const sky = [tint(base.sky[0], 0.16), tint(base.sky[1], 0.22), tint(base.sky[2], 0.14)] as const;
  const haze = tint(base.haze, 0.2);
  const dark = tint(base.dark, 0.08);
  return {
    mood,
    sky,
    sun: base.sun,
    haze,
    far: ukiyo ? "#9fb7b2" : mixColor(haze, sky[2], 0.35),
    mid: ukiyo ? "#40698a" : mixColor(haze, dark, 0.45),
    near: ukiyo ? "#21405f" : mixColor(haze, dark, 0.74),
    ground: ukiyo ? "#14243a" : dark,
    rim: ukiyo ? "#f4e7c8" : lighten(hex, 0.35),
    cloud:
      mood === "storm"
        ? "#141924"
        : mood === "night"
          ? "#1c2747"
          : ukiyo
            ? "#f8f1dd"
            : mood === "day"
              ? "#ffffff"
              : mixColor(sky[2], "#ffffff", 0.35),
    cloudOpacity: mood === "storm" ? 0.85 : mood === "day" ? 0.7 : ukiyo ? 0.95 : 0.45,
    lit: mood === "night" || mood === "dusk" || mood === "storm",
  };
}

/** Midpoint-displacement ridge, normalized to 0..1. `segments` must be a power of two. */
function ridge(rng: SeededRandom, segments: number, roughness: number): number[] {
  const values = new Array<number>(segments + 1).fill(0);
  values[0] = rng.next();
  values[segments] = rng.next();
  let step = segments;
  let amplitude = 1;
  while (step > 1) {
    const half = step >> 1;
    for (let k = half; k < segments; k += step) {
      values[k] = ((values[k - half] ?? 0) + (values[k + half] ?? 0)) / 2 + (rng.next() * 2 - 1) * amplitude;
    }
    amplitude *= roughness;
    step = half;
  }
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return values.map((v) => (v - min) / span);
}

interface RidgeShape {
  d: string;
  /** Surface y at a given x. */
  yAt(x: number): number;
}

function ridgeShape(values: readonly number[], x0: number, x1: number, base: number, amp: number, bottom: number, exponent = 1.25): RidgeShape {
  const count = values.length - 1;
  const ys = values.map((v) => base - amp * Math.pow(v, exponent));
  const points = ys.map((y, k) => `${n(x0 + ((x1 - x0) * k) / count)},${n(y)}`);
  return {
    d: `M${n(x0)},${n(bottom)}L${points.join(" ")}L${n(x1)},${n(bottom)}Z`,
    yAt(x) {
      const t = clamp(((x - x0) / (x1 - x0)) * count, 0, count);
      const k = Math.floor(t);
      const a = ys[k] ?? base;
      const b = ys[Math.min(count, k + 1)] ?? a;
      return a + (b - a) * (t - k);
    },
  };
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)},${n(cy)}a${n(r)},${n(r)} 0 1,0 ${n(2 * r)},0a${n(r)},${n(r)} 0 1,0 ${n(-2 * r)},0Z`;
}

function pine(x: number, base: number, h: number): string {
  const w = h * 0.46;
  return (
    `M${i(x)},${i(base - h)}L${i(x + w * 0.26)},${i(base - h * 0.6)}H${i(x + w * 0.12)}L${i(x + w * 0.4)},${i(base - h * 0.3)}` +
    `H${i(x + w * 0.2)}L${i(x + w * 0.5)},${i(base - h * 0.05)}H${i(x + w * 0.06)}V${i(base)}H${i(x - w * 0.06)}` +
    `V${i(base - h * 0.05)}H${i(x - w * 0.5)}L${i(x - w * 0.2)},${i(base - h * 0.3)}H${i(x - w * 0.4)}L${i(x - w * 0.12)},${i(base - h * 0.6)}H${i(x - w * 0.26)}Z`
  );
}

/** A house with a curved, upswept roof. Returns [silhouette, window rects]. */
function house(x: number, base: number, w: number, h: number, roof: number): string {
  const e = w * 0.2;
  const top = base - h;
  return (
    `M${i(x - w / 2)},${i(base)}V${i(top)}H${i(x + w / 2)}V${i(base)}Z` +
    `M${i(x - w / 2 - e)},${i(top + 2)}Q${i(x - w / 2)},${i(top - roof * 0.12)} ${i(x - w * 0.24)},${i(top - roof * 0.72)}` +
    `L${i(x)},${i(top - roof)}L${i(x + w * 0.24)},${i(top - roof * 0.72)}Q${i(x + w / 2)},${i(top - roof * 0.12)} ${i(x + w / 2 + e)},${i(top + 2)}Z`
  );
}

// Figure silhouettes authored in a 100-unit-tall box, origin at the feet,
// facing right: filled shapes (torso, head, hair spikes, headband tails,
// kunai) plus limbs drawn as thick round-capped strokes.
interface PoseShape {
  fill: string;
  legs: string;
  legWidth: number;
  arms: string;
  armWidth: number;
}

const HEAD = "a7.5,7.5 0 1,0 -15,0a7.5,7.5 0 1,0 15,0Z";

const POSES = {
  stand: {
    fill:
      `M-3,-82L-10,-79L-10,-68L-7,-52L7,-52L10,-68L10,-79L3,-82ZM8.5,-89${HEAD}` +
      "M-8,-91L-13,-98L-5,-95L-6,-103L-1,-97L2,-105L4,-97L10,-102L8,-94L13,-96L8,-88Z" +
      "M-6,-91C-14,-93 -21,-87 -33,-92L-31,-88C-20,-84 -13,-89 -6,-88ZM-6,-89C-13,-88 -19,-81 -29,-82L-27,-79C-17,-78 -12,-85 -6,-86Z" +
      "M25,-73L38,-81L39,-79L28,-70Z",
    legs: "M-4,-52L-9,-28L-13,-4L-19,-3M4,-52L10,-28L13,-4L20,-3",
    legWidth: 8.5,
    arms: "M-9,-77L-14,-63L-12,-50M9,-77L18,-67L26,-71",
    armWidth: 6,
  },
  ready: {
    fill:
      `M0,-78L-7,-76L-9,-64L-6,-48L8,-48L10,-62L9,-75L4,-78ZM10,-85${HEAD}` +
      "M-4,-87L-10,-93L-2,-91L-3,-99L2,-93L5,-101L7,-93L13,-97L11,-90L16,-91L11,-84Z" +
      "M-4,-87C-13,-88 -20,-80 -34,-84L-32,-80C-19,-76 -12,-83 -4,-84Z" +
      "M26,-58L40,-53L39,-51L25,-54Z",
    legs: "M-3,-49L-14,-30L-22,-6L-28,-4M5,-49L16,-32L18,-5L25,-4",
    legWidth: 8.5,
    arms: "M-6,-74L-16,-62L-24,-66M8,-73L17,-58L27,-56",
    armWidth: 6,
  },
  crouch: {
    fill:
      `M0,-49L12,-45L7,-28L-10,-23L-13,-31ZM21,-52${HEAD}` +
      "M7,-54L1,-60L9,-58L8,-66L13,-60L16,-68L18,-60L24,-64L22,-56L27,-57L21,-49Z" +
      "M7,-54C-2,-56 -10,-49 -23,-53L-21,-49C-9,-45 -2,-50 7,-51Z" +
      "M-17,-47L-31,-51L-31,-49L-18,-43Z",
    legs: "M-9,-27L-6,-5L-26,-4M-4,-27L12,-25L14,-5L21,-4",
    legWidth: 9,
    arms: "M9,-44L19,-30L25,-5M2,-46L-8,-39L-18,-45",
    armWidth: 6.5,
  },
  leader: {
    fill:
      "M-4,-83L-13,-80L-16,-70L-18,-50C-20,-36 -28,-20 -44,-8L-35,-9L-39,-1L-27,-6L-14,-6L14,-6L20,-8C17,-24 16,-38 17,-50L15,-70L13,-80L4,-83Z" +
      `M7.5,-90${HEAD}M-8,-92L-14,-99L-5,-96L-7,-104L-1,-98L1,-106L4,-98L10,-104L8,-95L14,-97L8,-89Z` +
      "M-6,-92C-15,-94 -23,-87 -36,-93L-34,-89C-22,-84 -14,-89 -6,-89Z",
    legs: "M-6,-12L-7,-3M6,-12L7,-3",
    legWidth: 8,
    arms: "M-13,-77L-19,-60L-18,-45M13,-77L19,-60L17,-45",
    armWidth: 7.5,
  },
} as const satisfies Record<string, PoseShape>;

type Pose = keyof typeof POSES;

interface SceneContext {
  rng: SeededRandom;
  element: ChakraElement;
  hex: string;
  palette: Palette;
  defs: Defs;
  card: NarutoCard;
}

/**
 * A silhouetted figure, defined once and drawn twice: a rim-light copy nudged
 * towards the light source, then the dark silhouette on top.
 */
function figure(ctx: SceneContext, pose: Pose, x: number, feet: number, height: number, facing: 1 | -1, sunX: number): string {
  const shape: PoseShape = POSES[pose];
  const s = height / 100;
  ctx.defs.add(
    `<g id="fig"><path d="${shape.fill}" stroke="none"/>` +
      `<path d="${shape.legs}" fill="none" stroke-width="${shape.legWidth}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${shape.arms}" fill="none" stroke-width="${shape.armWidth}" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  );
  const transform = (dx: number) => `translate(${n(x + dx)} ${n(feet)}) scale(${k3(facing * s)} ${k3(s)})`;
  const rimOffset = (sunX >= x ? 1 : -1) * Math.max(1.5, height * 0.012);
  const silhouette = darken(ctx.palette.ground, 0.25);
  return (
    `<use href="#fig" transform="${transform(rimOffset)}" fill="${ctx.palette.rim}" stroke="${ctx.palette.rim}" opacity=".75"/>` +
    `<use href="#fig" transform="${transform(0)}" fill="${silhouette}" stroke="${silhouette}"/>`
  );
}

/** Rocky outcrop with a flat top centred on x, top surface at `top`. */
function outcrop(rng: SeededRandom, x: number, top: number, width: number, bottom: number): string {
  const half = width / 2;
  const pts: string[] = [`${n(x - half * 1.6)},${n(bottom)}`];
  const steps = 5;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    pts.push(`${n(x - half * (1.5 - t * 0.6) + rng.range(-4, 4))},${n(top + (1 - t) * (bottom - top) * 0.75 + rng.range(-4, 4))}`);
  }
  pts.push(`${n(x - half * 0.75)},${n(top)}`, `${n(x + half * 0.75)},${n(top)}`);
  for (let k = steps; k >= 0; k--) {
    const t = k / steps;
    pts.push(`${n(x + half * (1.5 - t * 0.6) + rng.range(-4, 4))},${n(top + (1 - t) * (bottom - top) * 0.75 + rng.range(-4, 4))}`);
  }
  pts.push(`${n(x + half * 1.6)},${n(bottom)}`);
  return `M${pts.join("L")}Z`;
}

function bolt(rng: SeededRandom, x0: number, y0: number, x1: number, y1: number, segments: number, jitter: number): string {
  const pts: string[] = [`${n(x0)},${n(y0)}`];
  for (let k = 1; k < segments; k++) {
    const t = k / segments;
    pts.push(`${n(x0 + (x1 - x0) * t + rng.range(-jitter, jitter))},${n(y0 + (y1 - y0) * t + rng.range(-jitter, jitter) * 0.4)}`);
  }
  pts.push(`${n(x1)},${n(y1)}`);
  return `M${pts.join("L")}`;
}

function glowStroke(d: string, color: string, width: number): string {
  return (
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width * 4)}" stroke-opacity=".14" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width * 2)}" stroke-opacity=".38" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function spiral(cx: number, cy: number, radius: number, turns: number, start: number): string {
  const pts: string[] = [];
  const total = turns * Math.PI * 2;
  for (let a = 0; a <= total; a += 0.32) {
    const r = (radius * a) / total;
    pts.push(`${n(cx + Math.cos(a + start) * r)},${n(cy + Math.sin(a + start) * r * 0.82)}`);
  }
  return `M${pts.join("L")}`;
}

function flame(x: number, base: number, w: number, h: number, lean: number): string {
  return (
    `M${n(x - w / 2)},${n(base)}C${n(x - w / 2)},${n(base - h * 0.45)} ${n(x + lean - w * 0.25)},${n(base - h * 0.55)} ${n(x + lean)},${n(base - h)}` +
    `C${n(x + lean + w * 0.12)},${n(base - h * 0.5)} ${n(x + w / 2)},${n(base - h * 0.4)} ${n(x + w / 2)},${n(base)}Z`
  );
}

function boulder(rng: SeededRandom, cx: number, cy: number, r: number, fill: string, light: string): string {
  const count = rng.int(6, 8);
  const pts: [number, number][] = [];
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const rr = r * rng.range(0.72, 1.08);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82]);
  }
  const outline = `M${pts.map(([x, y]) => `${n(x)},${n(y)}`).join("L")}Z`;
  // Lit facet: the upper-left part of the rock towards the centre.
  const facet = pts.filter(([, y]) => y < cy).map(([x, y]) => `${n(x)},${n(y)}`);
  const face = facet.length >= 2 ? `<path d="M${n(cx - r * 0.1)},${n(cy + r * 0.05)}L${facet.join("L")}Z" fill="${light}" opacity=".55"/>` : "";
  return `<path d="${outline}" fill="${fill}"/>${face}`;
}

/** Waves band: layered crests with foam lines. */
function waves(rng: SeededRandom, box: Box, top: number, bottom: number, color: string, foam: string): string {
  let out = "";
  const rows = 3;
  for (let row = 0; row < rows; row++) {
    const y = top + ((bottom - top) * row) / rows;
    const amp = 6 + row * 4;
    const len = 46 + row * 22;
    const phase = rng.range(0, len);
    const pts: string[] = [];
    for (let x = box.x - len; x <= box.x + box.w + len; x += len / 4) {
      const k = Math.round((x - box.x + phase) / (len / 4));
      const yy = y + (k % 2 === 0 ? -amp : amp * 0.4);
      pts.push(`${n(x)},${n(yy)}`);
    }
    const crest = `M${pts.join("L")}`;
    out +=
      `<path d="${crest}L${n(box.x + box.w + len)},${n(bottom + 40)}L${n(box.x - len)},${n(bottom + 40)}Z" fill="${mixColor(color, "#000000", row * 0.12)}"/>` +
      `<path d="${crest}" fill="none" stroke="${foam}" stroke-width="${n(1.6 + row * 0.8)}" stroke-opacity="${n(0.55 + row * 0.1)}" stroke-linejoin="round"/>`;
  }
  return out;
}

const LEAF = "M0,-6C4,-3 4,3 0,6C-4,3 -4,-3 0,-6Z";

/**
 * Draw the illustration into `box` (already clipped by the caller). `focus` is
 * the region where the landscape and subject should read clearly; for
 * full-art printings it is smaller than the box, which extends behind panels.
 */
function renderIllustration(ctx: SceneContext, box: Box, focus: Box, fullArt: boolean): string {
  const { rng, palette: pal, hex, element, defs, card } = ctx;
  const out: string[] = [];
  const scale = focus.h / ART.h;
  const ukiyo = pal.mood === "ukiyo";
  const scene = rng.weighted(SCENE_WEIGHTS[element]);
  const bottom = box.y + box.h;

  // Sky.
  out.push(rect(box, 0, `fill="${defs.linear("sky", [[0, pal.sky[0]], [0.58, pal.sky[1]], [1, pal.sky[2]]], [0, box.y, 0, focus.y + focus.h * 0.75], ' gradientUnits="userSpaceOnUse"')}"`));

  // Subject placement decides where the sun goes (leaders are backlit).
  const subjectX =
    card.type === "leader"
      ? focus.x + focus.w * rng.range(0.4, 0.6)
      : card.type === "character"
        ? focus.x + focus.w * (rng.chance(0.5) ? rng.range(0.24, 0.34) : rng.range(0.66, 0.76))
        : focus.x + focus.w * rng.range(0.42, 0.58);
  const sunX = card.type === "leader" ? subjectX + rng.range(-30, 30) : focus.x + focus.w * rng.range(0.15, 0.85);
  const sunY = focus.y + focus.h * (card.type === "leader" ? rng.range(0.24, 0.32) : rng.range(0.14, 0.34));
  const sunR = focus.h * (ukiyo ? rng.range(0.15, 0.19) : rng.range(0.07, 0.1));

  // Stars.
  if (pal.mood === "night") {
    let stars = "";
    const count = Math.round(34 * (box.w * box.h) / (ART.w * ART.h));
    for (let k = 0; k < count; k++) {
      stars += circlePath(rng.range(box.x, box.x + box.w), rng.range(box.y, focus.y + focus.h * 0.55), rng.range(0.6, 1.7));
    }
    out.push(`<path d="${stars}" fill="#fff" opacity=".75"/>`);
  }

  // Sun or moon with a soft halo.
  const glow = defs.radial("sunglow", [[0, pal.sun, ukiyo ? 0 : 0.85], [0.22, pal.sun, ukiyo ? 0 : 0.32], [1, pal.sun, 0]]);
  out.push(`<circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(sunR * 5.5)}" fill="${glow}"${pal.mood === "storm" ? ' opacity=".45"' : ""}/>`);
  if (pal.mood === "night") {
    defs.add(
      `<mask id="moon"><circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(sunR)}" fill="#fff"/><circle cx="${n(sunX + sunR * 0.45)}" cy="${n(sunY - sunR * 0.25)}" r="${n(sunR * 0.9)}" fill="#000"/></mask>`,
    );
    out.push(`<circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(sunR)}" fill="${pal.sun}" mask="url(#moon)"/>`);
  } else if (pal.mood !== "storm") {
    out.push(`<circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(sunR)}" fill="${pal.sun}"${ukiyo ? "" : ' opacity=".95"'}/>`);
  }

  // Element kanji watermark inside a seal ring (the ring alone still reads
  // as a motif when no CJK font is installed).
  const sealX = sunX > focus.x + focus.w / 2 ? focus.x + focus.w * 0.27 : focus.x + focus.w * 0.73;
  const sealY = focus.y + focus.h * 0.36;
  const sealR = focus.h * 0.27;
  const sealColor = ukiyo ? "#7a2b22" : "#ffffff";
  let ticks = "";
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    ticks += `M${n(sealX + Math.cos(a) * sealR * 0.86)},${n(sealY + Math.sin(a) * sealR * 0.86)}L${n(sealX + Math.cos(a) * sealR * 0.93)},${n(sealY + Math.sin(a) * sealR * 0.93)}`;
  }
  out.push(
    `<g opacity="${ukiyo ? ".16" : ".13"}" fill="none" stroke="${sealColor}"><circle cx="${n(sealX)}" cy="${n(sealY)}" r="${n(sealR)}" stroke-width="3"/>` +
      `<circle cx="${n(sealX)}" cy="${n(sealY)}" r="${n(sealR * 0.8)}" stroke-width="1.5" stroke-dasharray="2 6"/><path d="${ticks}" stroke-width="2"/></g>`,
    `<text x="${n(sealX)}" y="${n(sealY + sealR * 0.36)}" font-family="${CJK}" font-size="${n(sealR * 1.05)}" text-anchor="middle" fill="${sealColor}" fill-opacity="${ukiyo ? ".2" : ".14"}">${escapeXml(ELEMENT_META[element].kanji)}</text>`,
  );

  // Clouds.
  const cloudCount = pal.mood === "storm" ? 5 : rng.int(2, 4);
  let clouds = "";
  for (let k = 0; k < cloudCount; k++) {
    const cx = rng.range(box.x, box.x + box.w);
    const cy = pal.mood === "storm" ? rng.range(box.y, focus.y + focus.h * 0.18) : rng.range(focus.y + focus.h * 0.08, focus.y + focus.h * 0.45);
    const cw = rng.range(90, 190) * scale * (pal.mood === "storm" ? 1.6 : 1);
    const ch = cw * rng.range(0.18, 0.26);
    clouds += `M${n(cx - cw / 2)},${n(cy)}H${n(cx + cw / 2)}a${n(ch / 2)},${n(ch / 2)} 0 0,0 ${n(-ch * 0.7)},${n(-ch / 2)}H${n(cx - cw / 2 + ch * 0.7)}a${n(ch / 2)},${n(ch / 2)} 0 0,0 ${n(-ch * 0.7)},${n(ch / 2)}Z`;
    const puffs = rng.int(2, 4);
    for (let p = 0; p < puffs; p++) {
      const px = cx - cw * 0.3 + (cw * 0.6 * p) / Math.max(1, puffs - 1);
      clouds += circlePath(px, cy - ch * rng.range(0.35, 0.7), ch * rng.range(0.5, 0.85));
    }
  }
  out.push(
    `<path d="${clouds}" fill="${pal.cloud}" opacity="${n(pal.cloudOpacity)}"${ukiyo ? ' stroke="#b98d55" stroke-width="2"' : ""}/>`,
  );

  // Background lightning strikes behind the mountains.
  if (element === "lightning" || (pal.mood === "storm" && rng.chance(0.5))) {
    const strikes = element === "lightning" ? rng.int(1, 2) : 1;
    for (let k = 0; k < strikes; k++) {
      const x0 = rng.range(box.x + 40, box.x + box.w - 40);
      out.push(glowStroke(bolt(rng, x0, box.y, x0 + rng.range(-60, 60), focus.y + focus.h * 0.62, 9, 26 * scale), ukiyo ? "#d8a531" : hex, 2.2));
    }
  }

  // Far and mid mountains with mist between them.
  const horizon = focus.y + focus.h * (scene === "lake" ? 0.6 : 0.62);
  const farAmp = focus.h * (scene === "peaks" ? rng.range(0.32, 0.42) : rng.range(0.16, 0.28));
  const far = ridgeShape(ridge(rng, 64, 0.55), box.x - 4, box.x + box.w + 4, horizon, farAmp, bottom, 1.35);
  out.push(`<path d="${far.d}" fill="${defs.linear("far", [[0, lighten(pal.far, ukiyo ? 0 : 0.12)], [1, pal.far]], [0, horizon - farAmp, 0, horizon], ' gradientUnits="userSpaceOnUse"')}"/>`);
  out.push(rect({ x: box.x, y: horizon - 28 * scale, w: box.w, h: 60 * scale }, 0, `fill="${defs.linear("mist", [[0, pal.haze, 0], [0.5, lighten(pal.haze, 0.2), 0.55], [1, pal.haze, 0]])}"`));

  const midBase = focus.y + focus.h * 0.76;
  const midAmp = focus.h * rng.range(0.1, 0.18);
  const mid = ridgeShape(ridge(rng, 32, 0.5), box.x - 4, box.x + box.w + 4, midBase, midAmp, bottom, 1.1);
  out.push(`<path d="${mid.d}" fill="${defs.linear("mid", [[0, mixColor(pal.mid, pal.haze, 0.25)], [1, pal.mid]], [0, midBase - midAmp, 0, midBase], ' gradientUnits="userSpaceOnUse"')}"/>`);

  // Scene-specific near layer.
  const nearBase = focus.y + focus.h * 0.87;
  if (scene === "lake") {
    const water = focus.y + focus.h * 0.74;
    const waterFill = defs.linear("lake", [[0, mixColor(pal.sky[2], pal.haze, 0.3)], [1, darken(pal.sky[1], 0.45)]], [0, water, 0, bottom], ' gradientUnits="userSpaceOnUse"');
    out.push(rect({ x: box.x, y: water, w: box.w, h: bottom - water }, 0, `fill="${waterFill}"`));
    let shimmer = "";
    for (let k = 0; k < 9; k++) {
      const y = water + 6 + k * 7 * scale;
      const w = rng.range(18, 60) * (1 - k / 12);
      shimmer += `M${n(sunX - w / 2 + rng.range(-8, 8))},${n(y)}h${n(w)}`;
    }
    out.push(`<path d="${shimmer}" stroke="${pal.sun}" stroke-width="2" stroke-linecap="round" opacity=".55"/>`);
    let ripples = "";
    for (let k = 0; k < 14; k++) {
      const y = rng.range(water + 10, focus.y + focus.h);
      const x = rng.range(box.x, box.x + box.w);
      ripples += `M${n(x)},${n(y)}h${n(rng.range(10, 34))}`;
    }
    out.push(`<path d="${ripples}" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".18"/>`);
    // Distant shoreline trees along the waterline.
    let shore = "";
    for (let x = box.x - 6; x < box.x + box.w + 6; x += rng.range(8, 16)) shore += pine(x, water + 1, rng.range(10, 22) * scale);
    out.push(`<path d="${shore}" fill="${pal.mid}"/>`);
  } else if (scene === "village") {
    let trees = "";
    for (let x = box.x - 6; x < box.x + box.w + 6; x += rng.range(10, 18)) trees += pine(x, nearBase - 8 * scale, rng.range(18, 34) * scale);
    out.push(`<path d="${trees}" fill="${mixColor(pal.mid, pal.near, 0.5)}"/>`);
    let roofs = "";
    let windows = "";
    let x = box.x + rng.range(-10, 20);
    const towerAt = rng.range(box.x + box.w * 0.15, box.x + box.w * 0.85);
    let towerDone = false;
    while (x < box.x + box.w + 30) {
      if (!towerDone && x > towerAt) {
        // Pagoda: stacked shrinking tiers.
        towerDone = true;
        let base = nearBase;
        let w = 52 * scale;
        for (let tier = 0; tier < 4; tier++) {
          const h = 16 * scale;
          roofs += house(x, base, w, h, 12 * scale);
          if (pal.lit) windows += `M${i(x - w * 0.18)},${i(base - h * 0.7)}h${i(w * 0.36)}v${i(h * 0.4)}h${i(-w * 0.36)}Z`;
          base -= h + 10 * scale;
          w *= 0.8;
        }
        roofs += `M${i(x - 1.5)},${i(base + 10 * scale)}V${i(base - 14 * scale)}h3V${i(base + 10 * scale)}Z`;
        x += 50 * scale;
        continue;
      }
      const w = rng.range(30, 62) * scale;
      const h = rng.range(14, 30) * scale;
      roofs += house(x, nearBase + rng.range(-4, 6), w, h, rng.range(10, 18) * scale);
      if (pal.lit && rng.chance(0.65)) {
        windows += `M${i(x - w * 0.2)},${i(nearBase - h * 0.65)}h${i(Math.max(3, w * 0.14))}v${i(Math.max(3, h * 0.3))}h${i(-Math.max(3, w * 0.14))}Z`;
      }
      x += w * rng.range(0.9, 1.3);
    }
    out.push(`<path d="${roofs}" fill="${pal.near}"/>`);
    if (windows) out.push(`<path d="${windows}" fill="#ffc764" opacity=".9"/>`);
  } else if (scene === "cliffs") {
    const left = rng.chance(0.5);
    const edgeX = left ? box.x + focus.w * rng.range(0.18, 0.28) : box.x + box.w - focus.w * rng.range(0.18, 0.28);
    const outer = left ? box.x - 4 : box.x + box.w + 4;
    const top = focus.y + focus.h * rng.range(0.22, 0.34);
    const pts: string[] = [`${n(outer)},${n(bottom)}`, `${n(outer)},${n(top - 10)}`];
    const steps = 10;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const y = top + (bottom - top) * t;
      pts.push(`${n(edgeX + (left ? 1 : -1) * (rng.range(-12, 12) + t * 40 * scale))},${n(y)}`);
    }
    out.push(`<path d="M${pts.join("L")}Z" fill="${mixColor(pal.mid, pal.near, 0.55)}"/>`);
    let crest = "";
    for (let k = 0; k < 6; k++) crest += pine(edgeX + (left ? -1 : 1) * k * 13 * scale, top + 2, rng.range(18, 30) * scale);
    out.push(`<path d="${crest}" fill="${mixColor(pal.mid, pal.near, 0.55)}"/>`);
    if (element === "water" || element === "earth" || rng.chance(0.4)) {
      // Waterfall spilling off the cliff edge: tapered sheet, streaks, spray.
      const wTop = 12 * scale;
      const wBottom = 26 * scale;
      const fx = edgeX + (left ? 4 : -4) * scale;
      const y0 = top + 4;
      const y1 = nearBase - 6 * scale;
      const fall = defs.linear("fall", [[0, lighten(pal.sky[2], 0.5), 0.85], [1, lighten(pal.sky[2], 0.6), 0.35]]);
      let streaks = "";
      for (let k = 0; k < 4; k++) {
        const sx = fx - wTop / 2 + (wTop * (k + 0.5)) / 4;
        streaks += `M${n(sx)},${n(y0 + rng.range(0, 20))}L${n(sx + (sx - fx) * 0.8)},${n(y1)}`;
      }
      out.push(
        `<path d="M${n(fx - wTop / 2)},${n(y0)}H${n(fx + wTop / 2)}L${n(fx + wBottom / 2)},${n(y1)}H${n(fx - wBottom / 2)}Z" fill="${fall}"/>`,
        `<path d="${streaks}" stroke="#fff" stroke-width="1.2" stroke-dasharray="14 9" opacity=".55"/>`,
        `<ellipse cx="${n(fx)}" cy="${n(y1)}" rx="${n(wBottom * 1.6)}" ry="${n(9 * scale)}" fill="#fff" opacity=".28"/>`,
      );
    }
    let trees = "";
    for (let x = box.x - 6; x < box.x + box.w + 6; x += rng.range(10, 18)) trees += pine(x, nearBase, rng.range(16, 30) * scale);
    out.push(`<path d="${trees}" fill="${pal.near}"/>`);
  } else {
    // Forest / peaks: dense pine treeline along a low ridge.
    const line = ridgeShape(ridge(rng, 16, 0.5), box.x - 4, box.x + box.w + 4, nearBase, focus.h * 0.05, bottom, 1);
    let trees = "";
    const tall = scene === "forest" ? 1.6 : 1;
    for (let x = box.x - 6; x < box.x + box.w + 6; x += rng.range(8, 14) * Math.min(1.3, tall)) {
      trees += pine(x, line.yAt(x) + 3, rng.range(20, 40) * scale * tall);
    }
    out.push(`<path d="${line.d}${trees}" fill="${pal.near}"/>`);
  }

  // Background element atmosphere.
  if (element === "wind") {
    let swirls = "";
    const count = rng.int(2, 3);
    for (let k = 0; k < count; k++) {
      swirls += spiral(rng.range(box.x + 40, box.x + box.w - 40), rng.range(focus.y + focus.h * 0.12, focus.y + focus.h * 0.5), rng.range(26, 46) * scale, rng.range(1.6, 2.4), rng.range(0, 6));
    }
    let streaks = "";
    for (let k = 0; k < 5; k++) {
      const y = rng.range(focus.y + focus.h * 0.15, focus.y + focus.h * 0.7);
      const x = rng.range(box.x - 20, box.x + box.w * 0.6);
      const len = rng.range(120, 260) * scale;
      streaks += `M${n(x)},${n(y)}q${n(len / 2)},${n(-14 * scale)} ${n(len)},0`;
    }
    out.push(`<path d="${swirls}${streaks}" fill="none" stroke="${ukiyo ? "#3f6e78" : "#ffffff"}" stroke-width="2.4" stroke-linecap="round" opacity=".42"/>`);
  } else if (element === "earth") {
    let rocks = "";
    const count = rng.int(3, 5);
    for (let k = 0; k < count; k++) {
      rocks += boulder(rng, rng.range(box.x + 30, box.x + box.w - 30), rng.range(focus.y + focus.h * 0.2, focus.y + focus.h * 0.6), rng.range(8, 22) * scale, mixColor(pal.near, hex, 0.18), lighten(mixColor(pal.mid, hex, 0.3), 0.15));
    }
    out.push(rocks);
  } else if (element === "water" && (pal.mood === "storm" || pal.mood === "night" || rng.chance(0.3))) {
    let rain = "";
    for (let k = 0; k < 46; k++) {
      const x = rng.range(box.x, box.x + box.w + 60);
      const y = rng.range(box.y, focus.y + focus.h);
      rain += `M${n(x)},${n(y)}l${n(-7 * scale)},${n(22 * scale)}`;
    }
    out.push(`<path d="${rain}" stroke="#cfe7ff" stroke-width="1.3" stroke-linecap="round" opacity=".35"/>`);
  }

  // Foreground ground + type-specific subject.
  const groundTop = focus.y + focus.h * 0.93;
  const ground = ridgeShape(ridge(rng, 16, 0.5), box.x - 4, box.x + box.w + 4, groundTop, focus.h * 0.05, bottom + 4, 1);
  const groundFill = defs.linear("ground", [[0, mixColor(pal.ground, pal.near, 0.35)], [1, pal.ground]], [0, groundTop - 20, 0, bottom], ' gradientUnits="userSpaceOnUse"');

  const subject: string[] = [];
  if (card.type === "leader" || card.type === "character") {
    const leader = card.type === "leader";
    const height = focus.h * (leader ? rng.range(0.56, 0.62) : rng.range(0.4, 0.46));
    const top = focus.y + focus.h * (leader ? 0.84 : 0.8);
    const facing: 1 | -1 = subjectX < focus.x + focus.w / 2 ? 1 : -1;
    if (leader) {
      // Chakra aura and light rays behind the leader.
      const auraY = top - height * 0.55;
      const aura = defs.radial("aura", [[0, lighten(hex, 0.4), 0.75], [0.35, hex, 0.35], [1, hex, 0]]);
      let rays = "";
      const count = 14;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + rng.range(-0.08, 0.08);
        const len = focus.h * rng.range(0.7, 1.1);
        const spread = 0.05;
        rays += `M${n(subjectX)},${n(auraY)}L${n(subjectX + Math.cos(a - spread) * len)},${n(auraY + Math.sin(a - spread) * len)}L${n(subjectX + Math.cos(a + spread) * len)},${n(auraY + Math.sin(a + spread) * len)}Z`;
      }
      subject.push(
        `<path d="${rays}" fill="${lighten(hex, 0.5)}" opacity=".13"/>`,
        `<circle cx="${n(subjectX)}" cy="${n(auraY)}" r="${n(height * 0.62)}" fill="${aura}"/>`,
      );
    }
    subject.push(`<path d="${outcrop(rng, subjectX, top, height * (leader ? 0.95 : 0.8), bottom + 4)}" fill="${groundFill}"/>`);
    const pose: Pose = leader ? "leader" : rng.weighted([["stand", 4], ["ready", 4], ["crouch", 2]]);
    subject.push(figure(ctx, pose, subjectX, top + 1, pose === "crouch" ? height * 0.72 : height, facing, sunX));
  } else if (card.type === "jutsu") {
    subject.push(jutsuEffect(ctx, subjectX, focus.y + focus.h * 0.5, focus.h * 0.3));
  } else {
    subject.push(missionScene(ctx, subjectX, groundTop + 2, focus, scale));
  }

  out.push(`<path d="${ground.d}" fill="${groundFill}"/>`);
  out.push(...subject);

  // Foreground element motifs.
  if (element === "fire") {
    let flames = "";
    let inner = "";
    for (let x = box.x - 10; x < box.x + box.w + 10; x += rng.range(18, 34) * scale) {
      const h = rng.range(26, 70) * scale * (card.type === "jutsu" ? 1.3 : 1);
      const w = rng.range(18, 30) * scale;
      const base = focus.y + focus.h + 6;
      flames += flame(x, base, w, h, rng.range(-8, 8));
      inner += flame(x, base, w * 0.55, h * 0.6, rng.range(-4, 4));
    }
    const flameFill = defs.linear("flame", [[0, darken(hex, 0.15)], [0.6, hex], [1, "#ffd27a", 0.2]], [0, 1, 0, 0]);
    out.push(`<path d="${flames}" fill="${flameFill}" opacity=".85"/><path d="${inner}" fill="#ffd98a" opacity=".55"/>`);
    let embers = "";
    for (let k = 0; k < 18; k++) embers += circlePath(rng.range(box.x, box.x + box.w), rng.range(focus.y + focus.h * 0.25, focus.y + focus.h), rng.range(1, 3));
    out.push(`<path d="${embers}" fill="#ffcf6b" opacity=".85"/>`);
  } else if (element === "water" && scene !== "lake") {
    out.push(waves(rng, box, focus.y + focus.h * 0.9, focus.y + focus.h + 8, mixColor(hex, pal.ground, 0.55), lighten(hex, 0.6)));
  } else if (element === "wind") {
    defs.add(`<path id="leaf" d="${LEAF}"/>`);
    let leaves = "";
    for (let k = 0; k < 12; k++) {
      leaves += `<use href="#leaf" transform="translate(${n(rng.range(box.x, box.x + box.w))} ${n(rng.range(focus.y + focus.h * 0.1, focus.y + focus.h * 0.95))}) rotate(${i(rng.range(0, 360))}) scale(${n(rng.range(0.8, 1.6) * scale)})"/>`;
    }
    out.push(`<g fill="${ukiyo ? "#5d8b4a" : lighten(hex, 0.25)}" opacity=".8">${leaves}</g>`);
  } else if (element === "earth") {
    out.push(
      boulder(rng, box.x + rng.range(10, 60), focus.y + focus.h * 0.97, 34 * scale, pal.ground, mixColor(pal.near, hex, 0.25)),
      boulder(rng, box.x + box.w - rng.range(10, 60), focus.y + focus.h * 0.98, 28 * scale, pal.ground, mixColor(pal.near, hex, 0.25)),
    );
  } else if (element === "lightning") {
    let sparks = "";
    for (let k = 0; k < 4; k++) {
      const x = rng.range(box.x + 20, box.x + box.w - 20);
      const y = rng.range(focus.y + focus.h * 0.7, focus.y + focus.h * 0.95);
      sparks += bolt(rng, x, y, x + rng.range(-30, 30), y + rng.range(-30, -10), 4, 8);
    }
    out.push(`<path d="${sparks}" fill="none" stroke="${lighten(hex, 0.5)}" stroke-width="1.6" stroke-linejoin="round" opacity=".7"/>`);
  }

  // Mission rank stamp, e.g. "C-Rank Mission".
  if (card.type === "mission") {
    const rank = card.traits.map((t) => /^([SABCD])-Rank\b/i.exec(t)?.[1]).find((r): r is string => r !== undefined);
    if (rank) {
      const sx = focus.x + focus.w - 64;
      const sy = focus.y + focus.h * 0.62;
      out.push(
        `<g transform="rotate(-8 ${n(sx)} ${n(sy)})"><rect x="${n(sx - 30)}" y="${n(sy - 30)}" width="60" height="60" rx="6" fill="#b3201b" fill-opacity=".88" stroke="#f3d9a4" stroke-width="2"/>` +
          `<text x="${n(sx)}" y="${n(sy + 16)}" font-family="${SERIF}" font-weight="700" font-size="44" text-anchor="middle" fill="#fbecd0">${escapeXml(rank.toUpperCase())}</text>` +
          `<text x="${n(sx)}" y="${n(sy + 44)}" font-family="${SANS}" font-weight="700" font-size="10" letter-spacing="2" text-anchor="middle" fill="#fbecd0">RANK</text></g>`,
      );
    }
  }

  // Vignette (lighter on full-art so the panels carry the contrast).
  const vignette = defs.radial("vig", [[0.55, "#000", 0], [1, "#000", fullArt ? 0.35 : 0.5]], ' cx=".5" cy=".45" r=".75"');
  out.push(rect(box, 0, `fill="${vignette}"`));
  return out.join("");
}

type Pt = readonly [number, number];

function cubicAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

const pt = ([x, y]: Pt) => `${n(x)},${n(y)}`;

/**
 * A chakra dragon: a tapered serpent body (tail first) along two joined cubic
 * curves, with dorsal fins, a horned head and a bright belly line.
 */
function dragon(cx: number, cy: number, r: number, facing: 1 | -1, body: string, belly: string, outline: string): string {
  const fx = (dx: number) => cx + dx * facing;
  const a0: Pt = [fx(-r * 0.9), cy + r * 1.9];
  const a1: Pt = [fx(-r * 1.8), cy + r * 0.5];
  const a2: Pt = [fx(r * 1.5), cy + r * 1.0];
  const a3: Pt = [fx(r * 0.95), cy - r * 0.1];
  const b1: Pt = [2 * a3[0] - a2[0], 2 * a3[1] - a2[1]];
  const b2: Pt = [fx(-r * 0.6), cy - r * 1.55];
  const b3: Pt = [fx(-r * 0.25), cy - r * 0.8];
  const spine: Pt[] = [];
  const steps = 20;
  for (let k = 0; k <= steps; k++) spine.push(cubicAt(a0, a1, a2, a3, k / steps));
  for (let k = 1; k <= steps; k++) spine.push(cubicAt(a3, b1, b2, b3, k / steps));

  const last = spine.length - 1;
  const frames = spine.map((p, k) => {
    const prev = spine[k - 1] ?? p;
    const next = spine[k + 1] ?? p;
    const len = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
    const tangent: Pt = [(next[0] - prev[0]) / len, (next[1] - prev[1]) / len];
    const normal: Pt = [-tangent[1], tangent[0]];
    const width = r * (0.04 + 0.3 * Math.pow(k / last, 0.75));
    return { p, tangent, normal, width };
  });
  const end = frames[last];
  if (!end) return "";
  // Fins and the head's crown go on whichever side faces up at the head.
  const side = end.normal[1] < 0 ? 1 : -1;
  const at = (f: (typeof frames)[number], along: number, across: number): Pt => [
    f.p[0] + f.tangent[0] * along + f.normal[0] * across * side,
    f.p[1] + f.tangent[1] * along + f.normal[1] * across * side,
  ];

  const upper = frames.map((f) => pt(at(f, 0, f.width / 2)));
  const lower = frames.map((f) => pt(at(f, 0, -f.width / 2))).reverse();
  let fins = "";
  for (let k = 4; k < last - 2; k += 3) {
    const f = frames[k];
    if (!f) continue;
    fins += `M${pt(at(f, -f.width * 0.45, f.width * 0.45))}L${pt(at(f, -f.width * 0.55, f.width * 1.05))}L${pt(at(f, f.width * 0.3, f.width * 0.45))}Z`;
  }
  const w = end.width;
  const head = [
    at(end, -w * 0.4, w * 0.55),
    at(end, w * 0.45, w * 0.62),
    at(end, w * 1.35, w * 0.32),
    at(end, w * 1.62, w * 0.06),
    at(end, w * 0.75, -w * 0.06),
    at(end, w * 1.4, -w * 0.42),
    at(end, w * 0.25, -w * 0.58),
    at(end, -w * 0.4, -w * 0.5),
  ];
  const horns = `M${pt(at(end, -w * 0.05, w * 0.5))}Q${pt(at(end, -w * 0.6, w * 0.9))} ${pt(at(end, -w * 1.3, w * 1.25))}M${pt(at(end, w * 0.2, w * 0.55))}Q${pt(at(end, -w * 0.2, w * 1.05))} ${pt(at(end, -w * 0.75, w * 1.45))}`;
  const whisker = `M${pt(at(end, w * 1.5, -w * 0.1))}Q${pt(at(end, w * 0.8, -w * 1.1))} ${pt(at(end, -w * 0.9, -w * 1.2))}`;
  const bellyLine = frames
    .slice(2)
    .map((f, k) => `${k === 0 ? "M" : "L"}${pt(at(f, 0, -f.width * 0.22))}`)
    .join("");
  const eye = at(end, w * 0.62, w * 0.28);
  return (
    `<path d="M${upper.join("L")}L${lower.join("L")}ZM${head.map(pt).join("L")}Z" fill="${body}" stroke="${outline}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="${fins}" fill="${outline}"/>` +
    `<path d="${horns}${whisker}" fill="none" stroke="${belly}" stroke-width="${n(Math.max(2, w * 0.1))}" stroke-linecap="round"/>` +
    `<path d="${bellyLine}" fill="none" stroke="${belly}" stroke-width="${n(Math.max(2, r * 0.05))}" stroke-linecap="round" stroke-dasharray="${n(r * 0.16)} ${n(r * 0.08)}" opacity=".85"/>` +
    `<circle cx="${n(eye[0])}" cy="${n(eye[1])}" r="${n(Math.max(2.5, w * 0.12))}" fill="#fff"/>`
  );
}

/**
 * A crescent "wind blade" slash centred at (cx, cy), rotated by `angle`
 * degrees: a thin sickle that fades from its trailing tip to a bright edge.
 */
function windBlade(cx: number, cy: number, radius: number, thickness: number, angle: number, fill: string): string {
  const inner = radius * 1.25;
  const outer = `M${n(cx - radius)},${n(cy)}A${n(radius)},${n(radius * 0.55)} 0 0,1 ${n(cx + radius)},${n(cy)}`;
  return (
    `<g transform="rotate(${i(angle)} ${n(cx)} ${n(cy)})">` +
    `<path d="${outer}A${n(inner)},${n(radius * 0.55 - thickness)} 0 0,0 ${n(cx - radius)},${n(cy)}Z" fill="${fill}"/>` +
    `<path d="${outer}" fill="none" stroke="url(#bladeedge)" stroke-width="2.5" stroke-linecap="round"/></g>`
  );
}

/** Centrepiece for Jutsu cards: one of two signature effects per element. */
function jutsuEffect(ctx: SceneContext, cx: number, cy: number, r: number): string {
  const { rng, hex, element, defs } = ctx;
  const out: string[] = [];
  const alt = rng.chance(0.5);
  const facing: 1 | -1 = rng.chance(0.5) ? 1 : -1;
  const core = defs.radial("core", [[0, "#ffffff"], [0.3, lighten(hex, 0.55), 0.95], [0.65, hex, 0.55], [1, hex, 0]]);
  const halo = (scale: number, opacity: number) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * scale)}" fill="${core}" opacity="${n(opacity)}"/>`;

  if (element === "fire") {
    if (alt) {
      out.push(halo(1.6, 0.4), dragon(cx, cy, r, facing, hex, "#ffe08a", darken(hex, 0.45)));
    } else {
      let petals = "";
      const count = 12;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + rng.range(-0.1, 0.1);
        petals += `<path transform="rotate(${n((a * 180) / Math.PI + 90)} ${n(cx)} ${n(cy)})" d="${flame(cx, cy, r * 0.45, r * rng.range(1.05, 1.45), rng.range(-6, 6))}"/>`;
      }
      out.push(`<g fill="${darken(hex, 0.1)}" opacity=".75">${petals}</g>`, halo(1.1, 1), `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.42)}" fill="#fff4cf" opacity=".9"/>`);
    }
  } else if (element === "water") {
    let drops = "";
    for (let k = 0; k < 14; k++) drops += circlePath(cx + rng.range(-r * 1.6, r * 1.6), cy + rng.range(-r * 1.4, r * 1.3), rng.range(1.5, 4));
    if (alt) {
      out.push(halo(1.5, 0.35), dragon(cx, cy, r, facing, hex, lighten(hex, 0.7), darken(hex, 0.5)));
    } else {
      // Water prison: a glassy sphere with an orbiting ripple ring.
      const sphere = defs.radial("sphere", [[0, lighten(hex, 0.7), 0.25], [0.7, hex, 0.45], [0.92, lighten(hex, 0.45), 0.9], [1, lighten(hex, 0.8), 0.95]], ' cx=".45" cy=".42"');
      let rings = "";
      for (let k = 0; k < 3; k++) {
        rings += `<ellipse cx="${n(cx)}" cy="${n(cy + r * 0.15)}" rx="${n(r * (1.25 + k * 0.18))}" ry="${n(r * (0.22 + k * 0.05))}" transform="rotate(${i(-8 + k * 5)} ${n(cx)} ${n(cy)})"/>`;
      }
      out.push(
        halo(1.6, 0.3),
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 1.05)}" fill="${sphere}"/>`,
        `<path d="M${n(cx - r * 0.6)},${n(cy + r * 0.2)}q${n(r * 0.3)},${n(-r * 0.25)} ${n(r * 0.6)},0t${n(r * 0.6)},0M${n(cx - r * 0.4)},${n(cy + r * 0.5)}q${n(r * 0.2)},${n(-r * 0.18)} ${n(r * 0.4)},0t${n(r * 0.4)},0" fill="none" stroke="#fff" stroke-width="2" opacity=".45"/>`,
        `<ellipse cx="${n(cx - r * 0.38)}" cy="${n(cy - r * 0.5)}" rx="${n(r * 0.32)}" ry="${n(r * 0.16)}" transform="rotate(-30 ${n(cx - r * 0.38)} ${n(cy - r * 0.5)})" fill="#fff" opacity=".6"/>`,
        `<g fill="none" stroke="${lighten(hex, 0.7)}" stroke-width="2" opacity=".6">${rings}</g>`,
      );
    }
    out.push(`<path d="${drops}" fill="${lighten(hex, 0.65)}" opacity=".8"/>`);
  } else if (element === "lightning") {
    if (alt) {
      // A colossal strike from the sky into the ground.
      const groundY = cy + r * 1.9;
      const main = bolt(rng, cx + rng.range(-r * 0.5, r * 0.5), cy - r * 3, cx, groundY, 12, r * 0.28);
      let branches = "";
      for (let k = 0; k < 4; k++) {
        const y0 = cy - r * rng.range(1.6, -0.6);
        const x0 = cx + rng.range(-r * 0.3, r * 0.3);
        branches += bolt(rng, x0, y0, x0 + rng.range(-r * 1.4, r * 1.4), y0 + r * rng.range(0.6, 1.2), 5, r * 0.12);
      }
      out.push(
        `<ellipse cx="${n(cx)}" cy="${n(groundY)}" rx="${n(r * 1.6)}" ry="${n(r * 0.45)}" fill="${core}"/>`,
        glowStroke(main, hex, 3.2),
        glowStroke(branches, hex, 1.4),
      );
    } else {
      let bolts = "";
      for (let k = 0; k < 11; k++) {
        const a = (k / 11) * Math.PI * 2 + rng.range(-0.2, 0.2);
        const len = r * rng.range(1.1, 1.9);
        bolts += bolt(rng, cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, 5, r * 0.16);
      }
      out.push(halo(1.5, 0.6), glowStroke(bolts, hex, 1.8), halo(0.55, 1));
    }
  } else if (element === "wind") {
    if (alt) {
      // Wind blades: thin sickle slashes cutting diagonally, with speed lines.
      const fade: [number, number, number, number] = facing === 1 ? [0, 0, 1, 0] : [1, 0, 0, 0];
      const blade = defs.linear("blade", [[0, lighten(hex, 0.5), 0], [0.55, lighten(hex, 0.5), 0.55], [1, "#ffffff", 0.95]], fade);
      defs.linear("bladeedge", [[0, "#ffffff", 0], [1, "#ffffff", 0.95]], fade);
      let blades = "";
      const tilt = rng.range(-38, -22) * facing;
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * r * 0.7;
        blades += windBlade(cx + off * facing, cy + off * 0.6, r * (0.85 - k * 0.12), r * 0.11, tilt, blade);
      }
      // Speed lines run along the blades' direction of travel.
      const ux = Math.cos((tilt * Math.PI) / 180);
      const uy = Math.sin((tilt * Math.PI) / 180);
      let lines = "";
      for (let k = 0; k < 8; k++) {
        const len = r * rng.range(0.6, 1.4);
        lines += `M${n(cx + rng.range(-r * 1.6, r * 1.6))},${n(cy + rng.range(-r * 1.3, r * 1.3))}l${n(ux * len)},${n(uy * len)}`;
      }
      out.push(halo(1.5, 0.35), `<path d="${lines}" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".4"/>`, blades);
    } else {
      let rings = "";
      for (let k = 0; k < 4; k++) {
        rings += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r * (1.05 + k * 0.16))}" ry="${n(r * (0.34 + k * 0.08))}" transform="rotate(${i(-25 + k * 38)} ${n(cx)} ${n(cy)})"/>`;
      }
      out.push(
        halo(1.35, 0.55),
        `<g fill="none" stroke="#fff" stroke-width="2" opacity=".5">${rings}</g>`,
        halo(0.8, 1),
        `<path d="${spiral(cx, cy, r * 0.75, 2.6, rng.range(0, 6))}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>`,
      );
    }
  } else {
    const rock = mixColor(ctx.palette.near, hex, 0.35);
    const light = lighten(hex, 0.15);
    if (alt) {
      // Boulder barrage: great rocks torn from the ground, trailing dust.
      let trails = "";
      let rocks = "";
      for (let k = 0; k < 5; k++) {
        const bx = cx + (k - 2) * r * 0.62 + rng.range(-10, 10);
        const by = cy + rng.range(-r * 0.9, r * 0.5);
        const br = r * rng.range(0.26, 0.46);
        trails += `M${n(bx - br * 0.6)},${n(by + br * 0.5)}L${n(bx - br * 0.2)},${n(cy + r * 1.8)}L${n(bx + br * 0.2)},${n(cy + r * 1.8)}L${n(bx + br * 0.6)},${n(by + br * 0.5)}Z`;
        rocks += boulder(rng, bx, by, br, rock, light);
      }
      out.push(halo(1.6, 0.4), `<path d="${trails}" fill="${lighten(ctx.palette.haze, 0.2)}" opacity=".25"/>`, rocks);
    } else {
      // A wall of rock spires bursting upward.
      let spires = "";
      let facets = "";
      for (let k = 0; k < 5; k++) {
        const x = cx + (k - 2) * r * 0.55 + rng.range(-8, 8);
        const h = r * (k === 2 ? 2.4 : rng.range(1.3, 2));
        const w = r * rng.range(0.35, 0.5);
        const base = cy + r * 1.7;
        const tip = x + rng.range(-w * 0.3, w * 0.3);
        spires += `M${n(x - w / 2)},${n(base)}L${n(x - w * 0.42)},${n(base - h * 0.6)}L${n(tip)},${n(base - h)}L${n(x + w * 0.45)},${n(base - h * 0.55)}L${n(x + w / 2)},${n(base)}Z`;
        facets += `M${n(tip)},${n(base - h)}L${n(x + w * 0.45)},${n(base - h * 0.55)}L${n(x + w / 2)},${n(base)}L${n(x + w * 0.05)},${n(base)}Z`;
      }
      let debris = "";
      for (let k = 0; k < 6; k++) debris += boulder(rng, cx + rng.range(-r * 1.6, r * 1.6), cy + rng.range(-r * 1.2, r * 0.4), rng.range(4, 10), rock, light);
      out.push(halo(1.5, 0.35), `<path d="${spires}" fill="${rock}"/>`, `<path d="${facets}" fill="${light}" opacity=".45"/>`, debris);
    }
  }
  return out.join("");
}

function missionScene(ctx: SceneContext, cx: number, base: number, focus: Box, scale: number): string {
  const { rng, palette: pal } = ctx;
  const h = focus.h * rng.range(0.34, 0.4);
  const w = h * 1.15;
  const red = mixColor("#c23a24", pal.near, pal.mood === "night" ? 0.55 : 0.3);
  const pillar = w * 0.07;
  const top = base - h;
  const beam = h * 0.1;
  const gate =
    `M${n(cx - w * 0.36 - pillar / 2)},${n(base)}V${n(top + beam)}h${n(pillar)}V${n(base)}Z` +
    `M${n(cx + w * 0.36 - pillar / 2)},${n(base)}V${n(top + beam)}h${n(pillar)}V${n(base)}Z` +
    `M${n(cx - w * 0.56)},${n(top - beam * 0.4)}Q${n(cx)},${n(top + beam * 0.5)} ${n(cx + w * 0.56)},${n(top - beam * 0.4)}L${n(cx + w * 0.5)},${n(top + beam * 0.7)}Q${n(cx)},${n(top + beam * 1.4)} ${n(cx - w * 0.5)},${n(top + beam * 0.7)}Z` +
    `M${n(cx - w * 0.46)},${n(top + beam * 2.1)}h${n(w * 0.92)}v${n(beam * 0.7)}h${n(-w * 0.92)}Z` +
    `M${n(cx - pillar / 3)},${n(top + beam)}h${n((pillar * 2) / 3)}v${n(beam * 1.2)}h${n((-pillar * 2) / 3)}Z`;
  let steps = "";
  for (let k = 0; k < 4; k++) {
    const sw = w * (0.5 + k * 0.18);
    steps += `M${n(cx - sw / 2)},${n(base + k * 7 * scale)}h${n(sw)}v${n(5 * scale)}h${n(-sw)}Z`;
  }
  let lanterns = "";
  for (const side of [-1, 1]) {
    const lx = cx + side * w * rng.range(0.7, 0.85);
    lanterns += `<rect x="${n(lx - 6 * scale)}" y="${n(base - 34 * scale)}" width="${n(12 * scale)}" height="${n(34 * scale)}" fill="${pal.near}"/><rect x="${n(lx - 9 * scale)}" y="${n(base - 48 * scale)}" width="${n(18 * scale)}" height="${n(14 * scale)}" rx="2" fill="${pal.lit ? "#ffc764" : pal.near}"/>`;
  }
  return `<path d="${steps}" fill="${mixColor(pal.near, "#000000", 0.2)}"/><path d="${gate}" fill="${red}"/>${lanterns}`;
}

// ---------------------------------------------------------------------------
// Card chrome
// ---------------------------------------------------------------------------

interface Chrome {
  hex: string;
  accent: string;
  accentText: string;
  treatment: Treatment;
}

function frameMarkup(defs: Defs, chrome: Chrome): string {
  const { hex, treatment } = chrome;
  const stops: readonly (readonly [number, string])[] =
    treatment.frame === "gold"
      ? [[0, "#fff3c0"], [0.2, "#c99637"], [0.42, "#7a5414"], [0.6, "#f2d27a"], [0.8, "#a8771f"], [1, "#fff0b0"]]
      : treatment.frame === "rainbow"
        ? [[0, "#ff8fd0"], [0.2, "#ffd479"], [0.4, "#9dffc4"], [0.6, "#7fd1ff"], [0.8, "#c49bff"], [1, "#ff8fd0"]]
        : [[0, lighten(hex, 0.3)], [0.2, hex], [0.42, darken(hex, 0.5)], [0.62, hex], [0.82, lighten(hex, 0.45)], [1, darken(hex, 0.35)]];
  const frameFill = defs.linear("frame", stops, [0, 0, 1, 1]);
  const bevel = defs.linear("bevel", [[0, "#ffffff", 0.75], [0.5, "#ffffff", 0], [1, "#000000", 0.6]], [0, 0, 1, 1]);
  const panelFill = defs.linear("panel", [[0, mixColor(hex, "#0a0a12", 0.82)], [0.5, "#0b0b12"], [1, mixColor(hex, "#07070b", 0.88)]]);
  defs.add(`<pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0V9" stroke="#fff" stroke-opacity=".035" stroke-width="2"/></pattern>`);
  // Secret rares: an engraved black band with gold filigree between gold rims.
  let engraved = "";
  if (treatment.frame === "gold") {
    defs.add(
      `<pattern id="fili" width="26" height="13" patternUnits="userSpaceOnUse"><path d="M0,6.5C4,0 9,0 13,6.5S22,13 26,6.5" fill="none" stroke="#e9c46a" stroke-width="1.4"/><circle cx="13" cy="6.5" r="1.6" fill="#fff0b0"/></pattern>`,
    );
    engraved =
      `<rect x="13" y="13" width="604" height="854" rx="18" fill="#140e05"/>` +
      `<rect x="13" y="13" width="604" height="854" rx="18" fill="url(#fili)"/>` +
      rect({ x: PANEL.x - 2, y: PANEL.y - 2, w: PANEL.w + 4, h: PANEL.h + 4 }, 15, `fill="none" stroke="${frameFill}" stroke-width="3"`);
  }
  return (
    `<rect width="${ART_WIDTH}" height="${ART_HEIGHT}" rx="29" fill="#08080c"/>` +
    `<rect x="9" y="9" width="612" height="862" rx="22" fill="${frameFill}"/>` +
    `<rect x="10" y="10" width="610" height="860" rx="21" fill="none" stroke="${bevel}" stroke-width="2"/>` +
    engraved +
    rect(PANEL, 13, `fill="${panelFill}"`) +
    rect(PANEL, 13, 'fill="url(#hatch)"') +
    rect(PANEL, 13, `fill="none" stroke="#000" stroke-opacity=".7" stroke-width="2"`)
  );
}

/** Corner ornaments: angular kunai brackets, or gold filigree scrolls. */
function cornerOrnaments(chrome: Chrome): string {
  const corners: readonly [number, number, number, number][] = [
    [PANEL.x, PANEL.y, 1, 1],
    [PANEL.x + PANEL.w, PANEL.y, -1, 1],
    [PANEL.x, PANEL.y + PANEL.h, 1, -1],
    [PANEL.x + PANEL.w, PANEL.y + PANEL.h, -1, -1],
  ];
  const gold = chrome.treatment.frame === "gold";
  // Kept within ~30 units of the corner so they never touch the footer text.
  const d = gold
    ? "M3,28C3,13 13,3 28,3M8,23C7,14 14,7 23,8C28,9 27,15 22,15C19,15 19,11 21,11M3,36V42M36,3H42"
    : "M3,22V9L9,3H22M8,28V14L14,8H28";
  const color = gold ? "#f3d27a" : chrome.accent;
  return `<g fill="none" stroke="${color}" stroke-width="${gold ? 2.2 : 2}" stroke-linecap="round" opacity="${gold ? ".95" : ".7"}">${corners
    .map(([x, y, sx, sy]) => `<path transform="translate(${x} ${y}) scale(${sx} ${sy})" d="${d}"/>`)
    .join("")}</g>`;
}

function costOrb(defs: Defs, card: NarutoCard, chrome: Chrome): string {
  const { hex, treatment } = chrome;
  const { cx, cy, r } = ORB;
  const ringStops: readonly (readonly [number, string])[] =
    treatment.frame === "gold"
      ? [[0, "#fff3c0"], [0.5, "#b8862b"], [1, "#fff0b0"]]
      : [[0, lighten(hex, 0.6)], [0.5, darken(hex, 0.3)], [1, lighten(hex, 0.3)]];
  const ring = defs.linear("orbring", ringStops, [0, 0, 1, 1]);
  const orb = defs.radial("orb", [[0, lighten(hex, 0.35)], [0.55, hex], [1, darken(hex, 0.6)]], ' cx=".4" cy=".35" r=".7"');
  const base =
    `<circle cx="${cx}" cy="${cy + 3}" r="${r + 2}" fill="#000" opacity=".45"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ring}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r - 6}" fill="${orb}" stroke="#000" stroke-opacity=".5" stroke-width="1.5"/>`;
  const shine = `<ellipse cx="${cx - 6}" cy="${cy - 20}" rx="${n(r * 0.55)}" ry="${n(r * 0.26)}" fill="#fff" opacity=".22"/>`;
  if (card.type === "leader") {
    // Leader crest: an eight-point star with a shuriken core instead of a cost.
    const star = (radius: number, inner: number, points: number, rot: number) => {
      const pts: string[] = [];
      for (let k = 0; k < points * 2; k++) {
        const a = rot + (k * Math.PI) / points;
        const rr = k % 2 === 0 ? radius : inner;
        pts.push(`${n(cx + Math.cos(a) * rr)},${n(cy + Math.sin(a) * rr)}`);
      }
      return `M${pts.join("L")}Z`;
    };
    return (
      base +
      `<path d="${star(r - 10, (r - 10) * 0.55, 8, -Math.PI / 2)}" fill="${darken(hex, 0.55)}" opacity=".9"/>` +
      `<path d="${star(r - 16, (r - 16) * 0.3, 4, -Math.PI / 4)}" fill="#fff" stroke="${darken(hex, 0.6)}" stroke-width="1.5"/>` +
      `<circle cx="${cx}" cy="${cy}" r="5" fill="${darken(hex, 0.6)}"/>` +
      shine +
      `<text x="${cx}" y="${cy + r + 14}" font-size="11" font-weight="700" letter-spacing="2" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="3" stroke-opacity=".7" paint-order="stroke">LEADER</text>`
    );
  }
  const label = card.cost === undefined ? "–" : String(card.cost);
  const size = label.length > 1 ? 40 : 52;
  return (
    base +
    shine +
    `<text x="${cx}" y="${n(cy + size * 0.36)}" font-size="${size}" font-weight="700" text-anchor="middle" fill="#fff" stroke="#000" stroke-opacity=".75" stroke-width="5" paint-order="stroke">${escapeXml(label)}</text>`
  );
}

function nameBanner(defs: Defs, card: NarutoCard, chrome: Chrome): string {
  const { hex, treatment } = chrome;
  const full = treatment.fullArt;
  const fill = full
    ? 'fill="#06060b" fill-opacity=".55"'
    : `fill="${defs.linear("banner", [[0, mixColor(hex, "#0b0b12", 0.55)], [0.6, mixColor(hex, "#0b0b12", 0.82)], [1, "#0b0b12"]], [0, 0, 1, 0])}"`;
  const nameX = ORB.cx + ORB.r + 12;
  const maxWidth = SIGIL.cx - SIGIL.r - 12 - nameX;
  const name = fitLine(card.name, maxWidth, 34, 20, true);
  const title = card.title ? fitLine(card.title, maxWidth, 17, 13, false) : undefined;
  const nameY = title ? BANNER.y + 40 : BANNER.y + BANNER.h / 2 + name.size * 0.36;
  const sigilFill = defs.radial("sigil", [[0, lighten(hex, 0.15)], [1, darken(hex, 0.45)]], ' cx=".4" cy=".35"');
  return (
    rect(BANNER, 10, `${fill} stroke="${chrome.accent}" stroke-opacity=".75" stroke-width="1.5"`) +
    `<path d="M${BANNER.x + 12},${BANNER.y + 1.5}H${BANNER.x + BANNER.w - 12}" stroke="#fff" stroke-opacity=".25"/>` +
    `<text x="${nameX}" y="${n(nameY)}" font-size="${name.size}" font-weight="700" fill="#fff" stroke="#000" stroke-opacity=".55" stroke-width="3" paint-order="stroke"${fitWidth(name.width)}>${escapeXml(name.text)}</text>` +
    (title
      ? `<text x="${nameX}" y="${BANNER.y + 62}" font-family="${SERIF}" font-style="italic" font-size="${title.size}" fill="${chrome.accentText}"${fitWidth(title.width * SERIF_FACTOR)}>${escapeXml(title.text)}</text>`
      : "") +
    `<circle cx="${SIGIL.cx}" cy="${SIGIL.cy}" r="${SIGIL.r}" fill="${sigilFill}" stroke="${chrome.accent}" stroke-width="2"/>` +
    glyph(card.element, SIGIL.cx, SIGIL.cy, 30, "#fff")
  );
}

function typeLine(card: NarutoCard, printing: CardPrinting, chrome: Chrome): string {
  const full = chrome.treatment.fullArt;
  const label = (TYPE_META[card.type]?.label ?? card.type).toUpperCase();
  const traits = card.traits.join(" · ");
  const x0 = TYPE_LINE.x + 18;
  const gemX = TYPE_LINE.x + TYPE_LINE.w - 22;
  const maxWidth = gemX - 16 - x0;
  let size = 16;
  const labelWidth = (s: number) => measureText(label, s, { bold: true, letterSpacing: 1.5 });
  const dash = traits ? " — " : "";
  while (size > 12 && labelWidth(size) + measureText(`${dash}${traits}`, size) > maxWidth) size -= 0.5;
  const lw = labelWidth(size);
  const rest = traits ? wrapText(`${dash.trimStart()}${traits}`, maxWidth - lw - measureText(" ", size), size, { maxLines: 1 })[0] ?? "" : "";
  const restWidth = measureText(rest, size);
  const y = TYPE_LINE.y + TYPE_LINE.h / 2 + size * 0.35;
  const gem = RARITY_COLOR[printing.rarity];
  const cy = TYPE_LINE.y + TYPE_LINE.h / 2;
  return (
    rect(TYPE_LINE, 6, `fill="#07070c" fill-opacity="${full ? ".55" : ".88"}" stroke="${chrome.accent}" stroke-opacity=".5"`) +
    `<rect x="${TYPE_LINE.x}" y="${TYPE_LINE.y}" width="7" height="${TYPE_LINE.h}" rx="3" fill="${chrome.accent}"/>` +
    `<text y="${n(y)}" font-size="${n(size)}">` +
    `<tspan x="${x0}" font-weight="700" letter-spacing="1.5" fill="${chrome.accentText}">${escapeXml(label)}</tspan>` +
    (rest
      ? `<tspan x="${n(x0 + lw + measureText(" ", size))}" fill="#d9d9e6"${fitWidth(restWidth)}>${escapeXml(rest)}</tspan>`
      : "") +
    `</text>` +
    `<path d="M${gemX},${n(cy - 10)}L${gemX + 9},${n(cy)}L${gemX},${n(cy + 10)}L${gemX - 9},${n(cy)}Z" fill="${gem}" stroke="#000" stroke-opacity=".6" stroke-width="1.5"/>` +
    `<path d="M${gemX},${n(cy - 10)}L${gemX + 9},${n(cy)}L${gemX},${n(cy)}Z" fill="#fff" opacity=".45"/>`
  );
}

function keywordStrip(card: NarutoCard, chrome: Chrome, artBottom: number): string {
  if (card.keywords.length === 0) return "";
  const size = 13;
  const spacing = 1.2;
  const padX = 12;
  const gap = 8;
  const maxRight = ART.x + ART.w - 14;
  const y = artBottom - 40;
  const chipWidth = (label: string) => measureText(label, size, { bold: true, letterSpacing: spacing }) + padX * 2;
  const keywords = card.keywords.map((k) => k.toUpperCase());

  // Fit as many chips as possible, reserving room for a "+N" overflow chip.
  const labels: string[] = [];
  let x = ART.x + 14;
  for (const [index, keyword] of keywords.entries()) {
    const remaining = keywords.length - index - 1;
    const reserve = remaining > 0 ? chipWidth(`+${remaining}`) + gap : 0;
    if (x + chipWidth(keyword) + reserve <= maxRight) {
      labels.push(keyword);
      x += chipWidth(keyword) + gap;
      continue;
    }
    if (index === 0) {
      // A single absurdly long keyword: ellipsize it instead of dropping it.
      const room = maxRight - x - reserve - padX * 2;
      labels.push(wrapText(keyword, Math.max(0, room - spacing * keyword.length), size, { bold: true, maxLines: 1 })[0] ?? "");
      if (remaining > 0) labels.push(`+${remaining}`);
    } else {
      labels.push(`+${keywords.length - index}`);
    }
    break;
  }

  let out = "";
  x = ART.x + 14;
  for (const label of labels) {
    const w = chipWidth(label);
    out +=
      `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="28" rx="14" fill="#07070c" fill-opacity=".8" stroke="${chrome.accent}" stroke-width="1.5"/>` +
      `<text x="${n(x + padX)}" y="${n(y + 19)}" font-size="${size}" font-weight="700" letter-spacing="${spacing}" fill="${chrome.accentText}">${escapeXml(label)}</text>`;
    x += w + gap;
  }
  return out;
}

interface TextTheme {
  body: string;
  trait: string;
  flavor: string;
  rule: string;
  keywordFill: string;
  keywordText: string;
}

function renderLine(words: readonly Word[], x0: number, baseline: number, size: number, theme: TextTheme, family?: string): string {
  const runs = placeLine(words, size);
  let pills = "";
  let spans = "";
  for (const run of runs) {
    const x = x0 + run.x;
    const text = escapeXml(run.text);
    if (run.style === "timing" || run.style === "keyword") {
      const pad = PILL_PAD * size;
      const fill = run.style === "timing" ? (TIMING_COLORS[run.text.toLowerCase()] ?? "#3d3d4f") : theme.keywordFill;
      pills += `<rect x="${n(x)}" y="${n(baseline - size * 0.86)}" width="${n(run.width)}" height="${n(size * 1.12)}" rx="${n(size * 0.24)}" fill="${fill}"/>`;
      spans += `<tspan x="${n(x + pad)}" font-size="${n(size * PILL_SCALE)}" font-weight="700" fill="${run.style === "timing" ? "#fff" : theme.keywordText}"${fitWidth(run.width - 2 * pad)}>${text}</tspan>`;
      continue;
    }
    const attrs =
      run.style === "name" || run.style === "strong"
        ? ' font-weight="700"'
        : run.style === "trait"
          ? ` font-weight="700" fill="${theme.trait}"`
          : "";
    const width = run.style === "italic" && family === SERIF ? run.width * SERIF_FACTOR : run.width;
    spans += `<tspan x="${n(x)}"${attrs}${fitWidth(width)}>${text}</tspan>`;
  }
  const font = family ? ` font-family="${family}" font-style="italic"` : "";
  return `${pills}<text y="${n(baseline)}" font-size="${n(size)}"${font} fill="${family ? theme.flavor : theme.body}">${spans}</text>`;
}

/** Reminder text for vanilla cards that only carry keywords. */
function vanillaText(card: NarutoCard): string {
  return card.keywords
    .map((kw) => {
      const reminder = KEYWORD_GLOSSARY[kw];
      return reminder ? `[${kw}] (${reminder})` : `[${kw}]`;
    })
    .join("\n");
}

function rulesBox(defs: Defs, card: NarutoCard, chrome: Chrome): string {
  const { hex, treatment } = chrome;
  const full = treatment.fullArt;
  const theme: TextTheme = full
    ? { body: "#f3f0ea", trait: lighten(hex, 0.55), flavor: "#cfcbe0", rule: chrome.accent, keywordFill: "#f3f0ea", keywordText: "#15131c" }
    : { body: "#1c1820", trait: mixColor(hex, "#1c1820", 0.6), flavor: "#4a4152", rule: mixColor(hex, "#7a6a55", 0.5), keywordFill: "#2a2533", keywordText: "#f6efe0" };
  const fill = full
    ? 'fill="#06060b" fill-opacity=".7"'
    : `fill="${defs.linear("parch", [[0, mixColor("#f6efe0", hex, 0.06)], [1, mixColor("#e5d7bb", hex, 0.1)]])}"`;
  const box =
    rect(TEXT_BOX, 10, `${fill} stroke="${chrome.accent}" stroke-width="2"`) +
    rect({ x: TEXT_BOX.x + 5, y: TEXT_BOX.y + 5, w: TEXT_BOX.w - 10, h: TEXT_BOX.h - 10 }, 7, `fill="none" stroke="${full ? "#fff" : "#000"}" stroke-opacity=".14"`) +
    glyph(card.element, TEXT_BOX.x + TEXT_BOX.w / 2, TEXT_BOX.y + TEXT_BOX.h / 2, 150, full ? "#fff" : hex, full ? 0.05 : 0.08);

  const padX = 18;
  const padTop = 16;
  const padBottom = 14;
  const innerW = TEXT_BOX.w - padX * 2;
  const innerH = TEXT_BOX.h - padTop - padBottom;
  const x0 = TEXT_BOX.x + padX;
  const effect = card.effect.trim() || vanillaText(card);
  const flavor = card.flavor?.trim() ?? "";
  const LINE = 1.3;
  const FLAVOR_LINE = 1.25;
  const flavorWidth = innerW / SERIF_FACTOR - 24;

  if (!effect) {
    if (!flavor) return box;
    // Vanilla: flavor text centred in the box.
    for (let size = 20; size >= 12; size -= 0.5) {
      const fitted = layoutParagraphs(flavor, flavorWidth, size, { style: "italic" });
      const lh = size * FLAVOR_LINE;
      if (fitted.lines.length * lh <= innerH || size <= 12) {
        const { lines } = layoutParagraphs(flavor, flavorWidth, size, { style: "italic", maxLines: Math.floor(innerH / lh) });
        const top = TEXT_BOX.y + TEXT_BOX.h / 2 - (lines.length * lh) / 2 + size * 0.9;
        return box + lines.map((line, k) => renderLine(line, x0 + 12, top + k * lh, size, theme, SERIF)).join("");
      }
    }
    return box;
  }

  // Pick the largest size at which the effect fits; keep flavor if it fits too.
  let chosen: { size: number; lines: Word[][]; flavorSize: number; flavorLines: Word[][] } | undefined;
  let effectOnly: { size: number; lines: Word[][] } | undefined;
  for (let size = 25; size >= 13; size -= 0.5) {
    const { lines } = layoutParagraphs(effect, innerW, size, { rich: true });
    const effectH = lines.length * size * LINE;
    if (effectH > innerH) continue;
    effectOnly ??= { size, lines };
    if (!flavor) break;
    const flavorSize = Math.max(12, Math.round(size * 0.85 * 2) / 2);
    const flavorLines = layoutParagraphs(flavor, flavorWidth, flavorSize, { style: "italic" }).lines;
    const flavorH = flavorLines.length * flavorSize * FLAVOR_LINE + size * 0.8;
    if (effectH + flavorH <= innerH && flavorLines.length <= 3) {
      chosen = { size, lines, flavorSize, flavorLines };
      break;
    }
    if (size <= 16) break;
  }

  let out = box;
  if (!chosen && !effectOnly) {
    // Even the minimum size overflows: ellipsize.
    const size = 13;
    const { lines } = layoutParagraphs(effect, innerW, size, { rich: true, maxLines: Math.floor(innerH / (size * LINE)) });
    effectOnly = { size, lines };
  }
  const main = chosen ?? effectOnly;
  if (!main) return out;
  const firstBaseline = TEXT_BOX.y + padTop + main.size * 0.92;
  out += main.lines.map((line, k) => renderLine(line, x0, firstBaseline + k * main.size * LINE, main.size, theme)).join("");
  if (chosen) {
    const lh = chosen.flavorSize * FLAVOR_LINE;
    const lastBaseline = TEXT_BOX.y + TEXT_BOX.h - padBottom - chosen.flavorSize * 0.3;
    const firstFlavor = lastBaseline - (chosen.flavorLines.length - 1) * lh;
    const ruleY = firstFlavor - chosen.flavorSize - chosen.size * 0.25;
    out +=
      `<path d="M${n(TEXT_BOX.x + 60)},${n(ruleY)}H${n(TEXT_BOX.x + TEXT_BOX.w - 60)}" stroke="${theme.rule}" stroke-opacity=".6" stroke-width="1.2"/>` +
      `<path d="M${n(TEXT_BOX.x + TEXT_BOX.w / 2)},${n(ruleY - 4)}l4,4l-4,4l-4,-4Z" fill="${theme.rule}"/>` +
      chosen.flavorLines.map((line, k) => renderLine(line, x0 + 12, firstFlavor + k * lh, chosen.flavorSize, theme, SERIF)).join("");
  }
  return out;
}

function footer(card: NarutoCard, printing: CardPrinting, chrome: Chrome): string {
  const hasPower = (card.type === "leader" || card.type === "character") && card.power !== undefined;
  const right = hasPower ? POWER_PLATE.x - 14 : ART.x + ART.w - 50;
  const x0 = TEXT_BOX.x + 8;
  const rarity = RARITY_META[printing.rarity];
  const line1Y = 824;
  const line2Y = 845;
  const number = fitLine(printing.number, 170, 15, 11, true);
  const code = rarity.code;
  const codeWidth = measureText(code, 13, { bold: true, letterSpacing: 1 }) + 12;
  const codeX = x0 + number.width + 10;
  const setX = codeX + codeWidth + 10;
  const variantMark = printing.variant === "alt-art" ? " · ALT ART" : printing.variant === "parallel" ? " · PARALLEL" : "";
  const setLine = fitLine(`${printing.setId}${variantMark}`, Math.max(24, right - setX), 13, 10, false);
  const sampleWidth = measureText("SAMPLE DATA", 9.5, { bold: true, letterSpacing: 1.4 }) + 12;
  const artist = card.artist ? fitLine(`Illus. ${card.artist}`, Math.max(40, right - x0 - sampleWidth - 12), 13, 10, false) : undefined;

  let out =
    `<text x="${x0}" y="${line1Y}" font-size="${number.size}" font-weight="700" fill="#ecebf3"${fitWidth(number.width)}>${escapeXml(number.text)}</text>` +
    `<rect x="${n(codeX)}" y="${line1Y - 14}" width="${n(codeWidth)}" height="19" rx="4" fill="${RARITY_COLOR[printing.rarity]}" fill-opacity=".16" stroke="${RARITY_COLOR[printing.rarity]}" stroke-opacity=".8"/>` +
    `<text x="${n(codeX + 6)}" y="${line1Y}" font-size="13" font-weight="700" letter-spacing="1" fill="${RARITY_COLOR[printing.rarity]}">${escapeXml(code)}</text>` +
    `<text x="${n(setX)}" y="${line1Y}" font-size="${setLine.size}" fill="#a3a3b8"${fitWidth(setLine.width)}>${escapeXml(setLine.text)}</text>` +
    (artist
      ? `<text x="${x0}" y="${line2Y}" font-size="${artist.size}" font-style="italic" fill="#8d8da3"${fitWidth(artist.width)}>${escapeXml(artist.text)}</text>`
      : "") +
    `<rect x="${n(right - sampleWidth)}" y="${line2Y - 12}" width="${n(sampleWidth)}" height="16" rx="3" fill="none" stroke="#8d8da3" stroke-opacity=".6"/>` +
    `<text x="${n(right - sampleWidth + 6)}" y="${line2Y}" font-size="9.5" font-weight="700" letter-spacing="1.4" fill="#8d8da3">SAMPLE DATA</text>`;

  if (hasPower) {
    const { x, y, w, h } = POWER_PLATE;
    const label = card.power === undefined ? "" : String(card.power);
    const size = fitLine(label, w - 40, 32, 18, true);
    out +=
      `<path d="M${x + 16},${y}H${x + w - 6}Q${x + w},${y} ${x + w},${y + 6}V${y + h - 6}Q${x + w},${y + h} ${x + w - 6},${y + h}H${x + 16}L${x},${y + h / 2}Z" fill="#07070c" stroke="${chrome.accent}" stroke-width="2"/>` +
      `<path d="M${x + 19},${y + 4}H${x + w - 8}" stroke="#fff" stroke-opacity=".2"/>` +
      `<text x="${x + 24}" y="${y + 16}" font-size="9.5" font-weight="700" letter-spacing="2" fill="${chrome.accentText}">POWER</text>` +
      `<text x="${x + w - 12}" y="${y + h - 9}" font-size="${size.size}" font-weight="700" text-anchor="end" fill="#fff">${escapeXml(size.text)}</text>`;
  } else {
    out +=
      `<circle cx="${ART.x + ART.w - 22}" cy="826" r="20" fill="#07070c" stroke="${chrome.accent}" stroke-width="2"/>` +
      glyph(card.element, ART.x + ART.w - 22, 826, 24, chrome.accentText);
  }
  return out;
}

function promoStamp(defs: Defs, set: CardSet | undefined): string {
  const foil = defs.linear("promo", [[0, "#fff1b8"], [0.35, "#d9a441"], [0.5, "#fff7d6"], [0.7, "#b98322"], [1, "#ffe9a0"]], [0, 0, 1, 1]);
  const cx = ART.x + ART.w - 52;
  const cy = ART.y + 52;
  const sub = set && set.kind === "promo" ? fitLine(set.shortName.toUpperCase(), 120, 9, 7, true) : undefined;
  // Always clipped to the standard art window, even on full-art printings.
  defs.add(`<clipPath id="stampclip">${rect(ART, 8, "")}</clipPath>`);
  return (
    `<g clip-path="url(#stampclip)"><g transform="rotate(45 ${n(cx)} ${n(cy)})">` +
    `<rect x="${n(cx - 130)}" y="${n(cy - 17)}" width="260" height="34" fill="${foil}" stroke="#6b4a12" stroke-width="1.5"/>` +
    `<text x="${n(cx)}" y="${n(cy + (sub ? 3 : 7))}" font-size="19" font-weight="700" letter-spacing="5" text-anchor="middle" fill="#4a2f05">PROMO</text>` +
    (sub
      ? `<text x="${n(cx)}" y="${n(cy + 13)}" font-size="${sub.size}" font-weight="700" letter-spacing="1.5" text-anchor="middle" fill="#4a2f05">${escapeXml(sub.text)}</text>`
      : "") +
    `</g></g>`
  );
}

/** Foil overlays: rainbow holo lines, gloss sweep and soft glare. */
function foilOverlays(defs: Defs, treatment: Treatment): string {
  let out = "";
  if (treatment.holo) {
    const stops: readonly (readonly [number, string, number])[] =
      treatment.frame === "gold"
        ? [[0, "#fff2b0", 0], [0.25, "#ffd86e", 0.24], [0.5, "#ffffff", 0.1], [0.75, "#e8b84a", 0.24], [1, "#fff2b0", 0]]
        : [[0, "#ff6ec7", 0], [0.2, "#ff6ec7", 0.22], [0.4, "#ffe66e", 0.18], [0.6, "#6effc8", 0.22], [0.8, "#6ec8ff", 0.2], [1, "#b98bff", 0]];
    const holo = defs.linear("holo", stops, [0, 0, 90, 70], ' gradientUnits="userSpaceOnUse" spreadMethod="repeat"');
    out += `<rect width="${ART_WIDTH}" height="${ART_HEIGHT}" rx="29" fill="${holo}" opacity=".42"/>`;
  }
  if (treatment.gloss) {
    const gloss = defs.linear("gloss", [[0.3, "#fff", 0], [0.42, "#fff", 0.16], [0.47, "#fff", 0.04], [0.55, "#fff", 0.13], [0.68, "#fff", 0]], [0, 0, 1, 1]);
    out += `<rect width="${ART_WIDTH}" height="${ART_HEIGHT}" rx="29" fill="${gloss}"/>`;
  } else if (treatment.glare) {
    const glare = defs.linear("glare", [[0.25, "#fff", 0], [0.4, "#fff", 0.1], [0.55, "#fff", 0]], [0, 0, 1, 1]);
    out += rect(ART, 8, `fill="${glare}"`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a premium-looking procedural card face for one printing as a
 * standalone SVG document (630 × 880, i.e. 63 × 88 mm at 10 units/mm).
 */
export function renderCardArtSvg(card: NarutoCard, printing: CardPrinting, set?: CardSet): string {
  const treatment = treatmentFor(printing);
  const element = card.element;
  const hex = ELEMENT_META[element]?.hex ?? "#ff7a1a";
  const accent = treatment.frame === "gold" ? "#e9c46a" : treatment.frame === "rainbow" ? "#f3c9ff" : hex;
  const chrome: Chrome = { hex, accent, accentText: lighten(accent, 0.45), treatment };
  const defs = new Defs();

  const seed = hashString(treatment.alt ? `${card.id}#alt-art` : card.id);
  const rng = new SeededRandom(seed);
  const mood: Mood = treatment.alt ? "ukiyo" : rng.weighted(MOOD_WEIGHTS[element]);
  const ctx: SceneContext = { rng, element, hex, palette: buildPalette(mood, hex), defs, card };

  const artBox = treatment.fullArt ? PANEL : ART;
  const focus: Box = treatment.fullArt ? { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: TYPE_LINE.y - PANEL.y } : ART;
  defs.add(`<clipPath id="artclip">${rect(artBox, treatment.fullArt ? 13 : 8, "")}</clipPath>`);
  defs.add(`<clipPath id="cardclip"><rect width="${ART_WIDTH}" height="${ART_HEIGHT}" rx="29"/></clipPath>`);

  const illustration = `<g clip-path="url(#artclip)">${renderIllustration(ctx, artBox, focus, treatment.fullArt)}</g>`;
  const artBorder = treatment.fullArt
    ? ""
    : rect(ART, 8, `fill="none" stroke="#000" stroke-opacity=".8" stroke-width="3"`) +
      rect({ x: ART.x + 2, y: ART.y + 2, w: ART.w - 4, h: ART.h - 4 }, 6, `fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="1.5"`);

  const body = [
    frameMarkup(defs, chrome),
    illustration,
    artBorder,
    cornerOrnaments(chrome),
    keywordStrip(card, chrome, ART.y + ART.h),
    treatment.promo ? promoStamp(defs, set) : "",
    nameBanner(defs, card, chrome),
    costOrb(defs, card, chrome),
    typeLine(card, printing, chrome),
    rulesBox(defs, card, chrome),
    footer(card, printing, chrome),
    `<g clip-path="url(#cardclip)">${foilOverlays(defs, treatment)}</g>`,
  ].join("");

  const titleText = `${card.name}${card.title ? ` — ${card.title}` : ""} (${printing.number})`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}" width="${ART_WIDTH}" height="${ART_HEIGHT}" ` +
    `font-family="${SANS}" role="img" aria-label="${escapeXml(titleText)}">` +
    `<title>${escapeXml(titleText)}</title>${defs.toString()}${body}</svg>`
  );
}
