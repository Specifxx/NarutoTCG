import { autoMapColumns, CSV_KINDS, detectCsvKind } from "@/lib/ingest/columns";
import { parseCsv } from "@/lib/ingest/csv";
import { detectJsonFormat, EventLocationSchema, EventMetaSchema, EventTierSchema, zodIssues } from "@/lib/ingest/schema";
import { convertScraped } from "@/lib/ingest/scraped";
import type { ColumnMapping, CsvKind, EventMetaInput } from "@/lib/ingest/types";

/** Extensions the file picker and drop zone accept. */
export const ACCEPTED_EXTENSIONS = [".json", ".csv", ".txt"] as const;
export const ACCEPT_ATTRIBUTE = ".json,.csv,.txt,application/json,text/csv,text/plain";
/** Larger exports go through the CLI; parsing them on the main thread would freeze the page. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Rows kept per CSV for the mapping preview. */
export const PREVIEW_ROWS = 5;
/** Below this header-detection confidence a CSV's kind is flagged for a second look (as in the CLI). */
export const MIN_KIND_CONFIDENCE = 0.6;

export const CSV_KIND_LABEL: Record<CsvKind, string> = {
  standings: "Standings",
  pairings: "Pairings",
  decklists: "Decklists",
};

export type FileOrigin = "upload" | "paste" | "sample";
/** What pasted text holds; "auto" sniffs JSON vs CSV and the CSV kind. */
export type PasteKind = "auto" | "json" | CsvKind;

export interface CsvFileInfo {
  type: "csv";
  name: string;
  size: number;
  origin: FileOrigin;
  text: string;
  headers: string[];
  rowCount: number;
  /** The first {@link PREVIEW_ROWS} rows, keyed by header. */
  previewRows: Record<string, string>[];
  /** Best guess from the headers alone, with its 0..1 confidence. */
  detectedKind: CsvKind;
  confidence: number;
  kind: CsvKind;
  /** Where `kind` came from: the file name, the headers, or the user. */
  kindFrom: "name" | "headers" | "chosen";
  mapping: ColumnMapping;
  /** Parser notes (ragged rows, repeated headers); the validation step lists them. */
  parseWarnings: number;
}

export interface JsonFileInfo {
  type: "json";
  name: string;
  size: number;
  origin: FileOrigin;
  text: string;
  format: "canonical" | "scraped";
  /** Players (canonical) or standings rows (scraped). */
  players: number;
  /** Matches (canonical) or pairing rows (scraped). */
  matches: number;
  /** The file's own event details, used to prefill the form. */
  meta: Partial<EventMetaInput>;
}

/** Event details on their own (event-meta-template.json): prefills the form. */
export interface EventMetaFileInfo {
  type: "event-meta";
  name: string;
  meta: EventMetaInput;
}

export interface InvalidFileInfo {
  type: "invalid";
  name: string;
  error: string;
}

export type AnalyzedInput = CsvFileInfo | JsonFileInfo | EventMetaFileInfo | InvalidFileInfo;

export function rejectFile(name: string, error: string): InvalidFileInfo {
  return { type: "invalid", name, error };
}

/** "842 B", "12.4 KB", "1.2 MB" (fixed formatting, no locale). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The CSV kind a file name announces ("rc-standings.csv", "pairing.csv"), as the CLI reads it. */
export function kindFromName(name: string): CsvKind | null {
  const lower = name.toLowerCase();
  return CSV_KINDS.find((kind) => lower.includes(kind) || lower.includes(kind.replace(/s$/, ""))) ?? null;
}

/** Why a file cannot be read before opening it (type or size), or null when it is fine. */
export function checkFileBeforeRead(name: string, size: number): string | null {
  const ext = /\.[^.]+$/.exec(name)?.[0].toLowerCase() ?? "";
  if (ext === ".xlsx" || ext === ".xls" || ext === ".ods" || ext === ".numbers") {
    return "Spreadsheet workbooks can't be read here. Export the sheet as CSV (UTF-8) and add that file.";
  }
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `${ext ? `"${ext}" files aren't` : "Files without an extension aren't"} supported. Add .csv, .json or .txt exports.`;
  }
  if (size === 0) return "The file is empty.";
  if (size > MAX_FILE_BYTES) {
    return `The file is ${formatBytes(size)}; the browser importer takes up to ${formatBytes(MAX_FILE_BYTES)}. Use the command-line importer for larger exports.`;
  }
  return null;
}

