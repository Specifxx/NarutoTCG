"use client";

import { CircleCheckBig, Hourglass, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { cx } from "@/lib/format";
import {
  DISPLAY_NAME_LENGTH,
  validateRegistrationRequest,
  type RegistrationErrorResponse,
  type RegistrationField,
  type RegistrationFieldErrors,
  type RegistrationResponse,
} from "@/lib/registrations";
import { button, field } from "@/lib/styles";

export interface CountryOption {
  code: string;
  name: string;
}

interface RegistrationDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  /** Pre-formatted context line, e.g. "Sat, Nov 14, 2026 · Mist Harbour Cards". */
  eventMeta: string;
  /** The event looked full when the dialog opened. */
  waitlist: boolean;
  countries: CountryOption[];
  onRegistered: (response: RegistrationResponse, displayName: string) => void;
}

/**
 * Modal sign-up form on a native <dialog>: showModal() provides the focus trap,
 * inert background, top-layer stacking and Escape-to-close; this component adds
 * initial focus, backdrop click, scroll lock and a fresh form on every open.
 */
export function RegistrationDialog({ open, onClose, ...formProps }: RegistrationDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const requestClose = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Only a press that both starts and ends on the backdrop closes, so selecting
      // text in an input and releasing outside the panel doesn't dismiss the form.
      onPointerDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressStartedOnBackdrop.current && e.target === e.currentTarget) requestClose();
      }}
      className={cx(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-shadow-700 bg-shadow-900 p-0 text-ash-200 shadow-2xl shadow-black/60",
        "backdrop:bg-shadow-950/80 backdrop:backdrop-blur-sm",
        "transition-[opacity,translate] duration-200 starting:open:translate-y-3 starting:open:opacity-0",
      )}
    >
      {open && <RegistrationForm titleId={titleId} requestClose={requestClose} {...formProps} />}
    </dialog>
  );
}

type FormProps = Omit<RegistrationDialogProps, "open" | "onClose"> & {
  titleId: string;
  requestClose: () => void;
};

const FIELD_ORDER: readonly RegistrationField[] = ["displayName", "email", "country", "acceptCodeOfConduct"];

