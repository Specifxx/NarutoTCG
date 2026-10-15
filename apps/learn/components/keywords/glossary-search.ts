import { KEYWORD_CATEGORIES, KEYWORDS, type KeywordCategory, type KeywordEntry } from "@/content/keywords";

/**
 * Glossary search: forgiving, ranked matching over term, aliases, tooltip
 * text, the full ruling and the example. Pure functions so results are the
 * same on the server and the client.
 */

export type Range = readonly [start: number, end: number];
export type CategoryFilter = KeywordCategory | "all";
export type MatchField = "term" | "alias" | "short" | "long" | "example" | "category" | "fuzzy";

export interface SearchResult {
  entry: KeywordEntry;
  index: number;
  score: number;
  /** Fields where at least one query token matched. */
  fields: ReadonlySet<MatchField>;
  /** Term highlight ranges for typo-tolerant matches (substring matches are highlighted directly). */
  fuzzyRanges: Range[];
  /** First alias that matched, shown as "also: …" on the result. */
  matchedAlias: string | null;
}

export const KEYWORD_IDS: ReadonlySet<string> = new Set(KEYWORDS.map((k) => k.id));
const BY_ID = new Map(KEYWORDS.map((k) => [k.id, k] as const));
export const getEntry = (id: string): KeywordEntry | undefined => BY_ID.get(id);

export const OFFICIAL_COUNT = KEYWORDS.filter((k) => k.source.kind === "official").length;
export const PLATFORM_COUNT = KEYWORDS.length - OFFICIAL_COUNT;

export const CATEGORY_TOTALS: Readonly<Record<KeywordCategory, number>> = Object.fromEntries(
  KEYWORD_CATEGORIES.map((c) => [c.id, KEYWORDS.filter((k) => k.category === c.id).length]),
) as Record<KeywordCategory, number>;

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** Splits a query into lower-case tokens, trimming stray punctuation (but keeping "+" for CHAKRA +X). */
export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}+]+|[^\p{L}\p{N}+]+$/gu, ""))
    .filter(Boolean);
}

function isWordStart(text: string, index: number): boolean {
  return index === 0 || !WORD_CHAR.test(text[index - 1] ?? "");
}

function atWordStart(text: string, token: string): boolean {
  let i = text.indexOf(token);
  while (i !== -1) {
    if (isWordStart(text, i)) return true;
    i = text.indexOf(token, i + 1);
  }
  return false;
}

/** Substring test; very short tokens must start a word so "a" doesn't match everything. */
function contains(text: string, token: string): boolean {
  return token.length <= 2 ? atWordStart(text, token) : text.includes(token);
}

/** Optimal string alignment distance (Levenshtein + adjacent transpositions). */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i]![0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2]![j - 2]! + 1);
      rows[i]![j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return rows[a.length]![b.length]!;
}

interface Word {
  text: string;
  start: number;
}

function words(text: string): Word[] {
  const out: Word[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}+]+/gu)) out.push({ text: m[0], start: m.index ?? 0 });
  return out;
}

interface Haystack {
  id: string;
  term: string;
  termWords: Word[];
  aliases: string[];
  short: string;
  long: string;
  example: string;
  category: string;
}

const HAYSTACKS: Haystack[] = KEYWORDS.map((k) => {
  const term = k.term.toLowerCase();
  return {
    id: k.id,
    term,
    termWords: words(term),
    aliases: k.aliases.map((a) => a.toLowerCase()),
    short: k.short.toLowerCase(),
    long: k.long.toLowerCase(),
    example: k.example ? `${k.example.card} ${k.example.text}`.toLowerCase() : "",
    category: (KEYWORD_CATEGORIES.find((c) => c.id === k.category)?.label ?? k.category).toLowerCase(),
  };
});

interface TokenMatch {
  score: number;
  field: MatchField;
  alias?: string;
  ranges?: Range[];
}

const allowedTypos = (len: number) => (len >= 7 ? 2 : len >= 4 ? 1 : 0);

