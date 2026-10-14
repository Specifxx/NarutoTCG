/**
 * Seeded randomness for the demo dataset. Every draw is keyed by stable values
 * (card id, vendor, day), so the same inputs produce the same prices on any
 * machine and on any day the generator runs. Never use Math.random here.
 */

/** A uniform float in [0, 1). */
export type Rng = () => number;

/** murmur3's 32-bit finalizer: every input bit affects every output bit. */
function fmix32(value: number): number {
  let h = value >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** 32-bit FNV-1a over UTF-16 code units, finalized for avalanche. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return fmix32(h);
}

/** Fold integer keys (hashes, day numbers, counters) into one 32-bit seed. Order matters. */
export function mixSeed(...keys: number[]): number {
  let h = 0x9e3779b9;
  for (const key of keys) h = fmix32(Math.imul(h ^ fmix32(key), 0x27d4eb2f) + 0x165667b1);
  return h;
}

/** mulberry32: tiny and fast, with plenty of quality for synthetic market data. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function seededRng(...keys: number[]): Rng {
  return mulberry32(mixSeed(...keys));
}

export function uniform(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Integer in [min, max], both inclusive. */
export function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

/** Standard normal draw (Box-Muller). Consumes exactly two uniforms. */
export function gaussian(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pickWeighted<T extends { weight: number }>(rng: Rng, options: readonly [T, ...T[]]): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = rng() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option;
  }
  return options[options.length - 1];
}

/** `count` distinct items in random order (partial Fisher-Yates). */
export function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
