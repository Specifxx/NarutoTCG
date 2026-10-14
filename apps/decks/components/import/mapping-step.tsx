"use client";

import { cx } from "@naruto-tcg/ui";
import { useId, type Dispatch } from "react";
import { EmptyState } from "@/components/ui/badges";
import { DataTable, Td, Th, THead, Tr } from "@/components/ui/table";
import { pluralize } from "@/lib/format";
import { COLUMN_FIELDS, describeFields, missingRequiredFields } from "@/lib/ingest/columns";
import { FileIcon } from "./icons";
import { duplicateHeaders, firstValue, mappedPreview, requirementLabel, unusedHeaders } from "./mapping";
import { CSV_KIND_LABEL } from "./source-files";
import { FieldError, SeverityIcon, SeverityTag } from "./status";
import { BUTTON_GHOST_SM, CONTROL, HINT } from "./styles";
import { csvFiles, mappingSelectId, type CsvSourceFile, type WizardAction, type WizardState } from "./wizard-state";

export function MappingStep({ state, dispatch }: { state: WizardState; dispatch: Dispatch<WizardAction> }) {
  return (
    <div className="flex flex-col gap-10">
      {csvFiles(state).map((file) => (
        <FileMapping key={file.id} file={file} dispatch={dispatch} />
      ))}
    </div>
  );
}

function FileMapping({ file, dispatch }: { file: CsvSourceFile; dispatch: Dispatch<WizardAction> }) {
  const headingId = useId();
  const missing = missingRequiredFields(file.kind, file.mapping);
  const missingKeys = new Set(missing.flat());
  const duplicates = duplicateHeaders(file.mapping);
  const unused = unusedHeaders(file.headers, file.mapping);
  const preview = mappedPreview(file);

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="flex min-w-0 items-center gap-2 text-base font-semibold text-white">
          <FileIcon className="h-4 w-4 shrink-0 text-ash-400" />
          <span className="truncate">{file.name}</span>
          <span className="shrink-0 rounded border border-shadow-500 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-ash-300">
            {CSV_KIND_LABEL[file.kind]}
          </span>
        </h3>
        <button type="button" onClick={() => dispatch({ type: "resetMapping", id: file.id })} className={BUTTON_GHOST_SM}>
          Reset to automatic mapping
        </button>
      </div>

      {(missing.length > 0 || duplicates.length > 0) && (
        <ul className="flex flex-col gap-1.5 rounded-md border border-shadow-600 bg-shadow-800 px-3 py-2.5 text-sm text-ash-200">
          {missing.map((group) => (
            <li key={group.join("|")} className="flex items-start gap-2">
              <SeverityIcon severity="error" className="mt-0.5" />
              <span>
                <span className="font-semibold text-ash-100">Error:</span> map a column to {describeFields(file.kind, group)}. This file
                can&apos;t be imported without it.
              </span>
            </li>
          ))}
          {duplicates.map((header) => (
            <li key={header} className="flex items-start gap-2">
              <SeverityIcon severity="warning" className="mt-0.5" />
              <span>
                <span className="font-semibold text-ash-100">Warning:</span> the column &ldquo;{header}&rdquo; is mapped to more than one
                field.
              </span>
            </li>
          ))}
        </ul>
      )}

      <DataTable>
        <caption className="sr-only">Column mapping for {file.name}</caption>
        <THead>
          <tr>
            <Th>Field</Th>
            <Th>Column in your file</Th>
            <Th>First value</Th>
          </tr>
        </THead>
        <tbody>
          {COLUMN_FIELDS[file.kind].map((field) => {
            const selectId = mappingSelectId(file.id, field.key);
            const requirement = requirementLabel(file.kind, field.key);
            const isMissing = missingKeys.has(field.key);
            const sample = firstValue(file, field.key);
            return (
              <Tr key={field.key}>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={selectId} className="font-medium text-white">
                      {field.label}
                    </label>
                    {requirement && (
                      <span className="rounded border border-chakra-600 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-chakra-300">
                        {requirement}
                      </span>
                    )}
                  </div>
                  <p id={`${selectId}-hint`} className="mt-0.5 max-w-64 whitespace-normal text-xs text-ash-400">
                    {field.hint}
                  </p>
                </Td>
                <Td>
                  <select
                    id={selectId}
                    value={file.mapping[field.key] ?? ""}
                    aria-invalid={isMissing ? true : undefined}
                    aria-describedby={isMissing ? `${selectId}-error ${selectId}-hint` : `${selectId}-hint`}
                    onChange={(event) =>
                      dispatch({ type: "setMapping", id: file.id, field: field.key, header: event.target.value || null })
                    }
                    className={cx(CONTROL, "h-9 w-44 px-3")}
                  >
                    <option value="">— not mapped —</option>
                    {file.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  {isMissing && (
                    <div className="mt-1">
                      <FieldError id={`${selectId}-error`} message={requirement ?? "Required"} />
                    </div>
                  )}
                </Td>
                <Td className="text-ash-300">
                  {sample ? (
                    <span className="block max-w-48 truncate" title={sample}>
                      {sample}
                    </span>
                  ) : (
                    <span className="text-ash-500">—</span>
                  )}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </DataTable>

      {unused.length > 0 && (
        <p className={HINT}>
          Not imported: {unused.map((header) => `“${header}”`).join(", ")}.
        </p>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="text-sm font-semibold text-white">
          Preview: first {pluralize(preview.rows.length, "row")} as mapped
        </h4>
        {missing.length > 0 && (
          <p className="text-xs text-ash-300">
            <SeverityTag severity="error" label="Incomplete:" /> rows can&apos;t be read until the required columns are mapped.
          </p>
        )}
        {preview.fields.length === 0 ? (
          <EmptyState title="No columns mapped yet">Choose a column for at least the required fields above.</EmptyState>
        ) : (
          <DataTable>
            <caption className="sr-only">First rows of {file.name} as the importer will read them</caption>
            <THead>
              <tr>
                {preview.fields.map((field) => (
                  <Th key={field.key}>{field.label}</Th>
                ))}
              </tr>
            </THead>
            <tbody>
              {preview.rows.map((row, index) => (
                <Tr key={index}>
                  {row.map((value, column) => (
                    <Td key={preview.fields[column]!.key}>
                      {value ? (
                        <span className="block max-w-56 truncate" title={value}>
                          {value}
                        </span>
                      ) : (
                        <span className="text-ash-500">—</span>
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
        <p className={HINT}>
          {pluralize(file.rowCount, "row")} in total. Names are matched across files ignoring case, accents and punctuation.
        </p>
      </div>
    </section>
  );
}
