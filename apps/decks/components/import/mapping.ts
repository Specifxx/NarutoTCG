import { cell, COLUMN_FIELDS, describeFields, requiredFields, type ColumnField } from "@/lib/ingest/columns";
import type { ColumnMapping, CsvKind } from "@/lib/ingest/types";

interface MappedFile {
  kind: CsvKind;
  mapping: ColumnMapping;
  previewRows: Record<string, string>[];
}

/** "Required", "Required (or Winner)" or null for an optional field. */
export function requirementLabel(kind: CsvKind, key: string): string | null {
  const group = requiredFields(kind).find((fields) => fields.includes(key));
  if (!group) return null;
  const others = group.filter((field) => field !== key);
  return others.length === 0 ? "Required" : `Required (or ${describeFields(kind, others)})`;
}

/** Headers mapped to more than one field, in file order of first use. */
export function duplicateHeaders(mapping: ColumnMapping): string[] {
  const seen = new Map<string, number>();
  for (const header of Object.values(mapping)) if (header) seen.set(header, (seen.get(header) ?? 0) + 1);
  return [...seen].filter(([, count]) => count > 1).map(([header]) => header);
}

/** Headers no field reads. */
export function unusedHeaders(headers: readonly string[], mapping: ColumnMapping): string[] {
  const used = new Set(Object.values(mapping).filter(Boolean));
  return headers.filter((header) => !used.has(header));
}

/** First non-empty value of a field across the preview rows, or "". */
export function firstValue(file: MappedFile, key: string): string {
  for (const row of file.previewRows) {
    const value = cell(row, file.mapping, key);
    if (value) return value;
  }
  return "";
}

/** The preview rows as the pipeline will read them: one column per mapped field. */
export function mappedPreview(file: MappedFile): { fields: ColumnField[]; rows: string[][] } {
  const fields = COLUMN_FIELDS[file.kind].filter((field) => file.mapping[field.key]);
  return { fields, rows: file.previewRows.map((row) => fields.map((field) => cell(row, file.mapping, field.key))) };
}
