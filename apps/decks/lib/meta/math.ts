/** Small numeric helpers for the meta engine. Every function is total: no NaN comes out. */

/** Clamps to [0, 1]; NaN maps to 0. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** numerator / denominator, or 0 when the denominator is not positive. */
export function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/** Maps `value` linearly so that `lo` → 0 and `hi` → 1, clamped to [0, 1]. */
export function linearScale(value: number, [lo, hi]: readonly [number, number]): number {
  if (hi === lo) return value >= hi ? 1 : 0;
  return clamp01((value - lo) / (hi - lo));
}

/**
 * Wilson score interval for a binomial proportion. `successes` may be fractional (draws
 * count half). Returns the uninformative [0, 1] when `n <= 0`; callers usually report
 * "no data" instead.
 */
export function wilsonInterval(successes: number, n: number, z = 1.96): [number, number] {
  if (!(n > 0)) return [0, 1];
  const p = clamp01(successes / n);
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  // Exact endpoints at 0 and n successes; the closed form drifts by ~1e-17 there.
  return [p === 0 ? 0 : clamp01(center - margin), p === 1 ? 1 : clamp01(center + margin)];
}
