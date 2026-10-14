"use client";

import type { ResolvedPlace } from "./places";

/** Browser-side helpers for `/api/geocode` and the Geolocation API. */

export class GeocodeError extends Error {}

export async function geocode(query: string, signal?: AbortSignal): Promise<ResolvedPlace> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
  const body = (await res.json().catch(() => ({}))) as { result?: ResolvedPlace; error?: string };
  if (!res.ok || !body.result) throw new GeocodeError(body.error ?? "We couldn't find that place.");
  return body.result;
}

/** Typeahead suggestions from the bundled gazetteer (never hits external services). */
export async function suggestPlaces(query: string, signal?: AbortSignal): Promise<ResolvedPlace[]> {
  if (query.trim().length < 2) return [];
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&suggest=1`, { signal });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { results?: ResolvedPlace[] };
  return body.results ?? [];
}

/** Resolve the device position, with human-readable errors. */
export function getDeviceLocation(timeoutMs = 10_000): Promise<ResolvedPlace> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeocodeError("Your browser doesn't support location access."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 1e4) / 1e4,
          lng: Math.round(pos.coords.longitude * 1e4) / 1e4,
          label: "Your location",
          source: "device",
        }),
      (err) =>
        reject(
          new GeocodeError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied. Enter a city or postcode instead."
              : "We couldn't get your location. Enter a city or postcode instead.",
          ),
        ),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60_000 },
    );
  });
}
