import type { CardType, Decklist } from "@naruto-tcg/types";
import { CARD_INDEX } from "@/lib/data/cards";
import { RULES } from "@/lib/rules";
import { cardLabel, describeSuggestions, resolveCard, type CardResolver } from "./cards";
import { clip, normalizeName } from "./text";
import type { IngestIssue, IngestSource } from "./types";

/** A card type section, or `"main"` for a generic "Main Deck" header. */
export type DeckSection = CardType | "main";

export interface DecklistLine {
  /** Null when the line gave no quantity; NaN when it gave an unreadable one. */
  quantity: number | null;
  /** Card text: a name, an id, or both ("Konan (NT02-009)"). */
  card: string;
  /** Section the line sits under; disambiguates names shared by several cards. */
  section?: DeckSection;
  /** An explicit "Leader: …" line. */
  leader?: boolean;
  /** Issue row, when lines come from separate CSV rows. */
  row?: number;
}

/** Where a list came from, attached to every issue it produces. */
export interface DecklistContext {
  source?: IngestSource;
  row?: number;
  field?: string;
  /** Prefixes messages, e.g. the pilot's name. */
  owner?: string;
  /** Shared by the lists of one import (see `createCardResolver`); plain `resolveCard` otherwise. */
  resolver?: CardResolver;
}

export interface DecklistParseResult {
  /** Null when there were no card lines or no Leader. */
  decklist: Decklist | null;
  issues: IngestIssue[];
}

const SECTIONS = new Map<string, DeckSection>(Object.entries({
  leader: "leader", leaders: "leader",
  character: "character", characters: "character", ninja: "character",
  jutsu: "jutsu", jutsus: "jutsu",
  mission: "mission", missions: "mission",
  item: "item", items: "item",
  event: "event", events: "event",
  main: "main", deck: "main", "main deck": "main",
} satisfies Record<string, DeckSection>));

/** Section for a header line or a CSV section cell ("Characters (24)", "Jutsu:", "Main Deck: 50 cards"), else null. */
export function parseSection(text: string): DeckSection | null {
  return SECTIONS.get(normalizeName(text.replace(/\d+|\bcards?\b/gi, " "))) ?? null;
}

/** "4", "4x", "x4" → 4; blank → null; anything else → NaN. */
export function parseQuantity(raw: string | undefined): number | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const match = text.match(/^[x×]?\s*(\d+)\s*[x×]?$/i);
  return match ? Number(match[1]) : Number.NaN;
}

