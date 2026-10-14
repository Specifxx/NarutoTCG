"use client";

import type { EventTier } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import type { Dispatch, ReactNode } from "react";
import { EVENT_TIER_LABEL } from "@/lib/format";
import type { EventMetaInput } from "@/lib/ingest/types";
import {
  autoFormat,
  EVENT_FIELD_LABELS,
  MAX_SWISS_ROUNDS,
  metaOverrides,
  TOP_CUT_OPTIONS,
  validateEventForm,
  type EventForm,
} from "./event-form";
import { InfoIcon } from "./icons";
import { FieldError } from "./status";
import { BUTTON_GHOST_SM, FIELD, HINT, LABEL, TEXTAREA } from "./styles";
import { eventFieldId, type WizardAction, type WizardState } from "./wizard-state";

const TIERS = Object.keys(EVENT_TIER_LABEL) as EventTier[];

interface ControlProps {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  required?: boolean;
}

function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className={LABEL}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-chakra-400">
            {" "}
            *
          </span>
        ) : (
          <span className="font-normal text-ash-500"> (optional)</span>
        )}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, ...(required ? { required } : {}) })}
      {hint && (
        <p id={hintId} className={HINT}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}

export function EventStep({ state, dispatch }: { state: WizardState; dispatch: Dispatch<WizardAction> }) {
  const { form } = state;
  const errors = state.formSubmitted ? validateEventForm(form) : {};
  const edit = (patch: Partial<EventForm>) => dispatch({ type: "editEvent", patch });
  const isJson = state.mode === "json";
  const overridden = isJson && state.formBase ? (Object.keys(metaOverrides(state.formBase, form)) as Array<keyof EventMetaInput>) : [];
  const defaultFormat = autoFormat(form.date);
  const topCutValues = TOP_CUT_OPTIONS.map(String);
  const locationErrorId = errors.location ? `${eventFieldId("location")}-error` : undefined;

  return (
    <div className="flex flex-col gap-6">
      {state.prefilledFrom ? (
        <p className="flex items-start gap-2 rounded-md border border-shadow-600 bg-shadow-800 px-3 py-2.5 text-sm text-ash-200">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-ash-300" />
          <span>
            Prefilled from <span className="font-semibold text-white">{state.prefilledFrom}</span>.
            {isJson && " Anything you change here replaces the file's own event details."}
            {overridden.length > 0 && (
              <>
                {" "}
                Overriding: <span className="text-white">{overridden.map((key) => EVENT_FIELD_LABELS[key]).join(", ")}</span>.
              </>
            )}
          </span>
        </p>
      ) : (
        <p className={HINT}>
          Tip: add an event details JSON (see event-meta-template.json) on the Source step to fill this in automatically.
        </p>
      )}

      <p className={HINT}>
        Fields marked <span className="text-chakra-400">*</span> are required.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={eventFieldId("name")} label="Event name" required error={errors.name} className="sm:col-span-2">
          {(props) => (
            <input {...props} type="text" autoComplete="off" value={form.name} onChange={(e) => edit({ name: e.target.value })} className={FIELD} />
          )}
        </FormField>

        <FormField id={eventFieldId("date")} label="Date" required hint="The final day of the event." error={errors.date}>
          {(props) => <input {...props} type="date" value={form.date} onChange={(e) => edit({ date: e.target.value })} className={FIELD} />}
        </FormField>

        <FormField id="import-event-tier" label="Tier" required hint="Bigger events weigh more in the tier list.">
          {(props) => (
            <select {...props} value={form.tier} onChange={(e) => edit({ tier: e.target.value as EventTier })} className={FIELD}>
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {EVENT_TIER_LABEL[tier]}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField
          id="import-event-format"
          label="Format"
          className="sm:col-span-2"
          hint={
            form.formatAuto || !defaultFormat || form.format === defaultFormat ? (
              "Defaults to the format legal on the event date."
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                <span>Default for this date: {defaultFormat}.</span>
                <button type="button" onClick={() => edit({ formatAuto: true })} className={BUTTON_GHOST_SM}>
                  Use default
                </button>
              </span>
            )
          }
        >
          {(props) => (
            <input
              {...props}
              type="text"
              autoComplete="off"
              value={form.format}
              placeholder={defaultFormat || "Set the date first"}
              onChange={(e) => edit({ format: e.target.value })}
              className={FIELD}
            />
          )}
        </FormField>

        <fieldset className="flex min-w-0 flex-col gap-3 sm:col-span-2" aria-describedby={locationErrorId}>
          <legend className={LABEL}>
            Location
            <span aria-hidden="true" className="text-chakra-400">
              {" "}
              *
            </span>
          </legend>
          <label className="inline-flex w-fit items-center gap-2 text-sm text-ash-200">
            <input
              id={eventFieldId("location")}
              type="checkbox"
              checked={form.online}
              aria-invalid={errors.location ? true : undefined}
              aria-describedby={locationErrorId}
              onChange={(e) => edit({ online: e.target.checked })}
              className="h-4 w-4 accent-chakra-500"
            />
            Online event
          </label>
          {!form.online && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="import-event-city" label="City">
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    autoComplete="off"
                    value={form.city}
                    aria-invalid={errors.location ? true : undefined}
                    onChange={(e) => edit({ city: e.target.value })}
                    className={FIELD}
                  />
                )}
              </FormField>
              <FormField id="import-event-region" label="Region or state">
                {(props) => (
                  <input {...props} type="text" autoComplete="off" value={form.region} onChange={(e) => edit({ region: e.target.value })} className={FIELD} />
                )}
              </FormField>
              <FormField id="import-event-country" label="Country" hint="Two-letter code, e.g. US.">
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    autoComplete="off"
                    maxLength={56}
                    value={form.country}
                    aria-invalid={errors.location ? true : undefined}
                    onChange={(e) => edit({ country: e.target.value })}
                    className={FIELD}
                  />
                )}
              </FormField>
              <FormField id="import-event-venue" label="Venue">
                {(props) => (
                  <input {...props} type="text" autoComplete="off" value={form.venue} onChange={(e) => edit({ venue: e.target.value })} className={FIELD} />
                )}
              </FormField>
            </div>
          )}
          {errors.location && <FieldError id={locationErrorId} message={errors.location} />}
        </fieldset>

        <FormField id="import-event-organizer" label="Organizer" className="sm:col-span-2">
          {(props) => (
            <input {...props} type="text" autoComplete="off" value={form.organizer} onChange={(e) => edit({ organizer: e.target.value })} className={FIELD} />
          )}
        </FormField>

        <div className="grid gap-5 sm:col-span-2 sm:grid-cols-3">
          <FormField id={eventFieldId("swissRounds")} label="Swiss rounds" hint="Blank: inferred from the pairings." error={errors.swissRounds}>
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_SWISS_ROUNDS}
                step={1}
                placeholder="Infer"
                value={form.swissRounds}
                onChange={(e) => edit({ swissRounds: e.target.value })}
                className={FIELD}
              />
            )}
          </FormField>
          <FormField id="import-event-top-cut" label="Top cut" hint="Blank: inferred from the pairings.">
            {(props) => (
              <select {...props} value={form.topCutSize} onChange={(e) => edit({ topCutSize: e.target.value })} className={FIELD}>
                <option value="">Infer from pairings</option>
                {topCutValues.map((value) => (
                  <option key={value} value={value}>
                    {value === "0" ? "No top cut" : `Top ${value}`}
                  </option>
                ))}
                {form.topCutSize && !topCutValues.includes(form.topCutSize) && <option value={form.topCutSize}>Top {form.topCutSize}</option>}
              </select>
            )}
          </FormField>
          <FormField id="import-event-best-of" label="Match length" required>
            {(props) => (
              <select {...props} value={form.bestOf} onChange={(e) => edit({ bestOf: e.target.value === "1" ? "1" : "3" })} className={FIELD}>
                <option value="3">Best of 3</option>
                <option value="1">Best of 1</option>
              </select>
            )}
          </FormField>
        </div>

        <FormField id="import-event-notes" label="Notes" className="sm:col-span-2" hint="Shown on the event page, e.g. a link to the original results.">
          {(props) => <textarea {...props} rows={3} value={form.notes} onChange={(e) => edit({ notes: e.target.value })} className={TEXTAREA} />}
        </FormField>
      </div>
    </div>
  );
}
