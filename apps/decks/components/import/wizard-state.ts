import { failed } from "@/lib/ingest/assemble";
import { autoMapColumns, describeFields, missingRequiredFields } from "@/lib/ingest/columns";
import { ingestCsv, ingestJson, type IngestCsvInput } from "@/lib/ingest/pipeline";
import { countIssues, type CsvKind, type IngestResult } from "@/lib/ingest/types";
import {
  EMPTY_EVENT_FORM,
  formFromMeta,
  formToMeta,
  metaOverrides,
  updateEventForm,
  validateEventForm,
  type EventForm,
  type EventFormErrorKey,
} from "./event-form";
import { DEFAULT_ISSUE_FILTER, type IssueFilter } from "./issues";
import { CSV_KIND_LABEL, type AnalyzedInput, type CsvFileInfo, type JsonFileInfo } from "./source-files";

export type SourceMode = "json" | "csv";
export type StepId = "source" | "event" | "mapping" | "validate" | "preview";

export const STEP_LABEL: Record<StepId, string> = {
  source: "Source",
  event: "Event details",
  mapping: "Column mapping",
  validate: "Validate",
  preview: "Preview & save",
};

export type CsvSourceFile = CsvFileInfo & { id: string };
export type JsonSourceFile = JsonFileInfo & { id: string };
export type SourceFile = CsvSourceFile | JsonSourceFile;

export interface Notice {
  id: number;
  tone: "error" | "warning" | "info";
  message: string;
}

/** Why a step cannot be left, with the id of the control that fixes it. */
export interface Blocker {
  message: string;
  target?: string;
}

export interface WizardState {
  step: StepId;
  mode: SourceMode;
  /** CSV files, or the single tournament JSON. */
  files: SourceFile[];
  nextId: number;
  /** Outcome of the latest file batch or mode switch (rejected files, replacements). */
  notices: Notice[];
  form: EventForm;
  /** The tournament JSON's own event details; edits relative to it are sent as overrides. */
  formBase: EventForm | null;
  /** File the event details were last prefilled from. */
  prefilledFrom: string | null;
  /** True once Next was pressed on event details, so inline errors stay visible. */
  formSubmitted: boolean;
  /** Step whose Next was pressed while blocked; its blockers are summarized. */
  attempted: StepId | null;
  /** Counts blocked Next presses, so the summary can take focus again. */
  attempts: number;
  result: IngestResult | null;
  issueFilter: IssueFilter;
  saved: { id: string; name: string } | null;
}

export type WizardAction =
  | { type: "setMode"; mode: SourceMode }
  | { type: "addFiles"; files: AnalyzedInput[]; replace?: boolean; note?: string }
  | { type: "removeFile"; id: string }
  | { type: "setFileKind"; id: string; kind: CsvKind }
  | { type: "setMapping"; id: string; field: string; header: string | null }
  | { type: "resetMapping"; id: string }
  | { type: "dismissNotices" }
  | { type: "editEvent"; patch: Partial<EventForm> }
  | { type: "next" }
  | { type: "back" }
  | { type: "goTo"; step: StepId }
  | { type: "validated"; result: IngestResult }
  | { type: "setIssueFilter"; filter: Partial<IssueFilter> }
  | { type: "saved"; id: string; name: string }
  | { type: "reset" };

export function createWizardState(): WizardState {
  return {
    step: "source",
    mode: "csv",
    files: [],
    nextId: 1,
    notices: [],
    form: EMPTY_EVENT_FORM,
    formBase: null,
    prefilledFrom: null,
    formSubmitted: false,
    attempted: null,
    attempts: 0,
    result: null,
    issueFilter: DEFAULT_ISSUE_FILTER,
    saved: null,
  };
}

/** The steps a mode goes through; JSON needs no column mapping. */
export function stepsFor(mode: SourceMode): StepId[] {
  return mode === "json" ? ["source", "event", "validate", "preview"] : ["source", "event", "mapping", "validate", "preview"];
}

export function nextStepId(state: Pick<WizardState, "mode" | "step">): StepId | null {
  const steps = stepsFor(state.mode);
  return steps[steps.indexOf(state.step) + 1] ?? null;
}

export function previousStepId(state: Pick<WizardState, "mode" | "step">): StepId | null {
  const steps = stepsFor(state.mode);
  return steps[steps.indexOf(state.step) - 1] ?? null;
}

export const csvFiles = (state: Pick<WizardState, "files">): CsvSourceFile[] =>
  state.files.filter((file): file is CsvSourceFile => file.type === "csv");

export const jsonFile = (state: Pick<WizardState, "files">): JsonSourceFile | undefined =>
  state.files.find((file): file is JsonSourceFile => file.type === "json");

/** Element ids the blocker summary links to (one wizard per page). */
export const DROPZONE_ID = "import-dropzone";
export const eventFieldId = (key: EventFormErrorKey) => `import-event-${key}`;
export const mappingSelectId = (fileId: string, field: string) => `import-map-${fileId}-${field}`;
export const VALIDATION_ISSUES_ID = "import-issues";