// Anchored, and written so that no whitespace run can be split between two quantifiers before a
// match fails: a long line costs linear time, never quadratic.
const LEADER_LINE = /^leaders?\s*(?:\(\s*\d+\s*\)\s*)?[:=\-–—]\s*(.+)$/i;
const QUANTITY_FIRST = /^(\d+)\s*(?:[x×](?=\s))?\s*(.+)$/i;
const QUANTITY_LAST = /^(.*?\S)\s*(?:[x×]\s*(\d+)|\(\s*[x×]?\s*(\d+)\s*\))$/i;
const SKIPPED_LINE = /^(?:\/\/|#)|^total\b|^\d+\s+cards?$/i;
/** Start of a trailing `//` comment: whitespace then `//` (so "https://…" is not one). */
const COMMENT_START = /\s\/\//;

/** The line without a trailing `// comment`. */
function stripTrailingComment(line: string): string {
  const start = line.search(COMMENT_START);
  return start >= 0 ? line.slice(0, start) : line;
}

/** "4 Konan", "4x Konan", "Konan x4" or "Konan (4)" → card text and quantity; null quantity when none is given. */
function splitQuantity(text: string): Pick<DecklistLine, "quantity" | "card"> {
  const first = text.match(QUANTITY_FIRST);
  if (first) return { quantity: Number(first[1]), card: first[2]! };
  const last = text.match(QUANTITY_LAST);
  return last ? { quantity: Number(last[2] ?? last[3]), card: last[1]! } : { quantity: null, card: text };
}

/**
 * Parses a pasted or exported list. Accepts "4 Konan", "4x Konan", "Konan x4", "4 NT02-009",
 * "4 Konan (NT02-009)", "Leader: Pain — Deva Path" (optionally with a quantity), a Leader listed
 * like any other card, section headers ("Characters (24)", "Jutsu:"), `//` and `#` comment lines,
 * trailing `//` comments, blank lines, and single-line lists separated by `;` or `|`. See
 * {@link buildDecklist} for resolution rules.
 */
export function parseDecklistText(text: string, context: DecklistContext = {}): DecklistParseResult {
  const lines: DecklistLine[] = [];
  let section: DeckSection | undefined;
  for (const raw of text.split(/\r?\n|[;|]/)) {
    const line = stripTrailingComment(raw).trim();
    if (!line || SKIPPED_LINE.test(line)) continue;
    const leader = line.match(LEADER_LINE);
    if (leader) {
      const { quantity, card } = splitQuantity(leader[1]!);
      lines.push({ quantity: quantity ?? 1, card, leader: true });
      continue;
    }
    if (!QUANTITY_FIRST.test(line)) {
      const header = parseSection(line);
      if (header) {
        section = header;
        continue;
      }
    }
    lines.push({ ...splitQuantity(line), section });
  }
  return buildDecklist(lines, context);
}

/**
 * Resolves lines into a {@link Decklist}. The Leader is the card on a "Leader:" line or any
 * line that resolves to a Leader card; duplicate entries are merged and cards are sorted by id.
 * Unknown cards are errors (with suggestions), typo corrections and ambiguous names are
 * warnings naming the card used. Lists with card lines but no Leader return null with an error.
 */
export function buildDecklist(lines: readonly DecklistLine[], context: DecklistContext = {}): DecklistParseResult {
  const issues: IngestIssue[] = [];
  const prefix = context.owner ? `${context.owner}: ` : "";
  const report = (line: DecklistLine, issue: Omit<IngestIssue, "source" | "row" | "field">) =>
    issues.push({ ...issue, source: context.source, row: line.row ?? context.row, field: context.field });

  let leaderId: string | null = null;
  const copies = new Map<string, number>();
  for (const line of lines) {
    const wantsLeader = line.leader === true || line.section === "leader";
    const preferType = wantsLeader ? "leader" : line.section === "main" ? undefined : line.section;
    const resolution = context.resolver ? context.resolver(line.card, preferType) : resolveCard(line.card, { preferType });
    if (!resolution.cardId) {
      const alternatives = describeSuggestions(resolution.suggestions);
      report(line, {
        severity: "error",
        code: "unknown-card",
        message: `${prefix}unknown card "${clip(line.card)}".`,
        suggestion: alternatives ? `Did you mean ${alternatives}?` : "Check the spelling or use the card id, e.g. NT02-009.",
      });
      continue;
    }
    const card = CARD_INDEX.get(resolution.cardId)!;
    if (resolution.method === "fuzzy") {
      report(line, {
        severity: "warning",
        code: "card-fuzzy-match",
        message: `${prefix}read "${clip(line.card)}" as ${cardLabel(card.id)}.`,
        suggestion: resolution.suggestions.length > 0 ? `Other close matches: ${describeSuggestions(resolution.suggestions)}.` : undefined,
      });
    } else if (resolution.confidence < 0.8) {
      report(line, {
        severity: "warning",
        code: "card-ambiguous",
        message: `${prefix}"${clip(line.card)}" matches several cards; used ${cardLabel(card.id)}.`,
        suggestion: `Add the card id to pick ${describeSuggestions(resolution.suggestions)} instead.`,
      });
    }

    if (card.type === "leader") {
      if (leaderId !== null && leaderId !== card.id) {
        report(line, {
          severity: "error",
          code: "multiple-leaders",
          message: `${prefix}more than one Leader (${cardLabel(leaderId)} and ${cardLabel(card.id)}); kept the first.`,
        });
      } else {
        leaderId = card.id;
        if (line.quantity !== null && line.quantity !== 1) {
          report(line, { severity: "warning", code: "leader-quantity", message: `${prefix}${card.name} is the Leader; quantity ${line.quantity} ignored.` });
        }
      }
      continue;
    }
    if (line.leader) {
      report(line, { severity: "error", code: "not-a-leader", message: `${prefix}${cardLabel(card.id)} is not a Leader card.` });
      continue;
    }

    let quantity = line.quantity;
    if (quantity === null) {
      report(line, { severity: "warning", code: "missing-quantity", message: `${prefix}no quantity for ${card.name}; counted 1 copy.` });
      quantity = 1;
    } else if (!Number.isInteger(quantity) || quantity < 1) {
      report(line, { severity: "warning", code: "invalid-quantity", message: `${prefix}invalid quantity for ${card.name}; line skipped.` });
      continue;
    } else if (quantity > RULES.mainDeckSize) {
      report(line, {
        severity: "error",
        code: "invalid-quantity",
        message: `${prefix}${quantity} copies of ${card.name} is more than a whole ${RULES.mainDeckSize}-card main deck; line skipped.`,
        suggestion: "Check that the Quantity column holds card counts.",
      });
      continue;
    }
    copies.set(card.id, (copies.get(card.id) ?? 0) + quantity);
  }

  if (leaderId === null) {
    if (lines.length > 0) {
      issues.push({
        severity: "error",
        code: "missing-leader",
        message: `${prefix}the decklist has no Leader.`,
        source: context.source,
        row: context.row,
        field: context.field,
        suggestion: 'Add a line such as "Leader: Pain — Deva Path".',
      });
    }
    return { decklist: null, issues };
  }
  const cards = [...copies]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cardId, quantity]) => ({ cardId, quantity }));
  return { decklist: { leaderId, cards }, issues };
}
