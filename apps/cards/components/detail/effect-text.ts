// Pure parser for card rules text. It turns the authored notation into tokens
// the UI can style without ever injecting HTML:
//   [On Play]          timing tag (TIMING_TAGS, or a tag-shaped phrase)
//   [Rush]             granted / referenced keyword (KEYWORD_GLOSSARY or the card's own keywords)
//   {Team 7}           trait reference
//   [Naruto Uzumaki]   card-name reference (anything else in square brackets)
import { KEYWORD_GLOSSARY, TIMING_TAGS } from "@/lib/keywords";

/** Visual family for a timing tag; drives the pill color. */
export type TagTone = "timing" | "counter" | "trigger" | "limit" | "turn";

export type EffectToken =
  | { kind: "text"; text: string }
  | { kind: "tag"; label: string; tone: TagTone }
  | { kind: "keyword"; label: string; reminder?: string }
  | { kind: "trait"; label: string }
  | { kind: "card"; name: string };

export interface EffectParseOptions {
  /** Extra keyword names to recognise (e.g. the card's own keywords, which may be newer than the glossary). */
  keywords?: Iterable<string>;
  /** Known card names; a bracketed phrase that matches one is always treated as a card reference. */
  cardNames?: Iterable<string>;
}

const fold = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

const TIMING_BY_FOLD = new Map<string, string>(TIMING_TAGS.map((tag) => [fold(tag), tag]));
const GLOSSARY_BY_FOLD = new Map<string, string>(Object.keys(KEYWORD_GLOSSARY).map((kw) => [fold(kw), kw]));

const TONE_BY_TAG: Readonly<Record<string, TagTone>> = {
  counter: "counter",
  trigger: "trigger",
  "once per turn": "limit",
  "your turn": "turn",
  "opponent's turn": "turn",
  "end of your turn": "turn",
};

/**
 * Bracketed phrases that read like timing/condition tags even though they are
 * not in TIMING_TAGS yet ("[Activate: Battle]", "[Start of Your Turn]",
 * "[Once Per Game]"). Word boundaries keep names such as "Onoki" out.
 */
const TAG_SHAPE = /^(?:on|when|whenever|activate|once|start of|end of|your|opponent's|during|main|battle)\b/i;

/** Matches one `[...]` or `{...}` group on a single line. */
const TOKEN_PATTERN = /\[([^[\]\n]+)\]|\{([^{}\n]+)\}/g;

function toneFor(label: string): TagTone {
  return TONE_BY_TAG[fold(label)] ?? (/^once\b/i.test(label) ? "limit" : "timing");
}

function pushText(tokens: EffectToken[], text: string): void {
  if (text === "") return;
  const last = tokens[tokens.length - 1];
  if (last?.kind === "text") last.text += text;
  else tokens.push({ kind: "text", text });
}

function classifyBracket(
  raw: string,
  keywords: ReadonlyMap<string, string>,
  cardNames: ReadonlySet<string>,
): EffectToken {
  const label = raw.trim().replace(/\s+/g, " ");
  const key = fold(label);
  const timing = TIMING_BY_FOLD.get(key);
  if (timing !== undefined) return { kind: "tag", label: timing, tone: toneFor(timing) };
  const keyword = keywords.get(key);
  if (keyword !== undefined) {
    const reminder = KEYWORD_GLOSSARY[keyword];
    return reminder === undefined ? { kind: "keyword", label: keyword } : { kind: "keyword", label: keyword, reminder };
  }
  if (cardNames.has(key)) return { kind: "card", name: label };
  if (TAG_SHAPE.test(label)) return { kind: "tag", label, tone: toneFor(label) };
  return { kind: "card", name: label };
}

function buildKeywordIndex(extra: Iterable<string> | undefined): Map<string, string> {
  const index = new Map(GLOSSARY_BY_FOLD);
  for (const keyword of extra ?? []) {
    const key = fold(keyword);
    if (key !== "" && !index.has(key)) index.set(key, keyword.trim().replace(/\s+/g, " "));
  }
  return index;
}

function parseWithIndex(
  line: string,
  keywords: ReadonlyMap<string, string>,
  cardNames: ReadonlySet<string>,
): EffectToken[] {
  const tokens: EffectToken[] = [];
  let cursor = 0;
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const start = match.index;
    pushText(tokens, line.slice(cursor, start));
    cursor = start + match[0].length;
    const bracket = match[1];
    const brace = match[2];
    const inner = (bracket ?? brace ?? "").trim();
    if (inner === "") {
      // "[ ]" or "{ }" carry no meaning; keep them verbatim.
      pushText(tokens, match[0]);
    } else if (bracket !== undefined) {
      tokens.push(classifyBracket(bracket, keywords, cardNames));
    } else {
      tokens.push({ kind: "trait", label: inner.replace(/\s+/g, " ") });
    }
  }
  pushText(tokens, line.slice(cursor));
  return tokens;
}

/** Parse a single line of rules text (no newlines) into tokens. */
export function parseEffectLine(line: string, options: EffectParseOptions = {}): EffectToken[] {
  return parseWithIndex(line, buildKeywordIndex(options.keywords), new Set([...(options.cardNames ?? [])].map(fold)));
}

/**
 * Parse full rules text into paragraphs of tokens. Each authored line becomes
 * one paragraph; blank lines are dropped. Returns `[]` for vanilla cards.
 */
export function parseEffectText(text: string, options: EffectParseOptions = {}): EffectToken[][] {
  const keywords = buildKeywordIndex(options.keywords);
  const cardNames = new Set([...(options.cardNames ?? [])].map(fold));
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => parseWithIndex(line, keywords, cardNames));
}

/** Keywords mentioned in the parsed text, in first-seen order, without duplicates. */
export function referencedKeywords(paragraphs: readonly (readonly EffectToken[])[]): string[] {
  const seen = new Set<string>();
  for (const tokens of paragraphs) {
    for (const token of tokens) if (token.kind === "keyword") seen.add(token.label);
  }
  return [...seen];
}

/** Collapse rules text into a single plain sentence, e.g. for meta descriptions. */
export function effectSummary(text: string, maxLength = 180): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

/** Stable, URL-fragment-safe id for a keyword's glossary entry. */
export function keywordAnchorId(keyword: string): string {
  const slug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `keyword-${slug || "unnamed"}`;
}