/** Everything that keeps `step` from being left; empty when Next may proceed. */
export function stepBlockers(state: WizardState, step: StepId = state.step): Blocker[] {
  switch (step) {
    case "source":
      return sourceBlockers(state);
    case "event":
      return Object.entries(validateEventForm(state.form)).map(([key, message]) => ({
        message,
        target: eventFieldId(key as EventFormErrorKey),
      }));
    case "mapping":
      return csvFiles(state).flatMap((file) =>
        missingRequiredFields(file.kind, file.mapping).map((group) => ({
          message: `${file.name}: map a column to ${describeFields(file.kind, group)}.`,
          target: mappingSelectId(file.id, group[0]!),
        })),
      );
    case "validate": {
      const result = state.result;
      if (!result) return [{ message: "Run the validation first." }];
      const errors = countIssues(result.issues).error;
      if (errors > 0) {
        return [
          {
            message: `Fix the ${errors === 1 ? "error" : `${errors} errors`} listed above: go back to adjust the event details or column mapping, or correct the files and add them again.`,
            target: VALIDATION_ISSUES_ID,
          },
        ];
      }
      if (!result.tournament) return [{ message: "No event could be assembled from these files.", target: VALIDATION_ISSUES_ID }];
      return [];
    }
    case "preview":
      return [];
  }
}

function sourceBlockers(state: WizardState): Blocker[] {
  if (state.mode === "json") {
    return jsonFile(state) ? [] : [{ message: "Add a tournament JSON file: a canonical record or a scraped export.", target: DROPZONE_ID }];
  }
  const files = csvFiles(state);
  if (files.length === 0) {
    return [{ message: "Add your CSV exports: a standings file, a pairings file, or both.", target: DROPZONE_ID }];
  }
  const blockers: Blocker[] = [];
  const kinds = files.map((file) => file.kind);
  if (!kinds.includes("standings") && !kinds.includes("pairings")) {
    blockers.push({ message: "Add a standings or pairings CSV: decklists alone don't say who played or how they finished.", target: DROPZONE_ID });
  }
  for (const kind of ["standings", "pairings", "decklists"] as const) {
    const same = files.filter((file) => file.kind === kind);
    if (same.length > 1) {
      blockers.push({
        message: `${same.length} files are set to ${CSV_KIND_LABEL[kind]}: remove one or change its kind.`,
        target: `import-kind-${same[1]!.id}`,
      });
    }
  }
  return blockers;
}

/**
 * Runs the pipeline on the wizard's inputs. JSON edits are sent as overrides of the file's own
 * event details; CSVs go with their (possibly hand-edited) column mappings. Never throws.
 */
