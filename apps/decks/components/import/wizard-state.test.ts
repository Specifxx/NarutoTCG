import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasErrors } from "@/lib/ingest/types";
import { analyzeText } from "./source-files";
import {
  createWizardState,
  csvFiles,
  eventFieldId,
  ingestFromState,
  jsonFile,
  nextStepId,
  stepBlockers,
  stepsFor,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "./wizard-state";

const NOW = "2026-10-14T12:00:00.000Z";
const template = (name: string) => readFileSync(new URL(`../../public/templates/${name}`, import.meta.url), "utf8");
const file = (name: string) => analyzeText(name, template(name), { origin: "sample" });

const run = (actions: WizardAction[], start: WizardState = createWizardState()) => actions.reduce(wizardReducer, start);

const csvSample = () =>
  run([
    {
      type: "addFiles",
      files: ["standings-template.csv", "pairings-template.csv", "decklists-template.csv", "event-meta-template.json"].map(file),
    },
  ]);

describe("steps", () => {
  it("skips column mapping for JSON", () => {
    expect(stepsFor("csv")).toEqual(["source", "event", "mapping", "validate", "preview"]);
    expect(stepsFor("json")).toEqual(["source", "event", "validate", "preview"]);
    expect(nextStepId({ mode: "json", step: "event" })).toBe("validate");
    expect(nextStepId({ mode: "csv", step: "event" })).toBe("mapping");
    expect(nextStepId({ mode: "csv", step: "preview" })).toBeNull();
  });
});

describe("source step", () => {
  it("blocks until a standings or pairings CSV is added", () => {
    const empty = createWizardState();
    expect(stepBlockers(empty)).toHaveLength(1);
    const blocked = wizardReducer(empty, { type: "next" });
    expect(blocked.step).toBe("source");
    expect(blocked.attempted).toBe("source");
    expect(blocked.attempts).toBe(1);

    const onlyDecklists = run([{ type: "addFiles", files: [file("decklists-template.csv")] }]);
    expect(stepBlockers(onlyDecklists).map((b) => b.message).join()).toMatch(/standings or pairings/);

    const withPairings = run([{ type: "addFiles", files: [file("pairings-template.csv")] }]);
    expect(stepBlockers(withPairings)).toEqual([]);
    expect(wizardReducer(withPairings, { type: "next" }).step).toBe("event");
  });

  it("detects kinds, assigns ids and prefills event details from an event file", () => {
    const state = csvSample();
    expect(state.mode).toBe("csv");
    expect(csvFiles(state).map((f) => [f.id, f.kind])).toEqual([
      ["file-1", "standings"],
      ["file-2", "pairings"],
      ["file-3", "decklists"],
    ]);
    expect(state.form.name).toBe("Example Store Championship — Riverbend");
    expect(state.form.city).toBe("Riverbend");
    expect(state.form.topCutSize).toBe("4");
    expect(state.formBase).toBeNull();
    expect(state.prefilledFrom).toBe("event-meta-template.json");
    expect(state.notices.map((n) => n.message)).toEqual(["Event details prefilled from event-meta-template.json."]);
  });

  it("flags two files of the same kind", () => {
    const state = run([{ type: "addFiles", files: [file("standings-template.csv"), file("standings-template.csv")] }]);
    expect(stepBlockers(state).map((b) => b.message)).toEqual(["2 files are set to Standings: remove one or change its kind."]);
    const fixed = wizardReducer(state, { type: "setFileKind", id: "file-2", kind: "pairings" });
    expect(stepBlockers(fixed)).toEqual([]);
    expect(csvFiles(fixed)[1]!.kindFrom).toBe("chosen");
  });

  it("switches an empty import to the type of the first file and rejects mixing", () => {
    const json = run([{ type: "addFiles", files: [file("scraped-template.json")] }]);
    expect(json.mode).toBe("json");
    expect(json.notices[0]!.message).toMatch(/Switched to a JSON import/);
    expect(jsonFile(json)?.format).toBe("scraped");

    const mixed = wizardReducer(json, { type: "addFiles", files: [file("standings-template.csv")] });
    expect(mixed.files).toHaveLength(1);
    expect(mixed.notices[0]).toMatchObject({ tone: "error" });

    const csv = csvSample();
    const rejected = wizardReducer(csv, { type: "addFiles", files: [file("tournament-template.json")] });
    expect(rejected.mode).toBe("csv");
    expect(csvFiles(rejected)).toHaveLength(3);
    expect(rejected.notices[0]!.message).toMatch(/can't be combined with CSV files/);
  });

  it("keeps one JSON file, replacing it and its prefilled details", () => {
    const first = run([{ type: "addFiles", files: [file("scraped-template.json")] }]);
    const second = wizardReducer(first, { type: "addFiles", files: [file("tournament-template.json")] });
    expect(second.files).toHaveLength(1);
    expect(jsonFile(second)?.format).toBe("canonical");
    expect(second.notices.map((n) => n.message)).toEqual(["Replaced scraped-template.json with tournament-template.json: a JSON import takes one file."]);
    expect(second.formBase).toEqual(second.form);
  });

  it("reports unreadable files as notices", () => {
    const state = run([{ type: "addFiles", files: [analyzeText("broken.json", "{ nope")] }]);
    expect(state.files).toEqual([]);
    expect(state.notices[0]).toMatchObject({ tone: "error" });
    expect(state.notices[0]!.message).toMatch(/^broken\.json: This isn't valid JSON/);
  });

  it("clears files when the mode changes and on replace", () => {
    const state = wizardReducer(csvSample(), { type: "setMode", mode: "json" });
    expect(state.files).toEqual([]);
    expect(state.mode).toBe("json");
    expect(state.notices[0]!.message).toMatch(/^Removed 3 files/);

    const replaced = wizardReducer(csvSample(), { type: "addFiles", files: [file("pairings-template.csv")], replace: true, note: "Sample loaded." });
    expect(csvFiles(replaced).map((f) => f.kind)).toEqual(["pairings"]);
    expect(replaced.notices.map((n) => n.message)).toEqual(["Sample loaded."]);
  });

  it("removes files and the JSON base with them", () => {
    const json = run([{ type: "addFiles", files: [file("scraped-template.json")] }]);
    const removed = wizardReducer(json, { type: "removeFile", id: json.files[0]!.id });
    expect(removed.files).toEqual([]);
    expect(removed.formBase).toBeNull();
    expect(wizardReducer(removed, { type: "removeFile", id: "missing" })).toBe(removed);
  });
});

describe("event details step", () => {
  it("shows errors after a blocked Next and focuses targets", () => {
    const state = run([{ type: "addFiles", files: [file("standings-template.csv")] }, { type: "next" }]);
    expect(state.step).toBe("event");
    const blocked = wizardReducer(state, { type: "next" });
    expect(blocked.step).toBe("event");
    expect(blocked.formSubmitted).toBe(true);
    expect(stepBlockers(blocked).map((b) => b.target)).toEqual([eventFieldId("name"), eventFieldId("date"), eventFieldId("location")]);
  });

  it("lets the format follow the date until edited", () => {
    let state = wizardReducer(createWizardState(), { type: "editEvent", patch: { date: "2026-09-12" } });
    const auto = state.form.format;
    expect(auto).toMatch(/^Standard/);
    state = wizardReducer(state, { type: "editEvent", patch: { format: "Custom" } });
    expect(state.form).toMatchObject({ format: "Custom", formatAuto: false });
    state = wizardReducer(state, { type: "editEvent", patch: { date: "2026-09-13" } });
    expect(state.form.format).toBe("Custom");
    state = wizardReducer(state, { type: "editEvent", patch: { formatAuto: true } });
    expect(state.form.format).toBe(auto);
  });

  it("does not move to validation on Next: the pipeline result arrives separately", () => {
    const state = run([{ type: "addFiles", files: [file("scraped-template.json")] }, { type: "next" }]);
    expect(state.step).toBe("event");
    expect(stepBlockers(state)).toEqual([]);
    expect(wizardReducer(state, { type: "next" })).toBe(state);
  });
});

describe("column mapping step", () => {
  it("blocks on missing required columns and accepts only known headers", () => {
    const state = csvSample();
    const id = csvFiles(state)[1]!.id;
    expect(stepBlockers(state, "mapping")).toEqual([]);
    const unmapped = wizardReducer(state, { type: "setMapping", id, field: "result", header: null });
    expect(stepBlockers(unmapped, "mapping").map((b) => b.message)).toEqual(["pairings-template.csv: map a column to Result or Winner."]);
    const bogus = wizardReducer(state, { type: "setMapping", id, field: "result", header: "Nope" });
    expect(csvFiles(bogus)[1]!.mapping.result).toBeNull();
    const reset = wizardReducer(unmapped, { type: "resetMapping", id });
    expect(csvFiles(reset)[1]!.mapping.result).toBe("Result");
  });

  it("invalidates a validation result when inputs change", () => {
    const validated = wizardReducer(csvSample(), { type: "validated", result: ingestFromState(csvSample(), NOW) });
    expect(validated.result).not.toBeNull();
    const edited = wizardReducer(validated, { type: "editEvent", patch: { notes: "x" } });
    expect(edited.result).toBeNull();
  });
});

describe("validation and navigation", () => {
  it("ingests the CSV sample cleanly and reaches the preview", () => {
    let state = run([{ type: "next" }, { type: "next" }], csvSample());
    expect(state.step).toBe("mapping");
    const result = ingestFromState(state, NOW);
    expect(hasErrors(result.issues)).toBe(false);
    expect(result.tournament?.importedAt).toBe(NOW);
    expect(result.tournament?.name).toBe("Example Store Championship — Riverbend");
    expect(result.summary.players).toBe(8);
    state = wizardReducer(state, { type: "validated", result });
    expect(state.step).toBe("validate");
    expect(stepBlockers(state)).toEqual([]);
    state = wizardReducer(state, { type: "next" });
    expect(state.step).toBe("preview");
    state = wizardReducer(state, { type: "saved", id: result.tournament!.id, name: result.tournament!.name });
    expect(state.saved?.id).toBe(result.tournament!.id);
  });

  it("sends JSON edits as overrides of the file's own details", () => {
    let state = run([{ type: "addFiles", files: [file("tournament-template.json")] }, { type: "next" }]);
    state = wizardReducer(state, { type: "editEvent", patch: { name: "Renamed Cup", tier: "online-open" } });
    const result = ingestFromState(state, NOW);
    expect(hasErrors(result.issues)).toBe(false);
    expect(result.tournament).toMatchObject({ name: "Renamed Cup", tier: "online-open", organizer: "Paper Lantern Games", swissRounds: 3 });
  });

  it("normalizes the scraped sample without errors", () => {
    const state = run([{ type: "addFiles", files: [file("scraped-template.json")] }]);
    expect(state.form).toMatchObject({ date: "2026-09-12", tier: "store-championship", city: "Riverbend", topCutSize: "4", bestOf: "3" });
    const result = ingestFromState(state, NOW);
    expect(hasErrors(result.issues)).toBe(false);
    expect(result.tournament?.players).toHaveLength(8);
  });

  it("blocks the preview while errors remain", () => {
    const state = run([{ type: "addFiles", files: [file("pairings-template.csv")] }]);
    const result = ingestFromState({ ...state, form: { ...state.form, name: "" } }, NOW);
    expect(hasErrors(result.issues)).toBe(true);
    const validated = wizardReducer(state, { type: "validated", result });
    expect(stepBlockers(validated)[0]!.message).toMatch(/^Fix the/);
    expect(wizardReducer(validated, { type: "next" }).step).toBe("validate");
  });

  it("goes back freely but jumps forward only through Next", () => {
    const state = run([{ type: "next" }, { type: "next" }], csvSample());
    expect(wizardReducer(state, { type: "goTo", step: "source" }).step).toBe("source");
    expect(wizardReducer(state, { type: "goTo", step: "preview" })).toBe(state);
    expect(wizardReducer(state, { type: "back" }).step).toBe("event");
    expect(wizardReducer(createWizardState(), { type: "back" }).step).toBe("source");
  });

  it("filters issues and resets the filter on a new result", () => {
    let state = wizardReducer(csvSample(), { type: "setIssueFilter", filter: { severity: "warning" } });
    expect(state.issueFilter).toEqual({ severity: "warning", source: "all" });
    state = wizardReducer(state, { type: "validated", result: ingestFromState(state, NOW) });
    expect(state.issueFilter).toEqual({ severity: "all", source: "all" });
  });

  it("starts over in the same mode", () => {
    const state = wizardReducer(csvSample(), { type: "reset" });
    expect(state.files).toEqual([]);
    expect(state.step).toBe("source");
    expect(state.mode).toBe("csv");
  });

  it("never throws from ingestion", () => {
    const state = run([{ type: "addFiles", files: [file("standings-template.csv")] }]);
    const broken = { ...state, files: [{ ...csvFiles(state)[0]!, text: undefined as unknown as string }] };
    const result = ingestFromState(broken, NOW);
    expect(result.tournament).toBeNull();
    expect(result.issues[0]!.code).toBe("unexpected");
  });
});
