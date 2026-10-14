"use client";

import { useEffect, useState } from "react";

/**
 * Current time, refreshed every `intervalMs`. Returns `null` during server render
 * and the first client render so time-dependent UI never causes a hydration
 * mismatch — render a placeholder until it is non-null.
 */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