export function ingestFromState(state: WizardState, now: string): IngestResult {
  try {
    if (state.mode === "json") {
      const file = jsonFile(state);
      if (!file) return failed([{ severity: "error", code: "no-file", message: "No JSON file was added.", source: "json" }]);
      const overrides = state.formBase ? metaOverrides(state.formBase, state.form) : formToMeta(state.form);
      return ingestJson(file.text, { metaOverrides: overrides, now });
    }
    const input: IngestCsvInput = { meta: formToMeta(state.form), now };
    for (const file of csvFiles(state)) input[file.kind] = { text: file.text, mapping: file.mapping };
    return ingestCsv(input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failed([
      {
        severity: "error",
        code: "unexpected",
        message: `The importer hit an unexpected problem: ${reason}`,
        suggestion: "Check the files against the templates, or run the command-line importer for a detailed report.",
      },
    ]);
  }
}

/** Input changed: any validation result or save is stale. */
const stale = (state: WizardState): WizardState => ({ ...state, result: null, saved: null });

function addFiles(state: WizardState, incoming: AnalyzedInput[], replace: boolean, note?: string): WizardState {
  let next: WizardState = replace ? { ...state, files: [], formBase: null } : { ...state };
  let nextId = next.nextId;
  const notices: Omit<Notice, "id">[] = note ? [{ tone: "info", message: note }] : [];
  const switchTo = (mode: SourceMode, name: string) => {
    if (next.mode === mode) return;
    next = { ...next, mode };
    if (!replace) notices.push({ tone: "info", message: `Switched to ${mode === "json" ? "a JSON import" : "CSV files"} for ${name}.` });
  };

  // Tournament files first, so event details files in the same batch override their details.
  const ordered = [...incoming.filter((f) => f.type !== "event-meta"), ...incoming.filter((f) => f.type === "event-meta")];
  for (const file of ordered) {
    switch (file.type) {
      case "invalid":
        notices.push({ tone: "error", message: `${file.name}: ${file.error}` });
        break;
      case "csv": {
        if (next.mode === "json") {
          if (jsonFile(next)) {
            notices.push({
              tone: "error",
              message: `${file.name} is a CSV file, but this import uses a JSON file. Remove the JSON file or choose "CSV files" first.`,
            });
            break;
          }
          switchTo("csv", file.name);
        }
        next = { ...next, files: [...next.files, { ...file, id: `file-${nextId++}` }] };
        break;
      }
      case "json": {
        if (next.mode === "csv") {
          if (csvFiles(next).length > 0) {
            notices.push({
              tone: "error",
              message: `${file.name} is a complete tournament file and can't be combined with CSV files. Choose "JSON" (this clears the CSV files) to import it.`,
            });
            break;
          }
          switchTo("json", file.name);
        }
        const previous = jsonFile(next);
        if (previous) notices.push({ tone: "info", message: `Replaced ${previous.name} with ${file.name}: a JSON import takes one file.` });
        const base = formFromMeta(file.meta, EMPTY_EVENT_FORM);
        next = {
          ...next,
          files: [{ ...file, id: `file-${nextId++}` }],
          form: base,
          formBase: base,
          prefilledFrom: file.name,
          formSubmitted: false,
        };
        break;
      }
      case "event-meta":
        next = { ...next, form: formFromMeta(file.meta, next.form), prefilledFrom: file.name };
        notices.push({
          tone: "info",
          message:
            next.mode === "json" && jsonFile(next)
              ? `Event details from ${file.name} will override the JSON file's own.`
              : `Event details prefilled from ${file.name}.`,
        });
        break;
    }
  }
  return stale({
    ...next,
    nextId: nextId + notices.length,
    notices: notices.map((notice, index) => ({ ...notice, id: nextId + index })),
    attempted: null,
  });
}

function updateFile(state: WizardState, id: string, update: (file: CsvSourceFile) => CsvSourceFile): WizardState {
  let changed = false;
  const files = state.files.map((file) => {
    if (file.id !== id || file.type !== "csv") return file;
    changed = true;
    return update(file);
  });
  return changed ? stale({ ...state, files }) : state;
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "setMode": {
      if (state.mode === action.mode) return state;
      const removed = state.files.length;
      const message =
        removed > 0 ? `Removed ${removed === 1 ? state.files[0]!.name : `${removed} files`}: ${action.mode === "json" ? "a JSON import takes one tournament file" : "CSV imports start from CSV files"}.` : null;
      return stale({
        ...state,
        mode: action.mode,
        step: "source",
        files: [],
        formBase: null,
        notices: message ? [{ id: state.nextId, tone: "info", message }] : [],
        nextId: state.nextId + 1,
        attempted: null,
      });
    }
    case "addFiles":
      return addFiles(state, action.files, Boolean(action.replace), action.note);
    case "removeFile": {
      const removed = state.files.find((file) => file.id === action.id);
      if (!removed) return state;
      return stale({
        ...state,
        files: state.files.filter((file) => file.id !== action.id),
        formBase: removed.type === "json" ? null : state.formBase,
        notices: [],
      });
    }
    case "setFileKind":
      return updateFile(state, action.id, (file) =>
        file.kind === action.kind ? file : { ...file, kind: action.kind, kindFrom: "chosen", mapping: autoMapColumns(action.kind, file.headers) },
      );
    case "setMapping":
      return updateFile(state, action.id, (file) => {
        const header = action.header !== null && file.headers.includes(action.header) ? action.header : null;
        return { ...file, mapping: { ...file.mapping, [action.field]: header } };
      });
    case "resetMapping":
      return updateFile(state, action.id, (file) => ({ ...file, mapping: autoMapColumns(file.kind, file.headers) }));
    case "dismissNotices":
      return state.notices.length === 0 ? state : { ...state, notices: [] };
    case "editEvent":
      return stale({ ...state, form: updateEventForm(state.form, action.patch) });
    case "next": {
      const target = nextStepId(state);
      if (!target) return state;
      if (stepBlockers(state).length > 0) {
        return { ...state, attempted: state.step, attempts: state.attempts + 1, formSubmitted: state.formSubmitted || state.step === "event" };
      }
      // Entering validation needs a pipeline run; its result arrives with "validated".
      if (target === "validate") return state;
      return { ...state, step: target, attempted: null, notices: [], formSubmitted: state.formSubmitted || state.step === "event" };
    }
    case "back": {
      const target = previousStepId(state);
      return target ? { ...state, step: target, attempted: null } : state;
    }
    case "goTo": {
      const steps = stepsFor(state.mode);
      const index = steps.indexOf(action.step);
      return index >= 0 && index < steps.indexOf(state.step) ? { ...state, step: action.step, attempted: null } : state;
    }
    case "validated":
      return {
        ...state,
        step: "validate",
        result: action.result,
        saved: null,
        attempted: null,
        notices: [],
        issueFilter: DEFAULT_ISSUE_FILTER,
        formSubmitted: true,
      };
    case "setIssueFilter":
      return { ...state, issueFilter: { ...state.issueFilter, ...action.filter } };
    case "saved":
      return { ...state, saved: { id: action.id, name: action.name } };
    case "reset":
      return { ...createWizardState(), mode: state.mode, nextId: state.nextId };
  }
}
