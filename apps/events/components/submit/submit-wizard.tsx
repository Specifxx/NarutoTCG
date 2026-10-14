"use client";

import { ArrowLeft, ArrowRight, History, LoaderCircle, Save, Send, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { cx } from "@/lib/format";
import { button, surface } from "@/lib/styles";
import {
  createEmptyDraft,
  currencyForCountry,
  firstStepWithErrors,
  localDateKeyOf,
  previewSubmission,
  STEPS,
  validateStep,
  validateSubmission,
  type EventSubmission,
  type FieldErrors,
  type StepId,
  type SubmissionDraft,
  type SubmissionErrorResponse,
  type SubmissionRequest,
  type SubmissionResponse,
  type SubmissionStoreOption,
  type ValidationContext,
} from "@/lib/submission";
import { formatRelative, isValidTimeZone } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { clearStoredDraft, readStoredDraft, writeStoredDraft } from "./draft-storage";
import { miniButton, StepFrame, type StepProps } from "./fields";
import { DetailsStep } from "./step-details";
import { OrganiserStep } from "./step-organiser";
import { RegistrationStep } from "./step-registration";
import { ReviewStep } from "./step-review";
import { ScheduleStep } from "./step-schedule";
import { Stepper, type StepState } from "./stepper";
import { SubmitSuccess } from "./submit-success";

const AUTOSAVE_DELAY_MS = 600;
const LAST_STEP = STEPS.length - 1;

type Phase =
  | { kind: "editing" }
  | { kind: "submitting" }
  | { kind: "success"; response: SubmissionResponse; submission: EventSubmission };

type FocusRequest = { target: "heading" | "invalid" };

const indexOf = (id: StepId) => STEPS.findIndex((s) => s.id === id);
const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSubmissionResponse(value: unknown): value is SubmissionResponse {
  return isRecord(value) && typeof value.id === "string" && value.status === "pending_review";
}

function isErrorResponse(value: unknown): value is SubmissionErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Focus the first invalid control in DOM order; radio groups focus their checked (or first) radio. */
function focusFirstInvalid(root: HTMLElement): boolean {
  const invalid = root.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!invalid) return false;
  const target =
    invalid.getAttribute("role") === "radiogroup"
      ? (invalid.querySelector<HTMLInputElement>("input:checked") ?? invalid.querySelector<HTMLInputElement>("input"))
      : invalid;
  if (!target) return false;
  target.focus({ preventScroll: true });
  invalid.scrollIntoView({ block: "center", behavior: scrollBehavior() });
  return true;
}

function browserTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isValidTimeZone(zone) ? zone : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Five-step "Submit an event" wizard. Each step validates only its own fields
 * (with the same rules the API applies), errors stay live once a step has been
 * attempted, the draft autosaves to this device, and 422 responses from
 * `/api/submissions` are routed back to the step that owns each field.
 */
