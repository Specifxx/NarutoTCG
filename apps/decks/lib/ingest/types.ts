import type { EventLocation, EventTier, Tournament } from "@naruto-tcg/types";

/**
 * Ingestion pipeline types. Every input (canonical JSON, scraped JSON, TO CSV exports) is
 * read into the same loose intermediate rows ({@link RawEvent}) and assembled into one
 * canonical {@link Tournament}, with every problem reported as an {@link IngestIssue}.
 */

export type IngestSeverity = "error" | "warning" | "info";

/** Which input an issue refers to. */
export type IngestSource = "json" | "standings" | "pairings" | "decklists" | "meta" | "tournament";

export interface IngestIssue {
  severity: IngestSeverity;
  /** Stable kebab-case code, e.g. `"unknown-card"`; the UI and tests key on it. */
  code: string;
  message: string;
  source?: IngestSource;
  /** 1-based data row (header excluded) or array index + 1 for JSON arrays. */
  row?: number;
  field?: string;
  suggestion?: string;
}

/** Event details a TO enters in the wizard (or passes to the CLI with `--meta`). */
export interface EventMetaInput {
  name: string;
  /** ISO date (YYYY-MM-DD) of the final day. */
  date: string;
  tier: EventTier;
  /** Defaults to the format legal on `date`. */
  format?: string;
  location: EventLocation;
  organizer: string;
  /** Inferred from the pairings when omitted. */
  swissRounds?: number;
  /** Inferred from the first top cut round when omitted. */
  topCutSize?: number;
  /** Defaults to 3. */
  bestOf?: 1 | 3;
  notes?: string;
}

export interface IngestSummary {
  players: number;
  matches: number;
  decklists: number;
  /** Players whose archetype came from a reported deck label. */
  archetypesFromLabel: number;
  /** Players whose archetype was classified from their decklist. */
  archetypesInferred: number;
  rogue: number;
  unknownCards: number;
}

export interface IngestResult {
  /** Null only when no tournament could be assembled at all (unreadable input, no players). */
  tournament: Tournament | null;
  /** Errors first, then warnings, then info. */
  issues: IngestIssue[];
  summary: IngestSummary;
}

/** Canonical field key (e.g. `"player1"`) → source column header, or null when unmapped. */
export type ColumnMapping = Record<string, string | null>;

export type CsvKind = "standings" | "pairings" | "decklists";

/** One standings row, as text, from a CSV or scraped JSON. */
export interface RawStanding {
  row: number;
  name: string;
  playerId?: string;
  placement?: string;
  country?: string;
  archetype?: string;
  record?: string;
  wins?: string;
  losses?: string;
  draws?: string;
  points?: string;
  dropped?: string;
  /** Decklist text in any format `parseDecklistText` accepts. */
  decklist?: string;
}

/** One pairing row, as text. An empty `player2` (or "BYE") is a bye. */
export interface RawPairing {
  row: number;
  round: string;
  stage?: string;
  table?: string;
  player1: string;
  player2: string;
  result?: string;
  winner?: string;
}

/** One long-format decklist row: a card line for a player. */
export interface RawDecklistRow {
  row: number;
  player: string;
  quantity: string;
  card?: string;
  cardId?: string;
  section?: string;
}

export interface RawEvent {
  meta: EventMetaInput;
  standings: RawStanding[];
  pairings: RawPairing[];
  decklistRows: RawDecklistRow[];
}

const SEVERITY_ORDER: Record<IngestSeverity, number> = { error: 0, warning: 1, info: 2 };

/** Stable sort: errors, then warnings, then info. */
export function sortIssues(issues: readonly IngestIssue[]): IngestIssue[] {
  return issues
    .map((issue, index) => ({ issue, index }))
    .sort((a, b) => SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity] || a.index - b.index)
    .map(({ issue }) => issue);
}

export function hasErrors(issues: readonly IngestIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

export function countIssues(issues: readonly IngestIssue[]): Record<IngestSeverity, number> {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity]++;
  return counts;
}

/** Human location of an issue, e.g. "pairings row 12 (result)"; empty when unknown. */
export function issueLocation(issue: IngestIssue): string {
  const parts = [issue.source, issue.row !== undefined ? `row ${issue.row}` : undefined].filter(Boolean);
  const where = parts.join(" ");
  return issue.field ? `${where}${where ? " " : ""}(${issue.field})` : where;
}