/** Friendly message for a file the browser could not read. */
export function readErrorMessage(error: unknown): string {
  const reason = error instanceof Error && error.message ? ` (${error.message})` : "";
  return `The browser couldn't read this file${reason}. Check that it is still on disk, or save it again as UTF-8 text.`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Event details from a canonical record, field by field, so a partly broken file still prefills. */
function metaFromCanonical(value: Record<string, unknown>): Partial<EventMetaInput> {
  const meta: Partial<EventMetaInput> = {};
  const text = (key: string) => (typeof value[key] === "string" ? (value[key] as string) : undefined);
  const count = (key: string) => {
    const n = value[key];
    return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : undefined;
  };
  if (text("name") !== undefined) meta.name = text("name");
  if (text("date") !== undefined) meta.date = text("date");
  if (text("format") !== undefined) meta.format = text("format");
  if (text("organizer") !== undefined) meta.organizer = text("organizer");
  if (text("notes") !== undefined) meta.notes = text("notes");
  const tier = EventTierSchema.safeParse(value.tier);
  if (tier.success) meta.tier = tier.data;
  const location = EventLocationSchema.safeParse(value.location);
  if (location.success) meta.location = location.data;
  if (count("swissRounds") !== undefined) meta.swissRounds = count("swissRounds");
  if (count("topCutSize") !== undefined) meta.topCutSize = count("topCutSize");
  if (value.bestOf === 1 || value.bestOf === 3) meta.bestOf = value.bestOf;
  return meta;
}

function analyzeJson(name: string, text: string, size: number, origin: FileOrigin): AnalyzedInput {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return rejectFile(name, `This isn't valid JSON (${reason}). Look for a missing comma, bracket or quote, or export the file again.`);
  }
  const format = detectJsonFormat(value);
  if (format === "canonical" && isRecord(value)) {
    const { players, matches } = value as { players: unknown[]; matches: unknown[] };
    return { type: "json", name, size, origin, text, format, players: players.length, matches: matches.length, meta: metaFromCanonical(value) };
  }
  if (format === "scraped" && isRecord(value)) {
    const { raw, issues } = convertScraped(value);
    if (!raw) {
      return rejectFile(name, `The "event" block can't be read: ${issues[0]?.message ?? "it doesn't match the scraped template"}.`);
    }
    const rows = (key: string) => (Array.isArray(value[key]) ? (value[key] as unknown[]).length : 0);
    return { type: "json", name, size, origin, text, format, players: rows("standings"), matches: rows("pairings"), meta: raw.meta };
  }
  if (isRecord(value) && ("name" in value || "date" in value)) {
    const parsed = EventMetaSchema.safeParse(value);
    if (parsed.success) return { type: "event-meta", name, meta: parsed.data };
    const first = zodIssues(parsed.error, "meta")[0];
    return rejectFile(name, `This looks like an event details file, but ${first?.message ?? "it doesn't match the template"}. Compare it with event-meta-template.json.`);
  }
  return rejectFile(
    name,
    "Unrecognized JSON: expected a tournament record (players and matches), a scraped export (an event with standings and pairings) or event details.",
  );
}

function analyzeCsv(name: string, text: string, size: number, origin: FileOrigin, chosen: CsvKind | null): AnalyzedInput {
  const table = parseCsv(text);
  if (table.headers.length === 0) {
    return rejectFile(name, "No header row found. The first line must name the columns; compare it with the CSV templates.");
  }
  if (table.rows.length === 0) return rejectFile(name, "The file has a header row but no data rows.");
  const detected = detectCsvKind(table.headers);
  const named = kindFromName(name);
  const kind = chosen ?? named ?? detected.kind;
  return {
    type: "csv",
    name,
    size,
    origin,
    text,
    headers: table.headers,
    rowCount: table.rows.length,
    previewRows: table.rows.slice(0, PREVIEW_ROWS),
    detectedKind: detected.kind,
    confidence: detected.confidence,
    kind,
    kindFrom: chosen ? "chosen" : named ? "name" : "headers",
    mapping: autoMapColumns(kind, table.headers),
    parseWarnings: table.issues.length,
  };
}

/**
 * Reads one file's text into what the wizard needs: a CSV (headers, detected kind, automatic
 * mapping, preview rows), a tournament JSON (format, counts, its event details), an event
 * details JSON, or a friendly reason it cannot be used. `kind` forces JSON or a CSV kind.
 */
export function analyzeText(
  name: string,
  text: string,
  options: { size?: number; origin?: FileOrigin; kind?: PasteKind } = {},
): AnalyzedInput {
  const body = text.replace(/^﻿/, "");
  const size = options.size ?? body.length;
  const origin = options.origin ?? "upload";
  const hint = options.kind ?? "auto";
  if (!body.trim()) return rejectFile(name, "The file is empty.");
  if (body.includes("\u0000")) {
    return rejectFile(name, "This looks like a binary file (an Excel workbook, perhaps). Export it as CSV (UTF-8) or JSON and try again.");
  }
  const json = hint === "json" || (hint === "auto" && (/\.json$/i.test(name) || /^\s*[[{]/.test(body)));
  if (json) return analyzeJson(name, body, size, origin);
  return analyzeCsv(name, body, size, origin, hint === "auto" ? null : hint);
}
