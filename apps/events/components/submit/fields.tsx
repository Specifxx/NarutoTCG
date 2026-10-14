import { TriangleAlert, type LucideIcon } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cx } from "@/lib/format";
import { field } from "@/lib/styles";
import type { FieldErrors, StepMeta, SubmissionDraft } from "@/lib/submission";

/** Object-valued sections of the draft, which `patch` merges into. */
export type DraftSection = {
  [K in keyof SubmissionDraft]: SubmissionDraft[K] extends readonly unknown[]
    ? never
    : SubmissionDraft[K] extends object
      ? K
      : never;
}[keyof SubmissionDraft];

/** State + actions every step component receives from the wizard. */
export interface StepProps {
  draft: SubmissionDraft;
  errors: FieldErrors;
  patch: <K extends DraftSection>(section: K, value: Partial<SubmissionDraft[K]>) => void;
  set: <K extends keyof SubmissionDraft>(key: K, value: SubmissionDraft[K]) => void;
}

/**
 * Form primitives for the submission wizard. Every control is keyed by its
 * submission field path ("organiser.email"), which gives it a stable DOM id, so
 * server-side 422 errors and client validation map onto the same element.
 */

export function fieldId(path: string): string {
  return `submit-${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
}

const hintIdOf = (path: string) => `${fieldId(path)}-hint`;
const errorIdOf = (path: string) => `${fieldId(path)}-error`;

/** id / name / aria-invalid / aria-describedby (and aria-required) for a control. */
export function controlProps(path: string, error: string | undefined, hasHint: boolean, required = false) {
  const describedBy = [hasHint && hintIdOf(path), error && errorIdOf(path)].filter(Boolean).join(" ");
  return {
    id: fieldId(path),
    name: path,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    "aria-required": required || undefined,
  } as const;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900";

/**
 * Compact text buttons used inside the wizard (Edit, Copy, Discard…). Kept as
 * complete recipes rather than overrides of \`button.ghost\`, because conflicting
 * utilities are resolved by stylesheet order, not class order.
 */
export const miniButton = {
  accent: `inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-chakra-400 transition-colors hover:bg-shadow-800 hover:text-chakra-500 ${focusRing}`,
  muted: `inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ash-400 transition-colors hover:bg-shadow-800 hover:text-ash-200 ${focusRing}`,
  info: `inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 hover:text-white ${focusRing}`,
  /** Square icon button, pair with aria-label. */
  infoIcon: `inline-flex h-7 w-7 items-center justify-center rounded-md text-sky-200 transition-colors hover:bg-sky-500/15 hover:text-white ${focusRing}`,
  dangerIcon: `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-shadow-700 text-ash-400 transition-colors hover:border-blood-500/60 hover:text-rose-300 ${focusRing}`,
} as const;

export function OptionalTag() {
  return <span className="ml-1.5 text-xs font-normal text-ash-400">(optional)</span>;
}

export function FieldHint({ path, children }: { path: string; children: ReactNode }) {
  return (
    <p id={hintIdOf(path)} className={field.hint}>
      {children}
    </p>
  );
}

export function FieldError({ path, error }: { path: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={errorIdOf(path)} className={cx(field.error, "flex items-start gap-1.5")}>
      <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  );
}

interface FieldFrameProps {
  path: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
}

function FieldFrame({
  path,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldFrameProps & { children: ReactNode }) {
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={fieldId(path)} className={field.label}>
        {label}
        {optional && <OptionalTag />}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <FieldHint path={path}>{hint}</FieldHint>}
      <FieldError path={path} error={error} />
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "className" | "aria-invalid">;

export function TextField({
  path,
  label,
  hint,
  error,
  optional,
  className,
  inputClassName,
  inputRef,
  ...input
}: FieldFrameProps & InputProps & { inputClassName?: string; inputRef?: Ref<HTMLInputElement> }) {
  return (
    <FieldFrame path={path} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input
        ref={inputRef}
        type="text"
        {...input}
        {...controlProps(path, error, !!hint, !optional)}
        className={cx(field.input, inputClassName)}
      />
    </FieldFrame>
  );
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "name" | "className" | "aria-invalid">;

export function TextAreaField({ path, label, hint, error, optional, className, ...textarea }: FieldFrameProps & TextAreaProps) {
  return (
    <FieldFrame path={path} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea {...textarea} {...controlProps(path, error, !!hint, !optional)} className={cx(field.input, "min-h-32 resize-y leading-relaxed")} />
    </FieldFrame>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "name" | "className" | "aria-invalid">;

export function SelectField({
  path,
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...select
}: FieldFrameProps & SelectProps & { children: ReactNode }) {
  return (
    <FieldFrame path={path} label={label} hint={hint} error={error} optional={optional} className={className}>
      <select
        {...select}
        {...controlProps(path, error, !!hint, !optional)}
        className={cx(field.select, "aria-[invalid=true]:border-rose-400/70")}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

/** Checkbox with a label and optional description, laid out as a tappable row. */
export function CheckboxField({
  path,
  label,
  hint,
  error,
  checked,
  onChange,
  required = false,
  className,
}: {
  path: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          {...controlProps(path, error, !!hint, required)}
          className={cx(field.checkbox, "mt-0.5 shrink-0 cursor-pointer")}
        />
        <div className="min-w-0">
          <label htmlFor={fieldId(path)} className="cursor-pointer text-sm font-medium text-ash-200">
            {label}
          </label>
          {hint && <FieldHint path={path}>{hint}</FieldHint>}
        </div>
      </div>
      <FieldError path={path} error={error} />
    </div>
  );
}

export interface RadioCardOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Classes applied to the icon chip, e.g. an event type's colours. */
  iconClassName?: string;
  /** Classes applied to the card while selected (defaults to the chakra accent). */
  selectedClassName?: string;
}

/**
 * Native radio buttons styled as cards. The group carries role="radiogroup" so it
 * can expose aria-invalid; arrow keys move between options as usual.
 */
export function RadioCardGroup<T extends string>({
  path,
  label,
  hint,
  error,
  options,
  value,
  onChange,
  columns = "sm:grid-cols-2",
  compact = false,
}: {
  path: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: readonly RadioCardOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  columns?: string;
  compact?: boolean;
}) {
  const labelId = `${fieldId(path)}-label`;
  const { id, name, ...aria } = controlProps(path, error, !!hint, true);
  return (
    <div className="min-w-0">
      <p id={labelId} className={field.label}>
        {label}
      </p>
      {hint && <FieldHint path={path}>{hint}</FieldHint>}
      <div role="radiogroup" id={id} aria-labelledby={labelId} {...aria} className={cx("mt-2 grid gap-3", columns)}>
        {options.map((option) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className={cx(
                "relative flex cursor-pointer items-start gap-3 rounded-lg border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-chakra-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-shadow-950",
                compact ? "px-3 py-2.5" : "p-4",
                selected
                  ? (option.selectedClassName ?? "border-chakra-500 bg-chakra-500/10")
                  : cx(
                      "bg-shadow-900 hover:border-shadow-500",
                      error ? "border-rose-400/50" : "border-shadow-700",
                    ),
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {Icon && (
                <span
                  className={cx(
                    "flex shrink-0 items-center justify-center rounded-md",
                    compact ? "h-8 w-8" : "h-10 w-10",
                    option.iconClassName ?? (selected ? "bg-chakra-500/20 text-chakra-400" : "bg-shadow-800 text-ash-400"),
                  )}
                >
                  <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={cx("block text-sm font-semibold", selected ? "text-white" : "text-ash-200")}>
                  {option.label}
                </span>
                {option.description && <span className="mt-0.5 block text-xs text-ash-400">{option.description}</span>}
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-chakra-400" : "border-shadow-500",
                )}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-chakra-400" />}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError path={path} error={error} />
    </div>
  );
}

/** Wrapper for one wizard step: a fieldset whose legend is the focusable step heading. */
export function StepFrame({
  step,
  index,
  total,
  headingRef,
  children,
}: {
  step: StepMeta;
  index: number;
  total: number;
  headingRef: Ref<HTMLHeadingElement>;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-6 w-full">
        <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-chakra-400">
          Step {index + 1} of {total}
        </span>
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-10 text-xl font-semibold text-white outline-none">
          {step.title}
        </h2>
        <span className="mt-1 block text-sm text-ash-400">{step.description}</span>
      </legend>
      <div className="space-y-8">{children}</div>
    </fieldset>
  );
}

/** Titled group of fields inside a step. */
export function FieldSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="border-b border-shadow-700 pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ash-200">{title}</h3>
        {description && <p className="mt-1 text-sm text-ash-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}
