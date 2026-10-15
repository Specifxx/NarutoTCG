import Papa from "papaparse";
import { stripControlCharacters } from "./text";
import type { IngestIssue } from "./types";

export interface CsvTable {
  /** Trimmed, non-empty header names in file order. */
  headers: string[];
  /** One record per data row, keyed by header; missing cells are "". Every header is an own key. */
  rows: Record<string, string>[];
  /** The delimiter used: ",", ";" or "\t". */
  delimiter: string;
  issues: IngestIssue[];
}

/**
 * Longest cell read, in characters. A full decklist in one cell is well under it; longer cells
 * are emptied with an error, so no matching ever runs on them.
 */
export const MAX_CELL_LENGTH = 4096;
/** Over-long cells reported one by one; the rest are summed up in one more issue. */
const LISTED_LONG_CELLS = 5;

/** Header names numbered on repeats ("Player", "Player (2)"), with blank and repeated names noted. */
function nameHeaders(raw: readonly string[]) {
  const seen = new Map<string, number>();
  const repeated = new Set<string>();
  let cleaned = false;
  const names = raw.map((header) => {
    const name = stripControlCharacters(header).trim();
    if (name !== header.trim()) cleaned = true;
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    if (count === 1) return name;
    if (name !== "") repeated.add(name);
    return `${name} (${count})`;
  });
  // Headerless columns ("", or " (2)" for a second one) are dropped.
  const blank = (index: number) => stripControlCharacters(raw[index]!).trim() === "";
  return { names, repeated, blank, cleaned };
}

/**
 * Parses a CSV export with a header row: strips a UTF-8 BOM, detects a comma, semicolon or
 * tab delimiter, skips blank lines and trims headers and values. Repeated headers are numbered
 * ("Player", "Player (2)") with a warning and headerless columns are dropped. Ragged rows are
 * kept (missing cells read as "", extra cells are dropped) with a warning. Control characters
 * are removed (with a warning) and cells longer than {@link MAX_CELL_LENGTH} are emptied with an
 * error. Rows are built here rather than by the parser, so a header such as "__proto__" or
 * "toString" is an ordinary own key holding a string.
 */
export function parseCsv(text: string): CsvTable {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    header: false,
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t"],
  });
  const [headerRow = [], ...dataRows] = result.data;
  const { names, repeated, blank, cleaned } = nameHeaders(headerRow);
  const columns = names.flatMap((name, index) => (blank(index) ? [] : [{ name, index }]));
  const headers = columns.map((column) => column.name);

  const issues: IngestIssue[] = [];
  const longCells: Array<{ row: number; header: string; length: number }> = [];
  let controlCharacters = cleaned;
  const rows = dataRows.map((cells, index) => {
    const row: Record<string, string> = {};
    for (const { name, index: column } of columns) {
      const raw = cells[column];
      let value = typeof raw === "string" ? raw : "";
      if (value.length > MAX_CELL_LENGTH) {
        longCells.push({ row: index + 1, header: name, length: value.length });
        value = "";
      }
      const clean = stripControlCharacters(value);
      if (clean !== value) controlCharacters = true;
      // Assigning "__proto__" would hit the prototype setter; define it as an own property instead.
      if (name === "__proto__") Object.defineProperty(row, name, { value: clean.trim(), enumerable: true, writable: true, configurable: true });
      else row[name] = clean.trim();
    }
    if (cells.length !== headerRow.length) {
      issues.push({
        severity: "warning",
        code: "csv-row-shape",
        message:
          cells.length < headerRow.length
            ? "Row has fewer cells than the header; missing cells were read as empty."
            : "Row has more cells than the header; extra cells were ignored.",
        row: index + 1,
      });
    }
    return row;
  });

  const repeatedNames = [...repeated];
  if (repeatedNames.length > 0) {
    issues.unshift({
      severity: "warning",
      code: "duplicate-column",
      message: `Columns ${repeatedNames.map((name) => `"${name}"`).join(", ")} appear more than once; later copies were numbered, e.g. "${repeatedNames[0]} (2)".`,
      suggestion: "Give each column a distinct header, or map the columns by hand.",
    });
  }
  for (const error of result.errors) {
    if (error.code === "UndetectableDelimiter") continue;
    const row = error.row === undefined ? undefined : error.row + 1;
    issues.push({ severity: "error", code: "csv-syntax", message: `CSV syntax problem: ${error.message}.`, row });
  }
  for (const cell of longCells.slice(0, LISTED_LONG_CELLS)) {
    issues.push({
      severity: "error",
      code: "cell-too-long",
      message: `The "${cell.header}" cell has ${cell.length.toLocaleString("en-US")} characters, more than the ${MAX_CELL_LENGTH.toLocaleString("en-US")} a cell may hold; it was read as empty.`,
      suggestion: "Check that the file is a plain CSV export and that its quotes are balanced.",
      row: cell.row,
      field: cell.header,
    });
  }
  if (longCells.length > LISTED_LONG_CELLS) {
    issues.push({
      severity: "error",
      code: "cell-too-long",
      message: `${longCells.length - LISTED_LONG_CELLS} more cells are longer than ${MAX_CELL_LENGTH.toLocaleString("en-US")} characters and were read as empty.`,
    });
  }
  if (controlCharacters) {
    issues.push({
      severity: "warning",
      code: "control-characters-removed",
      message: "Some cells held invisible control characters; they were removed.",
    });
  }
  if (headers.length === 0 || rows.length === 0) {
    issues.push({ severity: "warning", code: "empty-file", message: "The file has no data rows under a header row." });
  }
  return { headers, rows, delimiter: result.meta.delimiter, issues };
}
