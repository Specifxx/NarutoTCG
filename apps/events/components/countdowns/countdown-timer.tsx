"use client";

import { Hourglass } from "lucide-react";
import { useState } from "react";
import { cx, pluralize } from "@/lib/format";
import { useCountdown, type Countdown, type CountdownState, type CountdownTiming } from "./use-countdown";

export type CountdownSize = "hero" | "card" | "badge";

export interface CountdownTimerProps {
  timing: CountdownTiming;
  size: CountdownSize;
  /** Static screen-reader text, e.g. "Starts Sat, Nov 21, 2026 at 10:00 AM PST". */
  description: string;
  /** Short name shown in the badge and used in state-change announcements, e.g. "BCGF Los Angeles". */
  label: string;
  className?: string;
}

const UNITS = [
  { key: "days", long: "Days", short: "Days" },
  { key: "hours", long: "Hours", short: "Hrs" },
  { key: "minutes", long: "Minutes", short: "Min" },
  { key: "seconds", long: "Seconds", short: "Sec" },
] as const;

const PLACEHOLDER = "--";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function unitValue(countdown: Countdown | null, key: (typeof UNITS)[number]["key"]): string {
  if (!countdown) return PLACEHOLDER;
  return key === "days" ? String(countdown.days) : pad(countdown[key]);
}

/** Coarse, hourly-changing summary for assistive tech; the ticking digits are hidden from it. */
function screenReaderText(description: string, countdown: Countdown | null): string {
  if (!countdown) return `${description}.`;
  const { days, hours, minutes } = countdown;
  let left: string;
  if (days > 0) left = `${pluralize(days, "day")}, ${pluralize(hours, "hour")}`;
  else if (hours > 0) left = `${pluralize(hours, "hour")}, ${pluralize(minutes, "minute")}`;
  else left = minutes > 0 ? pluralize(minutes, "minute") : "less than a minute";
  switch (countdown.state) {
    case "upcoming":
      return `${description}. ${left} to go.`;
    case "live":
      return `Live now. Ends in ${left}.`;
    case "ended":
      return "Ended.";
  }
}

/**
 * Announces live/ended transitions observed while the page is open, never the
 * initial state, so screen readers hear one message rather than every tick.
 */
function useStateAnnouncement(state: CountdownState | null, label: string): string {
  const [previous, setPrevious] = useState<CountdownState | null>(state);
  const [message, setMessage] = useState("");
  if (state !== previous) {
    setPrevious(state);
    if (previous !== null && state !== null) {
      setMessage(state === "live" ? `${label} is live now.` : state === "ended" ? `${label} has ended.` : "");
    }
  }
  return message;
}

/**
 * Segmented live countdown. Renders "--" placeholders with the same layout until
 * mounted so there is no hydration mismatch or layout shift. While a milestone is
 * live it counts down to its end instead.
 */
