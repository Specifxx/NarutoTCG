"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * setTimeout bookkeeping for the evaluation sequence. `clear()` cancels
 * everything still pending (skip, retry) and unmounting cancels it too.
 */
export function useScheduler() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const clear = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current.clear();
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  useEffect(() => clear, [clear]);

  return { schedule, clear };
}

/** Tracks a CSS media query. Widgets render client-only, so the first value is already correct. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
