"use client";

import { splitDuration } from "@/lib/time";
import { useNow } from "@/lib/use-now";

export type CountdownState = "upcoming" | "live" | "ended";

/** ISO UTC instants a countdown needs; structurally matches `MilestoneTiming`. */
export interface CountdownTiming {
  startsAt: string;
  endsAt: string;
  /** Start of the wait, for `progress`. Without it progress stays 0 until the start. */
  announcedAt?: string;
}

export interface Countdown {
  /** Time left until the start (upcoming) or the end (live); zero once ended. */
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  state: CountdownState;
  /** Share of the announcement → start wait that has elapsed, 0–1 (1 once started). */
  progress: number;
}

export function computeCountdown(timing: CountdownTiming, now: Date): Countdown {
  const t = now.getTime();
  const start = Date.parse(timing.startsAt);
  const end = Date.parse(timing.endsAt);
  const state: CountdownState = t < start ? "upcoming" : t < end ? "live" : "ended";

  const target = state === "upcoming" ? start : state === "live" ? end : t;
  // Round up to whole seconds so the display reads 00:00:01 (not 00:00:00) during the final second.
  const remaining = Math.ceil((target - t) / 1000) * 1000;

  let progress = 1;
  if (state === "upcoming") {
    const announced = timing.announcedAt ? Date.parse(timing.announcedAt) : Number.NaN;
    progress = Number.isFinite(announced) && announced < start ? clamp01((t - announced) / (start - announced)) : 0;
  }

  return { ...splitDuration(remaining), state, progress };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Live countdown for `timing`, re-evaluated every `intervalMs`. Returns `null` on the
 * server and during hydration (it depends on the viewer's clock), so callers must
 * render a same-sized placeholder until it is non-null.
 */
export function useCountdown(timing: CountdownTiming, intervalMs = 1000): Countdown | null {
  const now = useNow(intervalMs);
  return now ? computeCountdown(timing, now) : null;
}