/** Typo-tolerant match against the term's words, the whole term and the aliases. */
function fuzzyMatch(h: Haystack, token: string): TokenMatch | null {
  const typos = allowedTypos(token.length);
  if (typos === 0) return null;
  const compact = h.term.replace(/[^\p{L}\p{N}+]/gu, "");
  if (editDistance(token, compact, typos) <= typos) {
    const first = h.termWords[0];
    const last = h.termWords[h.termWords.length - 1];
    return { score: 36, field: "fuzzy", ranges: first && last ? [[first.start, last.start + last.text.length]] : [] };
  }
  for (const w of h.termWords) {
    const whole = editDistance(token, w.text, typos) <= typos;
    const prefix = w.text.length > token.length && editDistance(token, w.text.slice(0, token.length), 1) <= 1;
    if (whole || prefix) return { score: whole ? 34 : 26, field: "fuzzy", ranges: [[w.start, w.start + w.text.length]] };
  }
  for (const a of h.aliases) {
    for (const w of words(a)) {
      if (editDistance(token, w.text, typos) <= typos) return { score: 24, field: "fuzzy", alias: a };
    }
  }
  return null;
}

function scoreToken(h: Haystack, token: string): TokenMatch | null {
  if (h.term === token || h.id === token) return { score: 120, field: "term" };
  if (h.term.startsWith(token)) return { score: 95, field: "term" };
  if (atWordStart(h.term, token)) return { score: 80, field: "term" };
  if (token.length > 2 && (h.term.includes(token) || h.id.includes(token))) return { score: 62, field: "term" };
  const exactAlias = h.aliases.find((a) => a === token);
  if (exactAlias) return { score: 76, field: "alias", alias: exactAlias };
  const prefixAlias = h.aliases.find((a) => atWordStart(a, token));
  if (prefixAlias) return { score: 58, field: "alias", alias: prefixAlias };
  if (token.length > 2) {
    const innerAlias = h.aliases.find((a) => a.includes(token));
    if (innerAlias) return { score: 44, field: "alias", alias: innerAlias };
  }
  if (contains(h.short, token)) return { score: atWordStart(h.short, token) ? 32 : 24, field: "short" };
  if (h.example && contains(h.example, token)) return { score: atWordStart(h.example, token) ? 20 : 14, field: "example" };
  if (contains(h.long, token)) return { score: atWordStart(h.long, token) ? 16 : 10, field: "long" };
  if (contains(h.category, token)) return { score: 8, field: "category" };
  return fuzzyMatch(h, token);
}

/** Ranks every keyword against the query. An empty query returns all terms in their authored order. */
export function searchKeywords(query: string): SearchResult[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return KEYWORDS.map((entry, index) => ({
      entry,
      index,
      score: 0,
      fields: new Set<MatchField>(),
      fuzzyRanges: [],
      matchedAlias: null,
    }));
  }
  const phrase = tokens.join(" ");
  const out: SearchResult[] = [];
  HAYSTACKS.forEach((h, index) => {
    let score = 0;
    const fields = new Set<MatchField>();
    const fuzzyRanges: Range[] = [];
    let matchedAlias: string | null = null;
    for (const token of tokens) {
      const m = scoreToken(h, token);
      if (!m) return;
      score += m.score;
      fields.add(m.field);
      if (m.ranges) fuzzyRanges.push(...m.ranges);
      if (m.alias && !matchedAlias) matchedAlias = m.alias;
    }
    if (tokens.length > 1) {
      if (h.term.includes(phrase)) score += 40;
      else if (h.short.includes(phrase)) score += 20;
    }
    out.push({ entry: KEYWORDS[index]!, index, score, fields, fuzzyRanges: mergeRanges(fuzzyRanges), matchedAlias });
  });
  return out.sort((a, b) => b.score - a.score || a.index - b.index);
}

/** Closest term to a query that found nothing, for "Did you mean …?". */
export function suggestTerm(query: string): KeywordEntry | null {
  const q = query.toLowerCase().replace(/[^\p{L}\p{N}+]/gu, "");
  if (q.length < 3) return null;
  let best: { entry: KeywordEntry; d: number } | null = null;
  for (const k of KEYWORDS) {
    for (const candidate of [k.term, k.id, ...k.aliases]) {
      const c = candidate.toLowerCase().replace(/[^\p{L}\p{N}+]/gu, "");
      const d = Math.min(editDistance(q, c, 4), c.startsWith(q.slice(0, 3)) ? editDistance(q, c.slice(0, q.length), 4) + 1 : 99);
      if (!best || d < best.d) best = { entry: k, d };
    }
  }
  return best && best.d <= Math.max(2, Math.floor(q.length / 3)) ? best.entry : null;
}