export function SubmitWizard({
  stores,
  preselectedStore,
}: {
  stores: SubmissionStoreOption[];
  preselectedStore?: string;
}) {
  const preselected = useMemo(() => stores.find((s) => s.slug === preselectedStore), [stores, preselectedStore]);
  const storeSlugs = useMemo(() => new Set(stores.map((s) => s.slug)), [stores]);

  const [draft, setDraft] = useState<SubmissionDraft>(() => createEmptyDraft({ store: preselected }));
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<StepId>>(() => new Set());
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** True once the person has changed something; pristine drafts are never saved. */
  const dirtyRef = useRef(false);
  const browserZoneRef = useRef<string | undefined>(undefined);
  const latestRef = useRef({ draft, stepIndex, maxVisited });

  const now = useNow(60_000);
  const today = now ? localDateKeyOf(now) : null;
  const ctx = useMemo<ValidationContext | null>(() => (today ? { today, storeSlugs } : null), [today, storeSlugs]);
  /** Context for event handlers, which only run after mount. */
  const handlerContext = useCallback(
    (): ValidationContext => ctx ?? { today: localDateKeyOf(new Date()), storeSlugs },
    [ctx, storeSlugs],
  );

  const step = STEPS[stepIndex];
  const isReview = stepIndex === LAST_STEP;
  const submitting = phase.kind === "submitting";

  /* ----------------------------- draft updates ----------------------------- */

  const patch = useCallback<StepProps["patch"]>((section, value) => {
    dirtyRef.current = true;
    setDraft((prev) => {
      const next = { ...prev };
      next[section] = { ...prev[section], ...value };
      return next;
    });
    setServerErrors((prev) => (hasErrors(prev) ? {} : prev));
  }, []);

  const set = useCallback<StepProps["set"]>((key, value) => {
    dirtyRef.current = true;
    setDraft((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => (hasErrors(prev) ? {} : prev));
  }, []);

  const markAttempted = useCallback((id: StepId) => {
    setAttempted((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  /* ------------------------------- lifecycle ------------------------------- */

  // Restore a saved draft and default the time zone to the browser's, after mount only.
  useEffect(() => {
    browserZoneRef.current = browserTimeZone();
    const stored = readStoredDraft();
    if (stored) {
      // An explicit ?store= link wins over the venue in an older draft.
      const base: SubmissionDraft = preselected
        ? {
            ...stored.draft,
            venue: { ...stored.draft.venue, mode: "store", storeSlug: preselected.slug },
            schedule: { ...stored.draft.schedule, timeZone: preselected.timeZone },
            fee: { ...stored.draft.fee, currency: currencyForCountry(preselected.country) },
          }
        : stored.draft;
      // A store venue always uses the store's zone; older drafts could override it.
      const venueStore = base.venue.mode === "store" ? stores.find((s) => s.slug === base.venue.storeSlug) : undefined;
      const restored: SubmissionDraft =
        venueStore && base.schedule.timeZone !== venueStore.timeZone
          ? { ...base, schedule: { ...base.schedule, timeZone: venueStore.timeZone } }
          : base;
      // Resume where they left off, unless an earlier step no longer validates (e.g. its date has passed).
      const context: ValidationContext = { today: localDateKeyOf(new Date()), storeSlugs };
      const firstInvalid = STEPS.slice(0, stored.step).findIndex((s) => hasErrors(validateStep(s.id, restored, context)));
      const resumeAt = firstInvalid === -1 ? stored.step : firstInvalid;
      dirtyRef.current = true;
      setDraft(restored);
      setStepIndex(resumeAt);
      setMaxVisited(Math.max(stored.maxVisited, resumeAt));
      setRestoredAt(stored.savedAt);
      setSavedAt(stored.savedAt);
      if (firstInvalid !== -1) markAttempted(STEPS[firstInvalid].id);
    }
    const zone = browserZoneRef.current;
    if (zone) {
      setDraft((prev) => (prev.schedule.timeZone ? prev : { ...prev, schedule: { ...prev.schedule, timeZone: zone } }));
    }
  }, [preselected, stores, storeSlugs, markAttempted]);

  // Debounced autosave.
  useEffect(() => {
    latestRef.current = { draft, stepIndex, maxVisited };
    if (!dirtyRef.current || phase.kind === "success") return;
    const id = window.setTimeout(() => {
      // Re-check: a submit or discard may have cleared storage before this render's cleanup ran.
      if (!dirtyRef.current) return;
      const at = new Date().toISOString();
      if (writeStoredDraft({ savedAt: at, step: stepIndex, maxVisited, draft })) setSavedAt(at);
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [draft, stepIndex, maxVisited, phase.kind]);

  // Flush a pending autosave when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return;
      const { draft: latest, stepIndex: at, maxVisited: max } = latestRef.current;
      writeStoredDraft({ savedAt: new Date().toISOString(), step: at, maxVisited: max, draft: latest });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  // Move focus after navigation or a failed validation, once the new step has rendered.
  useEffect(() => {
    if (!focusRequest) return;
    const form = formRef.current;
    if (focusRequest.target === "invalid" && form && focusFirstInvalid(form)) return;
    const heading = headingRef.current;
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  }, [focusRequest]);

  /* ------------------------------ navigation ------------------------------- */

  function goTo(index: number, focus: FocusRequest["target"] = "heading") {
    setStepIndex(index);
    setMaxVisited((max) => Math.max(max, index));
    setSubmitError(null);
    setAnnouncement("");
    setFocusRequest({ target: focus });
  }

  function reportErrors(errors: FieldErrors) {
    const count = Object.keys(errors).length;
    setAnnouncement(`${count} ${count === 1 ? "answer needs" : "answers need"} attention before you continue.`);
    setFocusRequest({ target: "invalid" });
  }

  function next() {
    const errors = validateStep(step.id, draft, handlerContext());
    markAttempted(step.id);
    if (hasErrors(errors)) {
      reportErrors(errors);
      return;
    }
    goTo(Math.min(stepIndex + 1, LAST_STEP));
  }

  function back() {
    goTo(Math.max(stepIndex - 1, 0));
  }

  /** Stepper / "Edit" navigation. Moving forward validates every step on the way. */
  function jumpTo(index: number) {
    if (index === stepIndex || submitting) return;
    if (index > stepIndex) {
      const context = handlerContext();
      for (let i = stepIndex; i < index; i++) {
        if (hasErrors(validateStep(STEPS[i].id, draft, context))) {
          markAttempted(STEPS[i].id);
          goTo(i, "invalid");
          return;
        }
      }
    }
    goTo(index);
  }

  function showStepWithErrors(errors: FieldErrors) {
    const first = firstStepWithErrors(errors) ?? "review";
    markAttempted(first);
    if (indexOf(first) === stepIndex) reportErrors(errors);
    else goTo(indexOf(first), "invalid");
  }

  /* -------------------------------- submit --------------------------------- */

  async function submit() {
    if (submitting) return;
    const result = validateSubmission(draft, handlerContext());
    if (!result.ok) {
      showStepWithErrors(result.errors);
      return;
    }

    setPhase({ kind: "submitting" });
    setSubmitError(null);
    const body: SubmissionRequest = { ...result.value, ...(honeypot ? { website: honeypot } : {}) };
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await res.json().catch(() => null);

      if (res.ok && isSubmissionResponse(payload)) {
        clearStoredDraft();
        dirtyRef.current = false;
        setSavedAt(null);
        setRestoredAt(null);
        setPhase({ kind: "success", response: payload, submission: result.value });
        return;
      }

      setPhase({ kind: "editing" });
      const error = isErrorResponse(payload) ? payload : null;
      if (res.status === 422 && error?.errors && hasErrors(error.errors)) {
        setServerErrors(error.errors);
        showStepWithErrors(error.errors);
        return;
      }
      setSubmitError(
        error?.error ??
          (res.status === 429
            ? "You've sent several submissions in a short time. Please wait a few minutes and try again."
            : `Something went wrong on our side (${res.status}). Please try again.`),
      );
    } catch {
      setPhase({ kind: "editing" });
      setSubmitError(
        "We couldn't reach the server. Check your connection and try again. Your draft is still saved on this device.",
      );
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isReview) void submit();
    else next();
  }

  /* ------------------------------ resets ---------------------------------- */

  function resetTo(nextDraft: SubmissionDraft, index: number) {
    setDraft(nextDraft);
    setStepIndex(index);
    setMaxVisited(index);
    setAttempted(new Set());
    setServerErrors({});
    setSubmitError(null);
    setHoneypot("");
    setRestoredAt(null);
    setSavedAt(null);
    setAnnouncement("");
    setPhase({ kind: "editing" });
    setFocusRequest({ target: "heading" });
  }

  function freshDraft(): SubmissionDraft {
    return createEmptyDraft({ store: preselected, timeZone: browserZoneRef.current });
  }

  function discardDraft() {
    clearStoredDraft();
    dirtyRef.current = false;
    resetTo(freshDraft(), 0);
  }

  /** Start a new listing, keeping who is organising and where. */
  function submitAnother() {
    const base = freshDraft();
    dirtyRef.current = false;
    resetTo(
      {
        ...base,
        organiser: draft.organiser,
        venue: draft.venue,
        schedule: { ...base.schedule, timeZone: draft.schedule.timeZone },
        fee: { ...base.fee, currency: draft.fee.currency },
      },
      1,
    );
  }

  /* ------------------------------- derived -------------------------------- */

  const errors = useMemo<FieldErrors>(() => {
    const live = ctx && attempted.has(step.id) ? validateStep(step.id, draft, ctx) : {};
    return { ...serverErrors, ...live };
  }, [ctx, attempted, step.id, draft, serverErrors]);

  const stepStates = useMemo<StepState[]>(
    () =>
      STEPS.map((s, i) => {
        if (i === stepIndex) return "current";
        if (i > maxVisited) return "upcoming";
        if (i === LAST_STEP || !ctx) return "visited";
        const valid = !hasErrors(validateStep(s.id, draft, ctx));
        if (valid) return "complete";
        return i < stepIndex || attempted.has(s.id) ? "error" : "visited";
      }),
    [stepIndex, maxVisited, ctx, draft, attempted],
  );

  const preview = useMemo(
    () => (isReview && ctx ? previewSubmission(draft, ctx) : null),
    [isReview, ctx, draft],
  );

  if (phase.kind === "success") {
    return (
      <SubmitSuccess
        response={phase.response}
        submission={phase.submission}
        stores={stores}
        onSubmitAnother={submitAnother}
      />
    );
  }

  const stepProps: StepProps = { draft, errors, patch, set };

  return (
    <section aria-label="Event submission" className={cx(surface.card, "relative p-4 sm:p-6 lg:p-8")}>
      {restoredAt && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200">
          <History className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            Draft restored
            {now && <span className="text-sky-200/70"> · saved {formatRelative(restoredAt, now)}</span>}
          </p>
          <button type="button" onClick={discardDraft} className={miniButton.info}>
            Discard
          </button>
          <button
            type="button"
            onClick={() => setRestoredAt(null)}
            className={miniButton.infoIcon}
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <Stepper current={stepIndex} states={stepStates} onSelect={jumpTo} />

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        aria-busy={submitting || undefined}
        className="mt-6 border-t border-shadow-700 pt-6 sm:mt-8 sm:pt-8"
      >
        <StepFrame step={step} index={stepIndex} total={STEPS.length} headingRef={headingRef}>
          {step.id === "organiser" && <OrganiserStep {...stepProps} stores={stores} />}
          {step.id === "details" && <DetailsStep {...stepProps} />}
          {step.id === "schedule" && <ScheduleStep {...stepProps} today={today} stores={stores} />}
          {step.id === "registration" && <RegistrationStep {...stepProps} today={today} />}
          {step.id === "review" && (
            <ReviewStep
              {...stepProps}
              submission={preview}
              stores={stores}
              onEdit={(id) => jumpTo(indexOf(id))}
              onFixFirstIssue={() => {
                const context = handlerContext();
                const firstInvalid = STEPS.findIndex((s) => s.id !== "review" && hasErrors(validateStep(s.id, draft, context)));
                if (firstInvalid !== -1) {
                  markAttempted(STEPS[firstInvalid].id);
                  goTo(firstInvalid, "invalid");
                }
              }}
              honeypot={honeypot}
              onHoneypotChange={setHoneypot}
            />
          )}
        </StepFrame>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        {/* Always mounted so screen readers pick up the message when it appears. */}
        <div role="alert">
          {submitError && (
            <p className="mt-6 flex items-start gap-2 rounded-lg border border-blood-500/50 bg-blood-500/10 px-3 py-2.5 text-sm text-rose-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {submitError}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-shadow-700 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            {stepIndex > 0 ? (
              <button type="button" onClick={back} disabled={submitting} className={button.secondary}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
            ) : (
              <span />
            )}
            {savedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs text-ash-400">
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                Draft saved on this device
              </span>
            )}
          </div>
          {isReview ? (
            <button type="submit" disabled={submitting} className={cx(button.primary, "w-full sm:w-auto")}>
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          ) : (
            <button type="submit" className={cx(button.primary, "w-full sm:w-auto")}>
              {/* One flex item, so the button's gap doesn't split "Next" from ": Event details". */}
              <span>
                Next<span className="hidden sm:inline">: {STEPS[stepIndex + 1]?.title}</span>
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
