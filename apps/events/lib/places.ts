import type { GeoPoint } from "@naruto-tcg/types";
import type { PlaceSeed } from "./data/schema";

/** A resolved location for radius search. */
export interface ResolvedPlace extends GeoPoint {
  label: string;
  country?: string;
  source: "gazetteer" | "geocoder" | "device";
}

/**
 * Lowercase, strip accents and punctuation, collapse whitespace. Letters and
 * digits from every script survive (so "東京" or "Αθήνα" still search), and commas
 * are kept because the gazetteer reads ", qualifier" suffixes.
 */
export function normalizeQuery(value: string): string {
  return value
    .normalize("NFKD")
    // Drop Latin/Greek/Cyrillic accents only; other scripts' marks (e.g. Japanese dakuten) are recomposed.
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N},\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whitespace-separated search terms (commas act as separators). */
export function searchTerms(value: string): string[] {
  return normalizeQuery(value).replace(/,/g, " ").split(" ").filter(Boolean);
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

/** Score tiers returned by `rankPlaces`. */
export const MATCH_SCORE = { postal: 100, exactName: 80, prefix: 50, contains: 30 } as const;

export interface RankedPlace {
  place: PlaceSeed;
  score: number;
  /** The query's ", qualifier" (state/country) contradicts this entry. */
  qualifierMismatch: boolean;
}

/** Postal-code spellings to try for a raw query (full codes reduced to the area codes the gazetteer stores). */
function postalCandidates(raw: string): Set<string> {
  const out = new Set<string>([compactPostal(raw)]);
  const add = (match: RegExpExecArray | null) => {
    if (match) out.add(compactPostal(match[1]));
  };
  add(/^(\d{5})(?:-\d{4})?$/.exec(raw)); // US ZIP / ZIP+4
  add(/^([A-Za-z]{1,2}\d[A-Za-z\d]?)\s*\d[A-Za-z]{2}$/.exec(raw)); // UK postcode → outward code
  add(/^([A-Za-z]\d[A-Za-z])\s*\d[A-Za-z]\d$/.exec(raw)); // Canada → forward sortation area
  add(/^([AC-FHKNPRTV-Y]\d{2}|D6W)\s*[0-9AC-FHKNPRTV-Y]{4}$/i.exec(raw)); // Ireland Eircode → routing key
  add(/^(\d{4})\s*[A-Za-z]{2}$/.exec(raw)); // Netherlands → 4-digit area
  return out;
}

function qualifierMatches(qualifier: string, place: PlaceSeed): boolean {
  const hay = [place.admin, place.country].filter(Boolean).map((s) => normalizeQuery(String(s)));
  return hay.some((h) => h === qualifier || h.startsWith(qualifier) || qualifier.startsWith(h));
}

/**
 * Score every gazetteer entry against a free-text "ZIP / postcode / city" query.
 *
 * Exact postal codes win (US ZIP+4, UK, Canadian, Irish and Dutch codes are reduced
 * to the area codes stored in the gazetteer), then exact names and aliases, then
 * name prefixes and substrings. A trailing ", qualifier" (state, country) boosts
 * matching entries and flags contradicting ones.
 */
export function rankPlaces(query: string, places: PlaceSeed[]): RankedPlace[] {
  const raw = query.trim();
  if (raw.length < 2) return [];

  const postal = postalCandidates(raw);
  const [namePart, ...qualifierParts] = normalizeQuery(raw).split(",").map((s) => s.trim());
  const qualifier = qualifierParts.join(" ").replace(/\s+/g, " ").trim();

  const ranked: RankedPlace[] = [];
  for (const place of places) {
    let score = 0;
    if (place.postalCodes?.some((code) => postal.has(compactPostal(code)))) score = MATCH_SCORE.postal;

    if (!score && namePart) {
      const names = [place.name, ...(place.aliases ?? [])].map(normalizeQuery);
      if (names.includes(namePart)) score = MATCH_SCORE.exactName;
      else if (namePart.length >= 3 && names.some((n) => n.startsWith(namePart))) score = MATCH_SCORE.prefix;
      else if (namePart.length >= 4 && names.some((n) => n.includes(namePart))) score = MATCH_SCORE.contains;
    }
    if (!score) continue;

    let qualifierMismatch = false;
    if (qualifier) {
      if (qualifierMatches(qualifier, place)) score += 10;
      else {
        score -= 15;
        qualifierMismatch = true;
      }
    }
    ranked.push({ place, score, qualifierMismatch });
  }

  return ranked.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "en"));
}

/** Best gazetteer entries for typeahead suggestions. */
export function searchPlaces(query: string, places: PlaceSeed[], limit = 5): PlaceSeed[] {
  return rankPlaces(query, places)
    .slice(0, limit)
    .map((r) => r.place);
}

/** A ranked hit trustworthy enough to answer a full lookup without the external geocoder. */
export function isConfidentMatch(match: RankedPlace | undefined): boolean {
  return !!match && match.score >= MATCH_SCORE.exactName && !match.qualifierMismatch;
}
