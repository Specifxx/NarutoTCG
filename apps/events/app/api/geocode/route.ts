import { NextResponse, type NextRequest } from "next/server";
import { getPlaces } from "@/lib/data";
import { isValidPoint } from "@/lib/geo";
import { isConfidentMatch, placeToResolved, rankPlaces, type RankedPlace, type ResolvedPlace } from "@/lib/places";

/**
 * Resolve "ZIP / postcode / city" text to coordinates for radius search.
 *
 *   GET /api/geocode?q=90012            → 200 { result: ResolvedPlace } | 404/502/503 { error }
 *   GET /api/geocode?q=man&suggest=1    → 200 { results: ResolvedPlace[] }
 *
 * Typeahead only ever uses the bundled gazetteer. Full lookups answer from the
 * gazetteer when the match is confident (postcode, exact name, no contradicting
 * ", state/country"); otherwise they ask OpenStreetMap Nominatim (unless
 * GEOCODER=off) and fall back to the best gazetteer guess if it has nothing.
 *
 * Nominatim's usage policy allows ~1 request/second with an identifying
 * User-Agent: upstream calls are gated to one per second per instance,
 * identical in-flight queries share one request, and the cache key is the
 * normalised query.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "NarutoTCG-Events/0.1 (+https://github.com/Specifxx/NarutoTCG)";
const UPSTREAM_MIN_INTERVAL_MS = 1_000;

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  address?: { country_code?: string };
}

let lastUpstreamAt = 0;
const inFlight = new Map<string, Promise<ResolvedPlace | null>>();

async function geocodeRemote(query: string): Promise<ResolvedPlace | null> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", addressdetails: "1" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    signal: AbortSignal.timeout(4000),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
  const [hit] = (await res.json()) as NominatimHit[];
  if (!hit) return null;
  const point = { lat: Number(hit.lat), lng: Number(hit.lon) };
  if (!isValidPoint(point)) return null;
  return {
    ...point,
    label: hit.display_name.split(",").slice(0, 3).join(",").trim(),
    country: hit.address?.country_code?.toUpperCase(),
    source: "geocoder",
  };
}

/** Shared upstream request for `query`, or null when the per-second budget is spent. */
function lookupRemote(query: string): Promise<ResolvedPlace | null> | null {
  const key = query.toLowerCase().replace(/\s+/g, " ");
  const pending = inFlight.get(key);
  if (pending) return pending;
  const now = Date.now();
  if (now - lastUpstreamAt < UPSTREAM_MIN_INTERVAL_MS) return null;
  lastUpstreamAt = now;
  const request = geocodeRemote(key).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

const CACHEABLE = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const suggest = request.nextUrl.searchParams.get("suggest") === "1";
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ error: "Enter between 2 and 100 characters." }, { status: 400 });
  }

  const ranked = rankPlaces(q, await getPlaces());
  if (suggest) {
    return NextResponse.json({ results: ranked.slice(0, 6).map((r) => placeToResolved(r.place)) }, { headers: CACHEABLE });
  }

  const best: RankedPlace | undefined = ranked[0];
  if (best && isConfidentMatch(best)) return NextResponse.json({ result: placeToResolved(best.place) }, { headers: CACHEABLE });

  if (process.env.GEOCODER !== "off") {
    const pending = lookupRemote(q);
    if (pending) {
      try {
        const remote = await pending;
        if (remote) return NextResponse.json({ result: remote }, { headers: CACHEABLE });
      } catch {
        if (!best) {
          return NextResponse.json(
            { error: "Location lookup is unavailable right now. Try a nearby city name." },
            { status: 502 },
          );
        }
      }
    } else if (!best) {
      return NextResponse.json(
        { error: "Location lookup is busy. Try again in a moment, or try a nearby city name." },
        { status: 503, headers: { "Retry-After": "1" } },
      );
    }
  }

  if (best) return NextResponse.json({ result: placeToResolved(best.place) }, { headers: CACHEABLE });
  return NextResponse.json({ error: `We couldn't find "${q}". Try a city name or postcode.` }, { status: 404 });
}