export function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/** Case-insensitive ranges of every token occurrence in `text`. */
export function findRanges(text: string, tokens: readonly string[]): Range[] {
  if (tokens.length === 0) return [];
  const lower = text.toLowerCase();
  const ranges: Range[] = [];
  for (const t of tokens) {
    let i = lower.indexOf(t);
    while (i !== -1) {
      if (t.length > 2 || isWordStart(lower, i)) ranges.push([i, i + t.length]);
      i = lower.indexOf(t, i + t.length);
    }
  }
  return mergeRanges(ranges);
}

/** A short excerpt of `text` around the first token match, snapped to word boundaries. */
export function snippetAround(text: string, tokens: readonly string[], radius = 52): string | null {
  const ranges = findRanges(text, tokens);
  const first = ranges[0]?.[0];
  if (first === undefined) return null;
  let start = Math.max(0, first - radius);
  let end = Math.min(text.length, first + radius * 2);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < first) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > first) end = space;
  }
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

export function countByCategory(results: readonly SearchResult[]): Record<KeywordCategory, number> {
  const counts = Object.fromEntries(KEYWORD_CATEGORIES.map((c) => [c.id, 0])) as Record<KeywordCategory, number>;
  for (const r of results) counts[r.entry.category] += 1;
  return counts;
}

/* ------------------------------------------------------------------------- */
/* Card text: upper-case card keywords become tooltip chips.                  */
/* ------------------------------------------------------------------------- */

export type CardTextSegment = { kind: "text"; text: string } | { kind: "keyword"; id: string; label: string };

const LABEL_TO_ID: Record<string, string> = {
  ambush: "ambush",
  main: "main",
  upgrade: "upgrade",
  score: "score",
  "first strike": "first-strike",
  powerup: "powerup",
  duel: "duel",
  exhaust: "exhaust",
  "printed power": "printed-power",
  defeat: "defeat",
  hide: "hide",
  friendly: "friendly",
  "mission point": "mission-points",
  "mission points": "mission-points",
};

const CARD_KEYWORDS = /CHAKRA \+(?:X|\d+)|\b(?:FIRST STRIKE|PRINTED POWER|AMBUSH|MAIN|UPGRADE|SCORE|POWERUP|DUEL|EXHAUST)\b/g;
const CARD_KEYWORDS_AND_ACTIONS =
  /CHAKRA \+(?:X|\d+)|\b(?:FIRST STRIKE|PRINTED POWER|AMBUSH|MAIN|UPGRADE|SCORE|POWERUP|DUEL|EXHAUST|Defeat|Hide|Exhaust|friendly|Mission points?)\b/g;

/**
 * Splits rules text into plain text and keyword segments. Upper-case card
 * keywords are always linked; with `actions`, sentence-case effect verbs on
 * example cards (Defeat, Hide, …) are linked too.
 */
export function segmentCardText(text: string, { actions = false }: { actions?: boolean } = {}): CardTextSegment[] {
  const re = new RegExp(actions ? CARD_KEYWORDS_AND_ACTIONS : CARD_KEYWORDS);
  const out: CardTextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const index = m.index ?? 0;
    const label = m[0];
    const id = label.startsWith("CHAKRA +") ? "chakra-x" : LABEL_TO_ID[label.toLowerCase()];
    if (!id) continue;
    if (index > last) out.push({ kind: "text", text: text.slice(last, index) });
    out.push({ kind: "keyword", id, label });
    last = index + label.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export type ExampleTrigger = "MAIN" | "AMBUSH" | "UPGRADE" | "FIRST_STRIKE" | "SCORE";

/** Pulls a leading "AMBUSH:" style trigger off an example's text. */
export function splitTrigger(text: string): { trigger: ExampleTrigger | null; rest: string } {
  const m = /^(AMBUSH|MAIN|UPGRADE|SCORE|FIRST STRIKE):\s*/.exec(text);
  if (!m) return { trigger: null, rest: text };
  const trigger = (m[1] === "FIRST STRIKE" ? "FIRST_STRIKE" : m[1]) as ExampleTrigger;
  return { trigger, rest: text.slice(m[0].length) };
}
