import type { GeoPoint } from "@naruto-tcg/types";

export type DistanceUnit = "mi" | "km";

const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_MILE = 1.609344;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceIn(a: GeoPoint, b: GeoPoint, unit: DistanceUnit): number {
  const km = haversineKm(a, b);
  return unit === "km" ? km : km / KM_PER_MILE;
}

export function toKm(value: number, unit: DistanceUnit): number {
  return unit === "km" ? value : value * KM_PER_MILE;
}

export function formatDistance(value: number, unit: DistanceUnit): string {
  if (value < 1) return `< 1 ${unit}`;
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded.toLocaleString("en-US")} ${unit}`;
}

export function isValidPoint(p: Partial<GeoPoint> | null | undefined): p is GeoPoint {
  return (
    !!p &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

/** [[south, west], [north, east]] bounds of a set of points, or null when empty. */
export function boundsOf(points: GeoPoint[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let south = 90;
  let west = 180;
  let north = -90;
  let east = -180;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return [
    [south, west],
    [north, east],
  ];
}

/** Google Maps embed URL that works without an API key. */
export function googleMapsEmbedUrl(point: GeoPoint, zoom = 15): string {
  return `https://www.google.com/maps?q=${point.lat},${point.lng}&z=${zoom}&output=embed`;
}

/** Google Maps directions deep link to a destination. */
export function googleMapsDirectionsUrl(point: GeoPoint): string {
  const params = new URLSearchParams({ api: "1", destination: `${point.lat},${point.lng}` });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
