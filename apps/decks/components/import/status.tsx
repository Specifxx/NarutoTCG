import { cx } from "@naruto-tcg/ui";
import type { IngestSeverity } from "@/lib/ingest/types";
import { ErrorIcon, InfoIcon, WarningIcon } from "./icons";

const ICON = { error: ErrorIcon, warning: WarningIcon, info: InfoIcon } as const;
const ICON_COLOR: Record<IngestSeverity, string> = {
  error: "text-status-critical",
  warning: "text-status-warning",
  info: "text-ash-300",
};

export function SeverityIcon({ severity, className }: { severity: IngestSeverity; className?: string }) {
  const Icon = ICON[severity];
  return <Icon className={cx("h-4 w-4 shrink-0", ICON_COLOR[severity], className)} />;
}

/** Icon + text label; the label stays in text ink, the icon carries the status color. */
export function SeverityTag({ severity, label }: { severity: IngestSeverity; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ash-100">
      <SeverityIcon severity={severity} className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/** Inline field error: icon + message, referenced by the field's aria-describedby. */
export function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-xs font-medium text-ash-100">
      <SeverityIcon severity="error" className="mt-px h-3.5 w-3.5" />
      <span>
        <span className="sr-only">Error: </span>
        {message}
      </span>
    </p>
  );
}
