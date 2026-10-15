/** Text normalization and fuzzy matching shared by the ingestion resolvers. */

/** Letters that Unicode decomposition does not reduce to ASCII. */
const FOLDS: Record<string, string> = {
  ß: "ss", æ: "ae", Æ: "AE", ø: "o", Ø: "O", œ: "oe", Œ: "OE", ł: "l", Ł: "L", đ: "d", Đ: "D", ð: "d", þ: "th", ı: "i",
};

/**
 * Strips Latin diacritics ("Zoë" → "Zoe", "Søren" → "Soren"); other characters are kept, and
 * marks from other scripts (Japanese voicing marks) are recomposed.
 */
export function foldDiacritics(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/[ßæÆøØœŒłŁđĐðþı]/g, (ch) => FOLDS[ch] ?? ch);
}

/**
 * Comparison key for names: lowercase, no diacritics, "&" read as "and", apostrophes dropped,
 * every other run of punctuation, dashes or whitespace collapsed to one space.
 * "Pain — Deva Path" → "pain deva path"; "Fukasaku & Shima" → "fukasaku and shima".
 */
export function normalizeName(input: string): string {
  return foldDiacritics(input)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Longest text fuzzy matching compares. No player, card or deck name comes close; longer text is
 * only ever matched exactly, which keeps the quadratic edit distance cheap.
 */
export const MAX_FUZZY_LENGTH = 64;

/** Row buffers reused by {@link levenshtein}; fuzzy matching calls it many times on short strings. */
let rowA = new Uint32Array(64);
let rowB = new Uint32Array(64);

/**
 * Edit distance (insertions, deletions, substitutions). With `maxDistance`, stops as soon as the
 * distance is known to exceed it and returns `maxDistance + 1`.
 */
export function levenshtein(a: string, b: string, maxDistance = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0;
  // Rows run over the shorter string.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > maxDistance) return maxDistance + 1;
  if (short.length === 0) return long.length;
  if (rowA.length <= short.length) {
    rowA = new Uint32Array(short.length + 1);
    rowB = new Uint32Array(short.length + 1);
  }
  let prev = rowA;
  let curr = rowB;
  for (let j = 0; j <= short.length; j++) prev[j] = j;
  for (let i = 1; i <= long.length; i++) {
    const ch = long.charCodeAt(i - 1);
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= short.length; j++) {
      const cost = short.charCodeAt(j - 1) === ch ? 0 : 1;
      const value = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[short.length]!;
}

/**
 * 1 − distance / longer length, on the raw strings: 1 for equal, 0 for nothing in common. With
 * `minScore`, the work stops once the score is known to be below it, and some score below
 * `minScore` is returned.
 */
export function similarity(a: string, b: string, minScore = 0): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  const maxDistance = minScore > 0 ? Math.floor((1 - minScore) * longest + 1e-9) : Number.POSITIVE_INFINITY;
  return 1 - levenshtein(a, b, maxDistance) / longest;
}

/** Highest similarity two strings of these lengths can reach: shorter / longer. */
export function similarityBound(aLength: number, bLength: number): number {
  const longest = Math.max(aLength, bLength);
  return longest === 0 ? 1 : Math.min(aLength, bLength) / longest;
}

export interface ClosestMatches<T> {
  best: { candidate: T; score: number } | null;
  /** The best of the other candidates (it may tie with `best`). */
  runnerUp: { candidate: T; score: number } | null;
}

/**
 * Best and runner-up for an already normalized `query` among candidates with precomputed
 * normalized keys, in one pass. Only scores of at least `floor` are computed exactly; candidates
 * that cannot reach it (by length alone, or once the edit distance passes it) are skipped, as is
 * everything when the query is longer than {@link MAX_FUZZY_LENGTH}.
 */
export function closestMatches<T>(
  query: string,
  candidates: ReadonlyArray<{ candidate: T; key: string }>,
  floor = 0,
): ClosestMatches<T> {
  let best: ClosestMatches<T>["best"] = null;
  let runnerUp: ClosestMatches<T>["runnerUp"] = null;
  if (query.length > MAX_FUZZY_LENGTH) return { best, runnerUp };
  for (const { candidate, key } of candidates) {
    if (key.length > MAX_FUZZY_LENGTH) continue;
    // Only scores above the runner-up's (and at least the floor) can change the outcome.
    const needed = Math.max(floor, runnerUp ? runnerUp.score : 0);
    if (similarityBound(query.length, key.length) < needed) continue;
    const score = similarity(query, key, needed);
    if (score < floor) continue;
    if (!best || score > best.score) {
      runnerUp = best;
      best = { candidate, score };
    } else if (!runnerUp || score > runnerUp.score) {
      runnerUp = { candidate, score };
    }
  }
  return { best, runnerUp };
}

/** Best match for `query` among `candidates` by {@link similarity} of normalized names. */
export function closestMatch<T>(
  query: string,
  candidates: readonly T[],
  label: (candidate: T) => string,
): { candidate: T; score: number } | null {
  return closestMatches(
    normalizeName(query),
    candidates.map((candidate) => ({ candidate, key: normalizeName(label(candidate)) })),
  ).best;
}

/**
 * C0 and C1 control characters (tab, line feed and carriage return excepted) and the bidi
 * overrides and isolates, which can hide or reorder text in a terminal or on a page.
 */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

/** `text` without control characters (see {@link CONTROL_CHARACTERS}); tabs and line breaks are kept. */
export function stripControlCharacters(text: string): string {
  return text.replace(CONTROL_CHARACTERS, "");
}

/** Nesting below which {@link stripControlCharactersDeep} leaves values alone; parsed records are far shallower. */
const MAX_CLEAN_DEPTH = 16;

/**
 * `value` with {@link stripControlCharacters} applied to every string in it (arrays and plain
 * objects are copied, never mutated), and whether anything changed. Meant for records a schema
 * has already parsed, so it only meets the fields the importer reads.
 */
export function stripControlCharactersDeep<T>(value: T): { value: T; changed: boolean } {
  let changed = false;
  const visit = (item: unknown, depth: number): unknown => {
    if (typeof item === "string") {
      const clean = stripControlCharacters(item);
      if (clean !== item) changed = true;
      return clean;
    }
    if (depth >= MAX_CLEAN_DEPTH || typeof item !== "object" || item === null) return item;
    if (Array.isArray(item)) return item.map((entry) => visit(entry, depth + 1));
    return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, visit(entry, depth + 1)]));
  };
  const cleaned = visit(value, 0) as T;
  return { value: changed ? cleaned : value, changed };
}

/** `text` cut to `max` characters with an ellipsis, for quoting user input in messages. */
export function clip(text: string, max = 80): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Reads unambiguous date spellings into YYYY-MM-DD: ISO dates and timestamps, "2026/09/12",
 * "2026.09.12", "September 12, 2026", "Sep 12 2026" and "12 September 2026". Numeric
 * day/month orders ("09/12/2026") are ambiguous and return null, as does anything invalid.
 */
export function normalizeDate(raw: string): string | null {
  const text = raw.trim();
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/);
  const named =
    text.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i) ??
    text.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/i);
  let parts: [string, number, number] | null = null;
  if (iso) parts = [iso[1]!, Number(iso[2]), Number(iso[3])];
  else if (named) {
    const [monthName, day] = /^\d/.test(named[1]!) ? [named[2]!, named[1]!] : [named[1]!, named[2]!];
    const month = MONTHS.indexOf(monthName.slice(0, 3).toLowerCase()) + 1;
    if (month > 0) parts = [named[3]!, month, Number(day)];
  }
  if (!parts) return null;
  const value = `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
  return isIsoDate(value) ? value : null;
}
