"use client";

import { cx } from "@naruto-tcg/ui";
import { useId, useRef, useState, type Dispatch, type DragEvent, type ReactNode } from "react";
import { CSV_KINDS } from "@/lib/ingest/columns";
import { formatNumber, pluralize } from "@/lib/format";
import { CloseIcon, DownloadIcon, FileIcon, UploadIcon } from "./icons";
import {
  ACCEPT_ATTRIBUTE,
  analyzeText,
  checkFileBeforeRead,
  checkPasteBeforeRead,
  CSV_KIND_LABEL,
  formatBytes,
  kindWarning,
  MAX_FILE_BYTES,
  MAX_PASTE_LENGTH,
  readErrorMessage,
  rejectFile,
  type AnalyzedInput,
  type PasteKind,
} from "./source-files";
import { SeverityIcon, SeverityTag } from "./status";
import { BUTTON_GHOST, BUTTON_GHOST_SM, BUTTON_PRIMARY, CODE_TEXTAREA, CONTROL, FIELD_SM, FOCUS_RING, HINT, ICON_BUTTON, INLINE_LINK, LABEL } from "./styles";
import { DROPZONE_ID, type CsvSourceFile, type JsonSourceFile, type Notice, type SourceMode, type WizardAction, type WizardState } from "./wizard-state";

const MODES: ReadonlyArray<{ value: SourceMode; title: string; description: string }> = [
  {
    value: "csv",
    title: "CSV files",
    description: "Standings, pairings and decklist exports from your tournament software.",
  },
  {
    value: "json",
    title: "JSON",
    description: "A complete tournament record, or a scraped export of a results page.",
  },
];

const TEMPLATES: ReadonlyArray<{ file: string; label: string; mode: SourceMode | "both" }> = [
  { file: "standings-template.csv", label: "Standings CSV", mode: "csv" },
  { file: "pairings-template.csv", label: "Pairings CSV", mode: "csv" },
  { file: "decklists-template.csv", label: "Decklists CSV", mode: "csv" },
  { file: "event-meta-template.json", label: "Event details JSON", mode: "both" },
  { file: "tournament-template.json", label: "Tournament record JSON", mode: "json" },
  { file: "scraped-template.json", label: "Scraped export JSON", mode: "json" },
];

const SAMPLE_FILES: Record<SourceMode, string[]> = {
  csv: ["standings-template.csv", "pairings-template.csv", "decklists-template.csv", "event-meta-template.json"],
  json: ["scraped-template.json"],
};

const PASTE_KINDS: ReadonlyArray<{ value: PasteKind; label: string }> = [
  { value: "auto", label: "Detect automatically" },
  { value: "json", label: "JSON" },
  ...CSV_KINDS.map((kind) => ({ value: kind, label: `${CSV_KIND_LABEL[kind]} CSV` })),
];

const NOTICE_LABEL: Record<Notice["tone"], string> = { error: "Not added", warning: "Check", info: "Note" };

/** Look of a dropzone button while files are being read (it stays focusable; see aria-disabled). */
const BUSY_LOOK = "aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

async function readFile(file: File): Promise<AnalyzedInput> {
  const problem = checkFileBeforeRead(file.name, file.size);
  if (problem) return rejectFile(file.name, problem);
  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    return rejectFile(file.name, readErrorMessage(error));
  }
  try {
    return analyzeText(file.name, text, { size: file.size, origin: "upload" });
  } catch {
    return rejectFile(file.name, "The file couldn't be parsed. Compare it with the templates, or export it again.");
  }
}

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

/** Gives focus back to "Choose files" when the focused control (a chip, the notices) goes away. */
const focusDropzone = () => document.getElementById(DROPZONE_ID)?.focus();

