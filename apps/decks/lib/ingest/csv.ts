import Papa from "papaparse";
import type { IngestIssue } from "./types";

export interface CsvTable {
  /** Trimmed, non-empty header names in file order. */
  headers: string[];
  /** One record per data row, keyed by header; missing cells are "". */
  rows: Record<string, string>[];
  /** The delimiter used: ",", ";" or "\t". */
  delimiter: string;
  issues: IngestIssue[];
}

/**
 * Parses a CSV export with a header row: strips a UTF-8 BOM, detects a comma, semicolon or
 * tab delimiter, skips blank lines and trims headers and values. Repeated headers are numbered
 * ("Player", "Player (2)") with a warning and headerless columns are dropped. Ragged rows are
 * kept (missing cells read as "", extra cells are dropped) with a warning.
 */
export function parseCsv(text: string): CsvTable {
  const seen = new Map<string, number>();
  const repeated = new Set<string>();
  const blank = new Set([""]);
  const result = Papa.parse<Record<string, string | undefined>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t"],
    transformHeader: (header) => {
      const name = header.trim();
      const count = (seen.get(name) ?? 0) + 1;
      seen.set(name, count);
      if (count === 1) return name;
      const numbered = `${name} (${count})`;
      if (name === "") blank.add(numbered);
      else repeated.add(name);
      return numbered;
    },
    transform: (value) => value.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((header) => !blank.has(header));
  const rows = result.data.map((record) => Object.fromEntries(headers.map((header) => [header, record[header] ?? ""])));

  const issues: IngestIssue[] = [];
  const names = [...repeated];
  if (names.length > 0) {
    issues.push({
      severity: "warning",
      code: "duplicate-column",
      message: `Columns ${names.map((name) => `"${name}"`).join(", ")} appear more than once; later copies were numbered, e.g. "${names[0]} (2)".`,
      suggestion: "Give each column a distinct header, or map the columns by hand.",
    });
  }
  for (const error of result.errors) {
    if (error.code === "UndetectableDelimiter") continue;
    const row = error.row === undefined ? undefined : error.row + 1;
    if (error.code === "TooFewFields" || error.code === "TooManyFields") {
      issues.push({
        severity: "warning",
        code: "csv-row-shape",
        message:
          error.code === "TooFewFields"
            ? "Row has fewer cells than the header; missing cells were read as empty."
            : "Row has more cells than the header; extra cells were ignored.",
        row,
      });
    } else {
      issues.push({ severity: "error", code: "csv-syntax", message: `CSV syntax problem: ${error.message}.`, row });
    }
  }
  if (headers.length === 0 || rows.length === 0) {
    issues.push({ severity: "warning", code: "empty-file", message: "The file has no data rows under a header row." });
  }
  return { headers, rows, delimiter: result.meta.delimiter, issues };
}
