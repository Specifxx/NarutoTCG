"use client";

import { cx } from "@naruto-tcg/ui";
import { useEffect, useReducer, useRef } from "react";
import { BlockerSummary } from "./blocker-summary";
import { EventStep } from "./event-step";
import { MappingStep } from "./mapping-step";
import { PreviewStep } from "./preview-step";
import { SourceStep } from "./source-step";
import { Stepper } from "./stepper";
import { BUTTON_GHOST, BUTTON_PRIMARY, PANEL } from "./styles";
import { ValidateStep } from "./validate-step";
import {
  createWizardState,
  ingestFromState,
  nextStepId,
  previousStepId,
  STEP_LABEL,
  stepBlockers,
  stepsFor,
  wizardReducer,
  type StepId,
} from "./wizard-state";

const STEP_INTRO: Record<StepId, string> = {
  source: "Choose what you're importing, then add the files. Everything stays in your browser.",
  event: "Check the event details: they label the event page and set its weight in the tier list.",
  mapping: "Match each field to a column in your files. Most columns are matched automatically.",
  validate: "Names were matched across files, decks classified and results cross-checked.",
  preview: "Review the event, then save it to this browser or download the normalized JSON.",
};

function nextLabel(target: StepId): string {
  return target === "validate" ? "Validate" : `Next: ${STEP_LABEL[target]}`;
}

/** The TO import wizard: source → event details → column mapping (CSV) → validate → preview & save. */
export function ImportWizard() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createWizardState);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(state.step);

  // Move focus to the new step's heading on every step change (not on first render).
  useEffect(() => {
    if (shownStep.current === state.step) return;
    shownStep.current = state.step;
    headingRef.current?.focus();
  }, [state.step]);

  const steps = stepsFor(state.mode);
  const index = steps.indexOf(state.step);
  const target = nextStepId(state);
  const back = previousStepId(state);
  const blockers = stepBlockers(state);

  // Ingestion only runs here, on an explicit transition; `now` is taken at click time.
  const validate = () => dispatch({ type: "validated", result: ingestFromState(state, new Date().toISOString()) });

  const goNext = () => {
    if (target === "validate" && blockers.length === 0) validate();
    else dispatch({ type: "next" });
  };

  return (
    <section aria-label="Import wizard" className="flex min-w-0 flex-col gap-4">
      <Stepper steps={steps} current={state.step} onSelect={(step) => dispatch({ type: "goTo", step })} />

      <div className={cx(PANEL, "min-w-0 p-4 sm:p-6")}>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chakra-400">
            Step {index + 1} of {steps.length}
          </p>
          <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-xl font-bold text-white focus:outline-none">
            {STEP_LABEL[state.step]}
          </h2>
          <p className="mt-1 text-sm text-ash-400">{STEP_INTRO[state.step]}</p>
        </div>

        {state.step === "source" && <SourceStep state={state} dispatch={dispatch} />}
        {state.step === "event" && <EventStep state={state} dispatch={dispatch} />}
        {state.step === "mapping" && <MappingStep state={state} dispatch={dispatch} />}
        {state.step === "validate" && <ValidateStep state={state} dispatch={dispatch} onRerun={validate} />}
        {state.step === "preview" && <PreviewStep state={state} dispatch={dispatch} />}

        {state.attempted === state.step && blockers.length > 0 && <BlockerSummary blockers={blockers} attempts={state.attempts} />}

        {(back || target) && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-shadow-700 pt-4">
            {back ? (
              <button type="button" onClick={() => dispatch({ type: "back" })} className={BUTTON_GHOST}>
                <span aria-hidden="true">←</span> Back
              </button>
            ) : (
              <span />
            )}
            {target && (
              <button type="button" onClick={goNext} className={BUTTON_PRIMARY}>
                {nextLabel(target)} <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
