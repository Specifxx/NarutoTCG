import { foldDiacritics } from "./text";

/**
 * URL-safe slug: ASCII lowercase letters, digits and single dashes, never starting or ending
 * with a dash. The result never contains `--`, which deck ids reserve as their separator.
 * Returns `fallback` when nothing usable is left (e.g. a name in a non-Latin script).
 */
export function slugify(input: string, fallback = "player"): string {
  const slug = foldDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/** Longest slug {@link idSlug} returns; ids end up in URLs (deck ids join two of them). */
export const MAX_SLUG_LENGTH = 60;
const HASH_LENGTH = 6;

/** Short stable hash (FNV-1a, base 36) of `text`. */
function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(HASH_LENGTH, "0").slice(-HASH_LENGTH);
}

/**
 * {@link slugify} for ids: a slug longer than `max` is cut (at a dash when one is near) and ends
 * with a short hash of the whole slug, so long names keep distinct, stable and short ids.
 */
export function idSlug(input: string, fallback = "player", max = MAX_SLUG_LENGTH): string {
  const slug = slugify(input, fallback);
  if (slug.length <= max) return slug;
  const room = max - HASH_LENGTH - 1;
  const cut = slug.slice(0, room + 1);
  const dash = cut.lastIndexOf("-");
  const head = (dash >= room / 2 ? cut.slice(0, dash) : cut.slice(0, room)).replace(/-+$/, "");
  return `${head}-${shortHash(slug)}`;
}

/**
 * `base`, or `base-2`, `base-3`, … if already taken. Adds the returned slug to `used`.
 * `base` must already be a slug.
 */
export function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

/** True for a slug {@link slugify} could have produced. */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
