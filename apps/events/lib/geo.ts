export interface Place {
  label: string;
  lat: number;
  lng: number;
}

// Offline gazetteer so radius search works without a geocoding API.
const PLACES: Array<Place & { keys: string[] }> = [
  { label: "New York, NY", lat: 40.7128, lng: -74.006, keys: ["new york", "nyc", "10001"] },
  { label: "Austin, TX", lat: 30.2672, lng: -97.7431, keys: ["austin", "78701"] },
  { label: "Phoenix, AZ", lat: 33.4484, lng: -112.074, keys: ["phoenix", "85004"] },
  { label: "Seattle, WA", lat: 47.6062, lng: -122.3321, keys: ["seattle", "98101"] },
  { label: "Chicago, IL", lat: 41.8781, lng: -87.6298, keys: ["chicago", "60601"] },
  { label: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, keys: ["los angeles", "la", "90012"] },
  { label: "Anaheim, CA", lat: 33.8366, lng: -117.9143, keys: ["anaheim", "92802"] },
  { label: "San Diego, CA", lat: 32.7157, lng: -117.1611, keys: ["san diego", "92101"] },
  { label: "Boston, MA", lat: 42.3601, lng: -71.0589, keys: ["boston", "02108"] },
  { label: "London, UK", lat: 51.5074, lng: -0.1278, keys: ["london", "ec1a"] },
  { label: "Paris, FR", lat: 48.8566, lng: 2.3522, keys: ["paris", "75001"] },
  { label: "Berlin, DE", lat: 52.52, lng: 13.405, keys: ["berlin", "10115"] },
  { label: "Cologne, DE", lat: 50.9375, lng: 6.9603, keys: ["cologne", "köln", "50667"] },
  { label: "Sydney, AU", lat: -33.8688, lng: 151.2093, keys: ["sydney", "2000"] },
  { label: "Melbourne, AU", lat: -37.8136, lng: 144.9631, keys: ["melbourne", "3000"] },
];

export function lookupPlace(query: string): Place | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const hit = PLACES.find((p) => p.keys.some((k) => k === q) || p.label.toLowerCase().startsWith(q));
  return hit ? { label: hit.label, lat: hit.lat, lng: hit.lng } : null;
}

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
