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
