import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventStep } from "./event-step";
import { ImportWizard } from "./import-wizard";
import { MappingStep } from "./mapping-step";
import { PreviewStep } from "./preview-step";
import { SourceStep } from "./source-step";
import { analyzeText } from "./source-files";
import { ValidateStep } from "./validate-step";
import { createWizardState, ingestFromState, wizardReducer, type WizardAction, type WizardState } from "./wizard-state";

const NOW = "2026-10-14T12:00:00.000Z";
const template = (name: string) => readFileSync(new URL(`../../public/templates/${name}`, import.meta.url), "utf8");
const file = (name: string) => analyzeText(name, template(name), { origin: "sample" });
const run = (actions: WizardAction[], start: WizardState = createWizardState()) => actions.reduce(wizardReducer, start);
const noop = () => {};

const csvState = () =>
  run([{ type: "addFiles", files: ["standings-template.csv", "pairings-template.csv", "decklists-template.csv", "event-meta-template.json"].map(file) }]);

describe("import wizard rendering", () => {
  it("server-renders the first step with a stepper and template links", () => {
    const html = renderToStaticMarkup(<ImportWizard />);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Step 1 of 5");
    const source = renderToStaticMarkup(<SourceStep state={createWizardState()} dispatch={noop} />);
    for (const name of [
      "standings-template.csv",
      "pairings-template.csv",
      "decklists-template.csv",
      "tournament-template.json",
      "scraped-template.json",
      "event-meta-template.json",
    ]) {
      expect(source).toContain(`href="/templates/${name}"`);
    }
  });

  it("renders file chips, the event form, the mapping and validation", () => {
    const state = csvState();
    expect(renderToStaticMarkup(<SourceStep state={state} dispatch={noop} />)).toContain("Remove standings-template.csv");
    expect(renderToStaticMarkup(<EventStep state={state} dispatch={noop} />)).toContain('value="Example Store Championship — Riverbend"');

    const unmapped = wizardReducer(state, { type: "setMapping", id: "file-2", field: "result", header: null });
    const mapping = renderToStaticMarkup(<MappingStep state={unmapped} dispatch={noop} />);
    expect(mapping).toContain("— not mapped —");
    expect(mapping).toMatch(/aria-describedby="import-map-file-2-result-error import-map-file-2-result-hint"/);

    const validated = wizardReducer(state, { type: "validated", result: ingestFromState(state, NOW) });
    expect(renderToStaticMarkup(<ValidateStep state={validated} dispatch={noop} onRerun={noop} />)).toContain("local-example-store-championship");
  });

  it("links the saved event, the meta with imports on, and the decks", () => {
    const state = csvState();
    const result = ingestFromState(state, NOW);
    const saved = run(
      [{ type: "validated", result }, { type: "next" }, { type: "saved", id: result.tournament!.id, name: result.tournament!.name }],
      state,
    );
    const html = renderToStaticMarkup(<PreviewStep state={saved} dispatch={noop} />);
    expect(html).toContain(`href="/tournaments/${result.tournament!.id}"`);
    expect(html).toContain('href="/meta?imports=1"');
    expect(html).toContain('href="/decks"');
    expect(html).toContain("pnpm --filter @naruto-tcg/decks ingest -- path/to/local-");
  });
});
