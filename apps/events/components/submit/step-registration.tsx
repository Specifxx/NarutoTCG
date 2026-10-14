import type { RegistrationMethod } from "@naruto-tcg/types";
import { ExternalLink, Gift, Globe, MonitorSmartphone, Plus, Store, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/format";
import { button, field } from "@/lib/styles";
import { LIMITS, REGISTRATION_METHODS } from "@/lib/submission";
import { isLocalDate } from "@/lib/time";
import {
  CheckboxField,
  controlProps,
  FieldError,
  FieldSection,
  miniButton,
  OptionalTag,
  RadioCardGroup,
  TextField,
  type RadioCardOption,
  type StepProps,
} from "./fields";

const METHOD_ICONS = { online: MonitorSmartphone, "in-store": Store, external: Globe } as const;

const METHOD_OPTIONS: RadioCardOption<RegistrationMethod>[] = REGISTRATION_METHODS.map((m) => ({
  value: m.method,
  label: m.label,
  description: m.description,
  icon: METHOD_ICONS[m.method],
}));

function PrizesEditor({
  prizes,
  errors,
  onChange,
}: {
  prizes: string[];
  errors: StepProps["errors"];
  onChange: (prizes: string[]) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const focusRow = useRef<number | null>(null);
  const full = prizes.length >= LIMITS.prizes.max;

  // Move focus to a newly added row (or the add button after the last row is removed).
  useEffect(() => {
    if (focusRow.current === null) return;
    const inputs = listRef.current?.querySelectorAll<HTMLInputElement>("input");
    const target = inputs?.[Math.min(focusRow.current, inputs.length - 1)];
    if (target) target.focus();
    else document.getElementById("submit-prizes-add")?.focus();
    focusRow.current = null;
  }, [prizes.length]);

  function add() {
    focusRow.current = prizes.length;
    onChange([...prizes, ""]);
  }

  function remove(index: number) {
    focusRow.current = index;
    onChange(prizes.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p id="submit-prizes-label" className={field.label}>
        Prizes
        <OptionalTag />
      </p>
      <p className={field.hint}>
        One prize per line, e.g. “Promo card for every player” or “Playmat for 1st place”. Up to {LIMITS.prizes.max}.
      </p>

      {prizes.length > 0 ? (
        <ol ref={listRef} aria-labelledby="submit-prizes-label" className="mt-3 space-y-2">
          {prizes.map((prize, index) => {
            const path = `prizes.${index}`;
            const error = errors[path];
            return (
              // Rows have no stable id; index keys are fine because inputs are fully controlled.
              <li key={index}>
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="w-5 shrink-0 text-right text-xs tabular-nums text-ash-400">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={prize}
                    onChange={(e) => onChange(prizes.map((p, i) => (i === index ? e.target.value : p)))}
                    aria-label={`Prize ${index + 1}`}
                    placeholder="Describe the prize"
                    autoComplete="off"
                    {...controlProps(path, error, false)}
                    className={field.input}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className={miniButton.dangerIcon}
                    aria-label={`Remove prize ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="pl-7">
                  <FieldError path={path} error={error} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-shadow-500/70 px-3 py-3 text-sm text-ash-400">
          <Gift className="h-4 w-4 shrink-0" aria-hidden="true" />
          No prizes listed. Promos and raffles are a big draw, so add them if you have any.
        </p>
      )}

      <FieldError path="prizes" error={errors.prizes} />
      <button id="submit-prizes-add" type="button" onClick={add} disabled={full} className={cx(button.secondary, "mt-3")}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {full ? "Prize limit reached" : prizes.length ? "Add another prize" : "Add a prize"}
      </button>
    </div>
  );
}

export function RegistrationStep({ draft, errors, patch, set, today }: StepProps & { today: string | null }) {
  const { registration } = draft;
  const eventDate = isLocalDate(draft.schedule.date) ? draft.schedule.date : undefined;

  return (
    <>
      <FieldSection title="Registration">
        <RadioCardGroup
          path="registration.method"
          label="How do players sign up?"
          options={METHOD_OPTIONS}
          value={registration.method}
          onChange={(method) => patch("registration", { method })}
          error={errors["registration.method"]}
          columns="lg:grid-cols-3"
        />
        {registration.method === "external" && (
          <TextField
            path="registration.url"
            label="Sign-up link"
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="https://"
            value={registration.url}
            onChange={(e) => patch("registration", { url: e.target.value })}
            error={errors["registration.url"]}
            hint={
              <span className="inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Must start with https://. Players leave this site to register.
              </span>
            }
          />
        )}
        <TextField
          path="registration.opensDate"
          label="Registration opens"
          type="date"
          optional
          className="sm:max-w-[16rem]"
          min={today ?? undefined}
          max={eventDate}
          value={registration.opensDate}
          onChange={(e) => patch("registration", { opensDate: e.target.value })}
          error={errors["registration.opensDate"]}
          hint="Leave blank to open sign-ups as soon as the listing is published."
          inputClassName="tabular-nums"
        />
      </FieldSection>

      <FieldSection title="Prizes & players">
        <PrizesEditor prizes={draft.prizes} errors={errors} onChange={(prizes) => set("prizes", prizes)} />
        <CheckboxField
          path="participantListPublic"
          label="Show a public player list on the event page"
          hint="Players' display names and countries appear once they register. Emails are never shown."
          checked={draft.participantListPublic}
          onChange={(value) => set("participantListPublic", value)}
        />
      </FieldSection>
    </>
  );
}
