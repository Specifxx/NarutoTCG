import type { CardRef, CardResolution, MarketCard } from "./types";

/** Case-, accent- and punctuation-insensitive name key: "Naruto  Uzumaki!" → "naruto uzumaki". */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Collector-number key. Drops a leading set code ("NTG01-001", "NTG01 001"),
 * case, and leading zeros in each digit run: "001" → "1", "p-007" → "P-7".
 */
export function normalizeNumber(number: string, setCode?: string): string {
  let value = number.trim().toUpperCase();
  if (setCode) {
    const prefix = setCode.trim().toUpperCase();
    if (value.startsWith(prefix) && /^[\s\-/#]/.test(value.slice(prefix.length))) {
      value = value.slice(prefix.length).replace(/^[\s\-/#]+/, "");
    }
  }
  return value.replace(/^#/, "").replace(/\d+/g, (digits) => String(Number(digits)));
}

/**
 * Match a scraped card reference to one catalog printing.
 * 1. `id` (case-insensitive) wins outright.
 * 2. Otherwise every provided field of setCode / number / name / finish must match,
 *    and `rarity` narrows the result only if several printings remain.
 * Never guesses: several survivors is "ambiguous", none is "not-found".
 */
export function resolveCardRef(cards: MarketCard[], ref: CardRef): CardResolution {
  if (ref.id) {
    const id = ref.id.trim().toLowerCase();
    const hit = cards.find((c) => c.id.toLowerCase() === id);
    if (hit) return { status: "matched", cardId: hit.id };
  }
  if (!ref.setCode && !ref.number && !ref.name) return { status: "not-found" };

  const setCode = ref.setCode?.trim().toUpperCase();
  const name = ref.name ? normalizeName(ref.name) : undefined;
  let candidates = cards.filter(
    (c) =>
      (!setCode || c.setCode.toUpperCase() === setCode) &&
      (!ref.number || normalizeNumber(c.number, c.setCode) === normalizeNumber(ref.number, c.setCode)) &&
      (!name || normalizeName(c.name) === name) &&
      (!ref.finish || c.finish === ref.finish),
  );
  if (candidates.length > 1 && ref.rarity) {
    const narrowed = candidates.filter((c) => c.rarity === ref.rarity);
    if (narrowed.length > 0) candidates = narrowed;
  }
  if (candidates.length === 1) return { status: "matched", cardId: candidates[0]!.id };
  if (candidates.length === 0) return { status: "not-found" };
  return { status: "ambiguous", candidates: candidates.map((c) => c.id).sort() };
}
