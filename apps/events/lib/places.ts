import type { GeoPoint } from "@naruto-tcg/types";
import type { PlaceSeed } from "./data/schema";

/** A resolved location for radius search. */
export interface ResolvedPlace extends GeoPoint {
  label: string;
  country?: string;
  source: "gazetteer" | "geocoder" | "device";
}

export function normalizeQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9,\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const compactPostal = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function placeToResolved(place: PlaceSeed): ResolvedPlace {
  return {
    label: [place.name, place.admin, place.country].filter(Boolean).join(", "),
    lat: place.lat,
    lng: place.lng,
    country: place.country,
    source: "gazetteer",
  };
}

/**
 * Rank gazetteer entries for a free-text "ZIP / postcode / city" query.
 *
 * Exact postal codes win (US ZIP+4 is trimmed to 5 digits, UK postcodes match on
 * their outward code), then exact names and aliases, then name prefixes. A
 * trailing ", qualifier" (state, country) boosts matching entries.
 */
export function searchPlaces(query: string, places: PlaceSeed[], limit = 5): PlaceSeed[] {
  const raw = query.trim();
  if (raw.length < 2) return [];

  const scored: { place: PlaceSeed; score: number }[] = [];
  const postalCandidates = new Set<string>([compactPostal(raw)]);
  const usZip = /^(\d{5})(?:-\d{4})?$/.exec(raw);
  if (usZip) postalCandidates.add(usZip[1]);
  const ukOutward = /^([A-Za-z]{1,2}\d[A-Za-z\d]?)\s*\d[A-Za-z]{2}$/.exec(raw);
  if (ukOutward) postalCandidates.add(compactPostal(ukOutward[1]));

  const [namePart, ...qualifierParts] = normalizeQuery(raw).split(",").map((s) => s.trim());
  const qualifier = qualifierParts.join(" ").trim();

  for (const place of places) {
    let score = 0;
    if (place.postalCodes?.some((code) => postalCandidates.has(compactPostal(code)))) score = 100;

    if (!score && namePart) {
      const names = [place.name, ...(place.aliases ?? [])].map(normalizeQuery);
      if (names.includes(namePart)) score = 80;
      else if (namePart.length >= 3 && names.some((n) => n.startsWith(namePart))) score = 50;
      else if (namePart.length >= 4 && names.some((n) => n.includes(namePart))) score = 30;
    }
    if (!score) continue;

    if (qualifier) {
      const q = qualifier.replace(/\s+/g, " ");
      const hay = [place.admin, place.country].filter(Boolean).map((s) => normalizeQuery(String(s)));
      if (hay.some((h) => h === q || h.startsWith(q) || q.startsWith(h))) score += 10;
      else score -= 15;
    }
    scored.push({ place, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name))
    .slice(0, limit)
    .map((s) => s.place);
}