export function SourceStep({ state, dispatch }: { state: WizardState; dispatch: Dispatch<WizardAction> }) {
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"files" | "sample" | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteKind, setPasteKind] = useState<PasteKind>("auto");

  const addFileList = async (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length === 0) return;
    setBusy("files");
    const analyzed = await Promise.all(files.map(readFile));
    setBusy(null);
    dispatch({ type: "addFiles", files: analyzed });
  };

  const loadSample = async () => {
    if (busy !== null) return;
    setBusy("sample");
    try {
      const analyzed = await Promise.all(
        SAMPLE_FILES[state.mode].map(async (name) => {
          const response = await fetch(`/templates/${name}`);
          if (!response.ok) throw new Error(`${name} returned HTTP ${response.status}`);
          return analyzeText(name, await response.text(), { origin: "sample" });
        }),
      );
      dispatch({
        type: "addFiles",
        files: analyzed,
        replace: true,
        note: `Loaded the sample event (fictional demo data)${state.files.length > 0 ? " in place of the files added before" : ""}. Continue to walk through the rest of the import.`,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      dispatch({ type: "addFiles", files: [rejectFile("Sample data", `couldn't be downloaded (${reason}). Check your connection and try again.`)] });
    } finally {
      setBusy(null);
    }
  };

  const addPaste = () => {
    if (!pasteText.trim()) return;
    const name = pasteKind === "auto" ? "Pasted text" : pasteKind === "json" ? "Pasted JSON" : `Pasted ${pasteKind}`;
    // The same limit as uploads: parsing more on the main thread would freeze the page.
    const tooLarge = checkPasteBeforeRead(pasteText);
    if (tooLarge) {
      // The text stays in the box so it can be trimmed.
      dispatch({ type: "addFiles", files: [rejectFile(name, tooLarge)] });
      return;
    }
    let analyzed: AnalyzedInput;
    try {
      analyzed = analyzeText(name, pasteText, { size: new Blob([pasteText]).size, origin: "paste", kind: pasteKind });
    } catch {
      analyzed = rejectFile(name, "The pasted text couldn't be parsed. Compare it with the templates, or export it again.");
    }
    dispatch({ type: "addFiles", files: [analyzed] });
    setPasteText("");
    // The button disables itself once the text is cleared; keep focus where the next paste goes.
    pasteRef.current?.focus();
  };

  const isCsv = state.mode === "csv";
  const templates = TEMPLATES.filter((t) => t.mode === "both" || t.mode === state.mode);
  const otherTemplates = TEMPLATES.filter((t) => !templates.includes(t));

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className={LABEL}>What are you importing?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => {
            const checked = state.mode === mode.value;
            return (
              <label
                key={mode.value}
                className={cx(
                  "flex cursor-pointer gap-3 rounded-lg border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-chakra-400",
                  checked ? "border-chakra-500 bg-shadow-800" : "border-shadow-600 hover:border-shadow-500",
                )}
              >
                <input
                  type="radio"
                  name={`${ids}-mode`}
                  value={mode.value}
                  checked={checked}
                  onChange={() => dispatch({ type: "setMode", mode: mode.value })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-chakra-500 focus:outline-none"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-white">{mode.title}</span>
                  <span className="mt-1 block text-sm text-ash-400">{mode.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        {state.files.length > 0 && <p className={cx(HINT, "mt-2")}>Switching clears the files added so far.</p>}
      </fieldset>

      <p className="text-sm text-ash-300">
        {isCsv ? (
          <>
            <strong className="font-semibold text-ash-100">Standings</strong> are required unless you have{" "}
            <strong className="font-semibold text-ash-100">pairings</strong> (players are then taken from the pairings). Pairings
            and <strong className="font-semibold text-ash-100">decklists</strong> are optional, but they power win rates,
            matchups and the deck database. Add an event details JSON to fill in the next step.
          </>
        ) : (
          <>
            One file: a canonical tournament record (players and matches) or a scraped export (an event with standings and
            pairings). Add an event details JSON alongside to override its event fields.
          </>
        )}
      </p>

      <div
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFileList(event.dataTransfer.files);
        }}
        className={cx(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition",
          dragging ? "border-chakra-400 bg-shadow-800" : "border-shadow-600 bg-shadow-950/40",
        )}
      >
        <UploadIcon className={cx("h-8 w-8", dragging ? "text-chakra-300" : "text-ash-400")} />
        <p className="text-sm text-ash-200">
          <span className="font-semibold text-white">Drag and drop</span> {isCsv ? "your CSV files" : "a JSON file"} here, or
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* aria-disabled rather than disabled: a disabled button drops keyboard focus to the page. */}
          <button
            id={DROPZONE_ID}
            type="button"
            onClick={() => {
              if (busy === null) inputRef.current?.click();
            }}
            aria-disabled={busy !== null}
            className={cx(BUTTON_PRIMARY, BUSY_LOOK)}
          >
            Choose files
          </button>
          <button type="button" onClick={() => void loadSample()} aria-disabled={busy !== null} className={cx(BUTTON_GHOST, BUSY_LOOK)}>
            Load sample data
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={(event) => {
            const input = event.currentTarget;
            void addFileList(input.files).finally(() => {
              input.value = "";
            });
          }}
        />
        <p className={HINT}>
          .csv, .json or .txt · up to {formatBytes(MAX_FILE_BYTES)} each · read in your browser, never uploaded
        </p>
        <p role="status" className="text-xs text-ash-300">
          {busy === "files" ? "Reading files…" : busy === "sample" ? "Loading the sample event…" : ""}
        </p>
      </div>

      <div aria-live="polite">
        {state.notices.length > 0 && (
          <NoticeList
            notices={state.notices}
            onDismiss={() => {
              dispatch({ type: "dismissNotices" });
              focusDropzone();
            }}
          />
        )}
      </div>

      {state.files.length > 0 && (
        <section aria-labelledby={`${ids}-files`}>
          <h3 id={`${ids}-files`} className="text-sm font-semibold text-white">
            Added {pluralize(state.files.length, "file")}
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {state.files.map((file) =>
              file.type === "csv" ? (
                <CsvChip key={file.id} file={file} dispatch={dispatch} />
              ) : (
                <JsonChip key={file.id} file={file} dispatch={dispatch} />
              ),
            )}
          </ul>
        </section>
      )}

      <details className="group rounded-lg border border-shadow-700">
        <summary className={cx("cursor-pointer select-none rounded-lg px-4 py-3 text-sm font-semibold text-ash-200 hover:text-white", FOCUS_RING)}>
          Paste text instead
        </summary>
        <div className="flex flex-col gap-3 border-t border-shadow-700 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-paste`} className={LABEL}>
              Pasted data
            </label>
            <textarea
              ref={pasteRef}
              id={`${ids}-paste`}
              rows={6}
              spellCheck={false}
              maxLength={MAX_PASTE_LENGTH}
              aria-describedby={`${ids}-paste-hint`}
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder={isCsv ? "Placement,Player,Deck,Record\n1,Kenji Morrow,Sage Naruto,4-1" : '{ "event": { "name": "…", "date": "…" }, "standings": [ … ] }'}
              className={CODE_TEXTAREA}
            />
            <p id={`${ids}-paste-hint`} className={HINT}>
              Up to {formatBytes(MAX_FILE_BYTES)}; use the command-line importer for larger exports.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${ids}-paste-kind`} className={LABEL}>
                Contains
              </label>
              <select
                id={`${ids}-paste-kind`}
                value={pasteKind}
                onChange={(event) => setPasteKind(event.target.value as PasteKind)}
                className={cx(CONTROL, "h-9 px-3")}
              >
                {PASTE_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={addPaste} disabled={!pasteText.trim()} className={BUTTON_GHOST}>
              Add pasted text
            </button>
          </div>
        </div>
      </details>

      <section aria-labelledby={`${ids}-templates`}>
        <h3 id={`${ids}-templates`} className="text-sm font-semibold text-white">
          Templates
        </h3>
        <p className={cx(HINT, "mt-1")}>Column names are matched loosely, so most exports work as they are; these show what is read.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {templates.map((template) => (
            <li key={template.file}>
              <a
                href={`/templates/${template.file}`}
                download
                className={cx(
                  "flex items-center gap-2 rounded-md border border-shadow-700 bg-shadow-800 px-3 py-2 text-sm text-ash-200 transition hover:border-chakra-600 hover:text-white",
                  FOCUS_RING,
                )}
              >
                <DownloadIcon className="h-4 w-4 shrink-0 text-ash-400" />
                <span className="min-w-0">
                  <span className="block font-medium">{template.label}</span>
                  <span className="block truncate font-mono text-[11px] text-ash-500">{template.file}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className={cx(HINT, "mt-3")}>
          For {isCsv ? "a JSON import" : "CSV files"}:{" "}
          {otherTemplates.map((template, index) => (
            <span key={template.file}>
              {index > 0 && ", "}
              <a href={`/templates/${template.file}`} download className={cx("font-mono", INLINE_LINK)}>
                {template.file}
              </a>
            </span>
          ))}
          .
        </p>
      </section>
    </div>
  );
}

function NoticeList({ notices, onDismiss }: { notices: Notice[]; onDismiss: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-shadow-600 bg-shadow-800 p-3 sm:flex-row sm:items-start sm:justify-between">
      <ul className="flex min-w-0 flex-col gap-1.5">
        {notices.map((notice) => (
          <li key={notice.id} className="flex items-start gap-2 text-sm text-ash-200">
            <SeverityIcon severity={notice.tone} className="mt-0.5" />
            <span className="min-w-0 break-words">
              <span className="font-semibold text-ash-100">{NOTICE_LABEL[notice.tone]}:</span> {notice.message}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onDismiss} className={cx(BUTTON_GHOST_SM, "self-start")}>
        Dismiss
      </button>
    </div>
  );
}

function ChipShell({ name, origin, details, children, onRemove }: {
  name: string;
  origin: CsvSourceFile["origin"];
  details: ReactNode;
  children?: ReactNode;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-shadow-700 bg-shadow-800 px-3 py-2.5">
      <FileIcon className="h-5 w-5 shrink-0 text-ash-400" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
          <span className="truncate" title={name}>
            {name}
          </span>
          {origin !== "upload" && (
            <span className="shrink-0 rounded border border-shadow-500 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-ash-300">
              {origin === "sample" ? "Sample" : "Pasted"}
            </span>
          )}
        </p>
        <div className="text-xs text-ash-400">{details}</div>
      </div>
      {children}
      <button
        type="button"
        aria-label={`Remove ${name}`}
        title="Remove"
        onClick={() => {
          onRemove();
          focusDropzone();
        }}
        className={ICON_BUTTON}
      >
        <CloseIcon />
      </button>
    </li>
  );
}

function CsvChip({ file, dispatch }: { file: CsvSourceFile; dispatch: Dispatch<WizardAction> }) {
  const kindNote =
    file.kindFrom === "name"
      ? "kind from file name"
      : file.kindFrom === "chosen"
        ? "kind set by you"
        : `detected from headers (${Math.round(file.confidence * 100)}% match)`;
  const warning = kindWarning(file);
  return (
    <ChipShell
      name={file.name}
      origin={file.origin}
      onRemove={() => dispatch({ type: "removeFile", id: file.id })}
      details={
        <>
          <p>
            {formatBytes(file.size)} · {pluralize(file.rowCount, "row")} · {pluralize(file.headers.length, "column")} · {kindNote}
          </p>
          {warning && (
            <p className="mt-1">
              <SeverityTag severity="warning" label="Check the kind:" /> <span className="text-ash-300">{warning}</span>
            </p>
          )}
        </>
      }
    >
      <div className="flex items-center gap-2">
        <label htmlFor={`import-kind-${file.id}`} className="text-xs text-ash-400">
          Kind<span className="sr-only"> of {file.name}</span>
        </label>
        <select
          id={`import-kind-${file.id}`}
          value={file.kind}
          onChange={(event) => dispatch({ type: "setFileKind", id: file.id, kind: event.target.value as CsvSourceFile["kind"] })}
          className={FIELD_SM}
        >
          {CSV_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {CSV_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>
    </ChipShell>
  );
}

function JsonChip({ file, dispatch }: { file: JsonSourceFile; dispatch: Dispatch<WizardAction> }) {
  const canonical = file.format === "canonical";
  return (
    <ChipShell
      name={file.name}
      origin={file.origin}
      onRemove={() => dispatch({ type: "removeFile", id: file.id })}
      details={
        <p>
          {formatBytes(file.size)} · <span className="text-ash-200">{canonical ? "Tournament record" : "Scraped export"}</span> ·{" "}
          {canonical
            ? `${pluralize(file.players, "player")} · ${pluralize(file.matches, "match", "matches")}`
            : `${formatNumber(file.players)} standings ${file.players === 1 ? "row" : "rows"} · ${formatNumber(file.matches)} pairing ${file.matches === 1 ? "row" : "rows"}`}
        </p>
      }
    />
  );
}
