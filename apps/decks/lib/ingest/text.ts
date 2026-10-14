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

/** Edit distance (insertions, deletions, substitutions). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost));
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/** 1 − distance / longer length, on the raw strings: 1 for equal, 0 for nothing in common. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
}

/** Best match for `query` among `candidates` by {@link similarity} of normalized names. */
export function closestMatch<T>(
  query: string,
  candidates: readonly T[],
  label: (candidate: T) => string,
): { candidate: T; score: number } | null {
  const q = normalizeName(query);
  let best: { candidate: T; score: number } | null = null;
  for (const candidate of candidates) {
    const score = similarity(q, normalizeName(label(candidate)));
    if (!best || score > best.score) best = { candidate, score };
  }
  return best;
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
