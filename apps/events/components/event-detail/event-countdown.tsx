"use client";

import type { EventStatus } from "@naruto-tcg/types";
import { Ban, CirclePause, Flag } from "lucide-react";
import type { ReactNode } from "react";
import { cx, pluralize } from "@/lib/format";
import { formatRelative, splitDuration } from "@/lib/time";
import { useNow } from "@/lib/use-now";

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hrs" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
] as const;

/**
 * Live "Starts in" countdown. Ticks once a second after mount; before that it
 * renders a same-sized placeholder so hydration and layout stay stable.
 */
export function EventCountdown({ startsAt, endsAt, status }: { startsAt: string; endsAt: string; status: EventStatus }) {
  const now = useNow(1000);

  if (status === "cancelled") {
    return (
      <Message icon={<Ban className="h-5 w-5 text-rose-300" aria-hidden="true" />} title="Event cancelled">
        This event won&apos;t go ahead.
      </Message>
    );
  }
  if (status === "postponed") {
    return (
      <Message icon={<CirclePause className="h-5 w-5 text-amber-300" aria-hidden="true" />} title="Postponed">
        New date to be announced.
      </Message>
    );
  }

  if (!now) {
    return (
      <div>
        <div className="h-4 w-20 animate-pulse rounded bg-shadow-700/70" aria-hidden="true" />
        <div className="mt-2 grid grid-cols-4 gap-2" aria-hidden="true">
          {UNITS.map((unit) => (
            <Cell key={unit.key} value="––" label={unit.label} muted />
          ))}
        </div>
        <span className="sr-only">Loading countdown…</span>
      </div>
    );
  }

  const t = now.getTime();
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);

  if (t >= end) {
    return (
      <Message icon={<Flag className="h-5 w-5 text-ash-400" aria-hidden="true" />} title="Event ended">
        Finished <time dateTime={endsAt}>{relativeOrJustNow(endsAt, now)}</time>.
      </Message>
    );
  }

  if (t >= start) {
    const left = splitDuration(end - t);
    const endsIn = left.days > 0 ? `${left.days}d ${left.hours}h` : `${left.hours}h ${left.minutes}m`;
    return (
      <div>
        <p className="flex items-center gap-2.5 text-lg font-semibold text-emerald-300">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          Happening now
        </p>
        <p className="mt-1 text-sm text-ash-400 tabular-nums">Ends in {endsIn}</p>
      </div>
    );
  }

  const left = splitDuration(start - t);
  const spoken = [
    left.days > 0 ? pluralize(left.days, "day") : null,
    left.hours > 0 ? pluralize(left.hours, "hour") : null,
    pluralize(left.minutes, "minute"),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ash-400">Starts in</p>
      {/* role="timer" is implicitly aria-live="off", so the label is read on demand, not every second. */}
      <div role="timer" aria-label={`Starts in ${spoken}`} className="mt-2 grid grid-cols-4 gap-2">
        {UNITS.map((unit) => (
          <Cell key={unit.key} value={String(left[unit.key]).padStart(2, "0")} label={unit.label} />
        ))}
      </div>
    </div>
  );
}

function Cell({ value, label, muted = false }: { value: string; label: string; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-shadow-700 bg-shadow-950/60 px-1 py-2 text-center" aria-hidden="true">
      <span className={cx("block text-2xl font-bold leading-none tabular-nums", muted ? "text-shadow-500" : "text-white")}>
        {value}
      </span>
      <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-ash-400">{label}</span>
    </div>
  );
}

function Message({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-shadow-800">{icon}</span>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-ash-400">{children}</p>
      </div>
    </div>
  );
}

function relativeOrJustNow(iso: string, now: Date): string {
  const label = formatRelative(iso, now);
  return label === "now" ? "just now" : label;
}
