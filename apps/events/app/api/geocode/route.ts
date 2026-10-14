import { NextResponse, type NextRequest } from "next/server";
import { getPlaces } from "@/lib/data";
import { isValidPoint } from "@/lib/geo";
import { placeToResolved, searchPlaces, type ResolvedPlace } from "@/lib/places";

/**
 * Resolve "ZIP / postcode / city" text to coordinates for radius search.
 *
 *   GET /api/geocode?q=90012            → 200 { result: ResolvedPlace } | 404 { error }
 *   GET /api/geocode?q=man&suggest=1    → 200 { results: ResolvedPlace[] }
 *
 * The bundled gazetteer answers first. Full lookups (not typeahead) fall back to
 * OpenStreetMap Nominatim, cached for a week, unless GEOCODER=off. Nominatim's
 * usage policy requires an identifying User-Agent and low request volume, which
 * the gazetteer-first strategy and caching keep us within.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "NarutoTCG-Events/0.1 (+https://github.com/Specifxx/NarutoTCG)";

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  address?: { country_code?: string };
}

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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const suggest = request.nextUrl.searchParams.get("suggest") === "1";
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ error: "Enter between 2 and 100 characters." }, { status: 400 });
  }

  const matches = searchPlaces(q, await getPlaces(), suggest ? 6 : 1).map(placeToResolved);
  const cache = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };

  if (suggest) return NextResponse.json({ results: matches }, { headers: cache });
  if (matches[0]) return NextResponse.json({ result: matches[0] }, { headers: cache });

  if (process.env.GEOCODER !== "off") {
    try {
      const remote = await geocodeRemote(q);
      if (remote) return NextResponse.json({ result: remote }, { headers: cache });
    } catch {
      return NextResponse.json(
        { error: "Location lookup is unavailable right now. Try a nearby city name." },
        { status: 502 },
      );
    }
  }
  return NextResponse.json({ error: `We couldn't find "${q}". Try a city name or postcode.` }, { status: 404 });
}
