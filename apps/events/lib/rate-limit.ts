/**
 * Sliding-window rate limiter kept in process memory.
 *
 * A placeholder for a shared store (e.g. Redis): state resets on restart and is
 * per instance. Memory is bounded by `maxKeys`; idle keys are pruned first, then
 * the longest-tracked key is evicted.
 */
export interface RateLimiter {
  readonly max: number;
  readonly windowMs: number;
  /** Hit timestamps for `key` inside the window, oldest first. */
  recent(key: string, now: number): number[];
  /** True when `key` has used its allowance. */
  isLimited(key: string, now: number): boolean;
  record(key: string, now: number): void;
  /** Whole seconds until the oldest hit leaves the window (at least 1). */
  retryAfterSeconds(key: string, now: number): number;
}

export function createRateLimiter({
  max,
  windowMs,
  maxKeys = 10_000,
}: {
  max: number;
  windowMs: number;
  maxKeys?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  const recent = (key: string, now: number) => {
    const inWindow = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (inWindow.length) hits.set(key, inWindow);
    else hits.delete(key);
    return inWindow;
  };

  return {
    max,
    windowMs,
    recent,
    isLimited: (key, now) => recent(key, now).length >= max,
    record(key, now) {
      if (hits.size >= maxKeys && !hits.has(key)) {
        for (const [k, times] of hits) {
          if (times.every((t) => now - t >= windowMs)) hits.delete(k);
        }
        const oldest = hits.keys().next();
        if (hits.size >= maxKeys && !oldest.done) hits.delete(oldest.value);
      }
      hits.set(key, [...recent(key, now), now]);
    },
    retryAfterSeconds(key, now) {
      const [oldest] = recent(key, now);
      return oldest === undefined ? 1 : Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    },
  };
}
