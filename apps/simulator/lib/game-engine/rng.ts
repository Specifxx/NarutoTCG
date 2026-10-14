/** Deterministic mulberry32 PRNG. The state lives in the game so every game is replayable from its seed. */
export interface RngHolder {
  rng: number;
}

export function nextFloat(holder: RngHolder): number {
  let t = (holder.rng = (holder.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nextInt(holder: RngHolder, maxExclusive: number): number {
  return Math.floor(nextFloat(holder) * maxExclusive);
}

/** In-place Fisher–Yates shuffle. */
export function shuffle<T>(holder: RngHolder, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(holder, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0 || 1;
}
