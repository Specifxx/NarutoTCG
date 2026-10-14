import type { EventFormat, EventStatus, EventType } from "@naruto-tcg/types";
import { BadgeCheck, Ban, CirclePause } from "lucide-react";
import { eventFormatMeta, eventTypeMeta } from "@/lib/event-meta";
import { cx } from "@/lib/format";

const base = "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap";
const sizes = { sm: "px-2 py-0.5 text-[11px]", md: "px-2.5 py-0.5 text-xs" } as const;

export function EventTypeBadge({
  type,
  size = "md",
  short = false,
  className,
}: {
  type: EventType;
  size?: keyof typeof sizes;
  short?: boolean;
  className?: string;
}) {
  const meta = eventTypeMeta(type);
  const Icon = meta.icon;
  return (
    <span className={cx(base, sizes[size], meta.classes.border, meta.classes.bg, meta.classes.text, className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {short ? meta.shortLabel : meta.label}
    </span>
  );
}

export function FormatBadge({
  format,
  size = "md",
  className,
}: {
  format: EventFormat;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const meta = eventFormatMeta(format);
  const Icon = meta.icon;
  return (
    <span className={cx(base, sizes[size], "border-shadow-500/60 bg-shadow-800 text-ash-200", className)}>
      <Icon className="h-3 w-3 shrink-0 text-ash-400" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Renders nothing for scheduled events. */
export function StatusBadge({ status, size = "md" }: { status: EventStatus; size?: keyof typeof sizes }) {
  if (status === "scheduled") return null;
  const cancelled = status === "cancelled";
  const Icon = cancelled ? Ban : CirclePause;
  return (
    <span
      className={cx(
        base,
        sizes[size],
        cancelled ? "border-blood-500/60 bg-blood-500/15 text-rose-300" : "border-amber-400/50 bg-amber-500/10 text-amber-300",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {cancelled ? "Cancelled" : "Postponed"}
    </span>
  );
}

export function VerifiedBadge({ label = "Verified", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cx(
        base,
        sizes.md,
        "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