function RegistrationForm({
  titleId,
  requestClose,
  eventId,
  eventTitle,
  eventMeta,
  waitlist,
  countries,
  onRegistered,
}: FormProps) {
  const ids = {
    displayName: useId(),
    email: useId(),
    country: useId(),
    acceptCodeOfConduct: useId(),
  } satisfies Record<RegistrationField, string>;
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ response: RegistrationResponse; displayName: string } | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) successHeadingRef.current?.focus();
  }, [result]);

  const clearError = (name: RegistrationField) =>
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });

  const showFieldErrors = (errors: RegistrationFieldErrors) => {
    setFieldErrors(errors);
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first) document.getElementById(ids[first])?.focus();
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const validation = validateRegistrationRequest({
      displayName,
      email,
      country,
      acceptCodeOfConduct: accepted,
      waitlist,
    });
    if (!validation.ok) {
      showFieldErrors(validation.fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(validation.value),
      });
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && isRegistrationResponse(data)) {
        setResult({ response: data, displayName: validation.value.displayName });
        onRegistered(data, validation.value.displayName);
        return;
      }
      const failure = isErrorResponse(data) ? data : null;
      if (failure?.fieldErrors && Object.keys(failure.fieldErrors).length > 0) {
        // Focus moves to the first invalid field, which announces its own message.
        showFieldErrors(failure.fieldErrors);
        return;
      }
      setFormError(
        failure?.error ??
          (res.status >= 500
            ? "Something went wrong on our side. Please try again in a moment."
            : `We couldn't complete your registration (error ${res.status}).`),
      );
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const errorProps = (name: RegistrationField, hintId?: string) => ({
    id: ids[name],
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": [fieldErrors[name] ? `${ids[name]}-error` : null, hintId].filter(Boolean).join(" ") || undefined,
  });

  const fieldError = (name: RegistrationField) =>
    fieldErrors[name] ? (
      <p id={`${ids[name]}-error`} className={field.error}>
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-chakra-400">
            {waitlist ? "Join the waitlist" : "Register"}
          </p>
          <h2 id={titleId} className="mt-1 text-lg font-semibold leading-snug text-white">
            {eventTitle}
          </h2>
          <p className="mt-1 text-sm text-ash-400">{eventMeta}</p>
        </div>
        <button type="button" onClick={requestClose} className={cx(button.icon, "shrink-0")} aria-label="Close">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {result ? (
        <SuccessView
          headingRef={successHeadingRef}
          response={result.response}
          displayName={result.displayName}
          onDone={requestClose}
        />
      ) : (
        <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4" aria-busy={submitting}>
          {waitlist && (
            <p className="flex gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              This event is full. Join the waitlist and the organiser will contact you if a spot opens up.
            </p>
          )}

          <div>
            <label htmlFor={ids.displayName} className={field.label}>
              Display name
            </label>
            <input
              {...errorProps("displayName", `${ids.displayName}-hint`)}
              data-autofocus
              type="text"
              name="displayName"
              autoComplete="nickname"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                clearError("displayName");
              }}
              className={cx(field.input, "mt-1.5")}
            />
            <p id={`${ids.displayName}-hint`} className={field.hint}>
              Shown on the player list and pairings. {DISPLAY_NAME_LENGTH.min}–{DISPLAY_NAME_LENGTH.max} characters.
            </p>
            {fieldError("displayName")}
          </div>

          <div>
            <label htmlFor={ids.email} className={field.label}>
              Email
            </label>
            <input
              {...errorProps("email", `${ids.email}-hint`)}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              className={cx(field.input, "mt-1.5")}
            />
            <p id={`${ids.email}-hint`} className={field.hint}>
              Only shared with the organiser for check-in and event updates.
            </p>
            {fieldError("email")}
          </div>

          <div>
            <label htmlFor={ids.country} className={field.label}>
              Country <span className="font-normal text-ash-400">(optional)</span>
            </label>
            <select
              {...errorProps("country")}
              name="country"
              autoComplete="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                clearError("country");
              }}
              className={cx(field.select, "mt-1.5")}
            >
              <option value="">Prefer not to say</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldError("country")}
          </div>

          <div>
            <div className="flex items-start gap-3">
              <input
                {...errorProps("acceptCodeOfConduct")}
                type="checkbox"
                name="acceptCodeOfConduct"
                required
                checked={accepted}
                onChange={(e) => {
                  setAccepted(e.target.checked);
                  clearError("acceptCodeOfConduct");
                }}
                className={cx(field.checkbox, "mt-0.5 shrink-0")}
              />
              <label htmlFor={ids.acceptCodeOfConduct} className="text-sm text-ash-200">
                I&apos;ll follow the player code of conduct: play fair, treat everyone with respect, and follow the
                organiser&apos;s and venue&apos;s rules.
              </label>
            </div>
            {fieldError("acceptCodeOfConduct")}
          </div>

          <div aria-live="assertive" aria-atomic="true">
            {formError && (
              <p className="flex gap-2 rounded-lg border border-blood-500/60 bg-blood-500/10 p-3 text-sm text-rose-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                {formError}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={requestClose} className={button.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={button.primary}>
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? "Submitting…" : waitlist ? "Join waitlist" : "Confirm registration"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function SuccessView({
  headingRef,
  response,
  displayName,
  onDone,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  response: RegistrationResponse;
  displayName: string;
  onDone: () => void;
}) {
  const waitlisted = response.status === "waitlisted";
  return (
    <div className="mt-6 text-center">
      <span
        className={cx(
          "mx-auto flex h-12 w-12 items-center justify-center rounded-full",
          waitlisted ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300",
        )}
      >
        {waitlisted ? (
          <Hourglass className="h-6 w-6" aria-hidden="true" />
        ) : (
          <CircleCheckBig className="h-6 w-6" aria-hidden="true" />
        )}
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-semibold text-white focus:outline-none">
        {waitlisted ? "You're on the waitlist" : "You're registered!"}
      </h3>
      <p className="mt-1 text-sm text-ash-400">
        {waitlisted
          ? `${response.waitlistPosition ? `You're #${response.waitlistPosition} in line. ` : ""}The organiser will contact you if a spot opens.`
          : `See you at the table, ${displayName}.`}
      </p>
      <div className="mt-5 rounded-lg border border-shadow-700 bg-shadow-950/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ash-400">Confirmation code</p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] text-white">{response.confirmationCode}</p>
      </div>
      <p className="mt-3 text-xs text-ash-400">Show this code at check-in. It&apos;s also saved on this device.</p>
      <button type="button" onClick={onDone} className={cx(button.primary, "mt-5 w-full")}>
        Done
      </button>
    </div>
  );
}

function isRegistrationResponse(value: unknown): value is RegistrationResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.status === "registered" || v.status === "waitlisted") &&
    typeof v.confirmationCode === "string" &&
    typeof v.registeredCount === "number"
  );
}

function isErrorResponse(value: unknown): value is RegistrationErrorResponse {
  return typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).error === "string";
}