export function CountdownTimer({ timing, size, description, label, className }: CountdownTimerProps) {
  const countdown = useCountdown(timing);
  const announcement = useStateAnnouncement(countdown?.state ?? null, label);

  if (size === "badge") return <BadgeTimer countdown={countdown} description={description} label={label} className={className} />;

  const hero = size === "hero";
  const ended = countdown?.state === "ended";

  return (
    <div className={className}>
      <TimerCaption countdown={countdown} hero={hero} />
      <div
        aria-hidden="true"
        className={cx("grid grid-cols-4", hero ? "@container mt-3 gap-2 sm:gap-3" : "mt-2 gap-1.5")}
      >
        {UNITS.map((unit) =>
          hero ? (
            <HeroTile
              key={unit.key}
              value={unitValue(countdown, unit.key)}
              label={unit.long}
              shortLabel={unit.short}
              muted={!countdown || ended}
            />
          ) : (
            <CardTile key={unit.key} value={unitValue(countdown, unit.key)} label={unit.short} muted={!countdown || ended} />
          ),
        )}
      </div>
      <p className="sr-only">{screenReaderText(description, countdown)}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

/** Compact inline variant for embedding: "BCGF Los Angeles · 37d 04h". */
export function CountdownBadge(props: Omit<CountdownTimerProps, "size">) {
  return <CountdownTimer {...props} size="badge" />;
}

function TimerCaption({ countdown, hero }: { countdown: Countdown | null; hero: boolean }) {
  // Fixed 1rem line box so the caption and its pre-mount skeleton occupy the same height.
  const text = hero ? "text-xs leading-4 tracking-[0.2em]" : "text-[11px] leading-4 tracking-wider";
  if (!countdown) {
    return <span aria-hidden="true" className={cx("block h-4 animate-pulse rounded bg-shadow-700/70", hero ? "w-24" : "w-16")} />;
  }
  if (countdown.state === "live") {
    return (
      <p aria-hidden="true" className={cx("flex items-center gap-2 font-semibold uppercase text-emerald-300", text)}>
        <LiveDot />
        Live now · ends in
      </p>
    );
  }
  return (
    <p aria-hidden="true" className={cx("font-semibold uppercase text-ash-400", text)}>
      {countdown.state === "ended" ? "Ended" : "Starts in"}
    </p>
  );
}

function HeroTile({
  value,
  label,
  shortLabel,
  muted,
}: {
  value: string;
  label: string;
  shortLabel: string;
  muted: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-xl border border-chakra-500/35 bg-linear-to-b from-chakra-500/15 via-shadow-900/90 to-shadow-950 px-1 py-3 shadow-[0_0_32px_-10px_rgb(242_92_0/0.7),inset_0_1px_0_rgb(255_255_255/0.06)] sm:py-5">
      <span
        className={cx(
          "text-[clamp(1.75rem,10cqw,4.5rem)] font-black leading-none tabular-nums",
          muted
            ? "text-shadow-500"
            : "bg-linear-to-b from-white via-white to-chakra-400 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgb(255_122_26/0.45)]",
        )}
      >
        {value}
      </span>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-chakra-400/80 sm:text-xs">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </div>
  );
}

function CardTile({ value, label, muted }: { value: string; label: string; muted: boolean }) {
  return (
    <div className="rounded-lg border border-shadow-700 bg-shadow-950/60 px-1 py-2 text-center">
      <span className={cx("block text-xl font-bold leading-none tabular-nums sm:text-2xl", muted ? "text-shadow-500" : "text-white")}>
        {value}
      </span>
      <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-ash-400">{label}</span>
    </div>
  );
}

function compactRemaining(countdown: Countdown | null): string {
  if (!countdown) return `${PLACEHOLDER}d ${PLACEHOLDER}h`;
  if (countdown.state === "live") return "Live now";
  if (countdown.state === "ended") return "Ended";
  if (countdown.days > 0) return `${countdown.days}d ${pad(countdown.hours)}h`;
  if (countdown.hours > 0) return `${countdown.hours}h ${pad(countdown.minutes)}m`;
  return `${countdown.minutes}m ${pad(countdown.seconds)}s`;
}

function BadgeTimer({
  countdown,
  description,
  label,
  className,
}: {
  countdown: Countdown | null;
  description: string;
  label: string;
  className?: string;
}) {
  const live = countdown?.state === "live";
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-2 rounded-full border bg-shadow-950/80 py-1 pl-2 pr-3 text-xs font-medium text-ash-200",
        live
          ? "border-emerald-400/50 shadow-[0_0_18px_-6px_rgb(52_211_153/0.6)]"
          : "border-chakra-500/40 shadow-[0_0_18px_-6px_rgb(242_92_0/0.6)]",
        className,
      )}
    >
      {live ? <LiveDot /> : <Hourglass className="h-3.5 w-3.5 shrink-0 text-chakra-400" aria-hidden="true" />}
      <span className="min-w-0 truncate">{label}</span>
      <span aria-hidden="true" className="text-shadow-500">
        ·
      </span>
      <span
        aria-hidden="true"
        className={cx("shrink-0 font-semibold tabular-nums", live ? "text-emerald-300" : countdown ? "text-white" : "text-shadow-500")}
      >
        {compactRemaining(countdown)}
      </span>
      <span className="sr-only">{`, ${screenReaderText(description, countdown)}`}</span>
    </span>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}
