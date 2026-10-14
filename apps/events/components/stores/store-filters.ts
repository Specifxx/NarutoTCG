import type { Region, StoreFeature } from "@naruto-tcg/types";
import { isRegion, isStoreFeature } from "@/lib/event-meta";
import { RADIUS_OPTIONS } from "@/lib/filters";
import { distanceIn, type DistanceUnit } from "@/lib/geo";
import { normalizeQuery, searchTerms } from "@/lib/places";
import type { StoreSummary } from "@/lib/store-summary";

/**
 * Store locator filters, kept in the URL so every view is linkable:
 *
 *   /stores?region=europe&feature=demo-kits,play-space&near=Paris&lat=48.8566&lng=2.3522&radius=100
 */
export type StoreSort = "name" | "events" | "distance";

export interface StoreFilters {
  q: string;
  region: Region | null;
  /** ISO 3166-1 alpha-2. */
  country: string | null;
  /** Stores must offer every selected feature. */
  features: StoreFeature[];
  /** Hide stores still pending verification (default on). */
  verifiedOnly: boolean;
  near: string | null;
  lat: number | null;
  lng: number | null;
  /** Search radius in `unit`; 0 means any distance. */
  radius: number;
  unit: DistanceUnit;
  sort: StoreSort;
}

export const STORE_RADIUS_OPTIONS: readonly number[] = [...RADIUS_OPTIONS, 0];

export const DEFAULT_STORE_FILTERS: StoreFilters = {
  q: "",
  region: null,
  country: null,
  features: [],
  verifiedOnly: true,
  near: null,
  lat: null,
  lng: null,
  radius: 100,
  unit: "mi",
  sort: "name",
};

export const STORE_SORT_LABEL: Record<StoreSort, string> = {
  name: "Name A–Z",
  events: "Most upcoming events",
  distance: "Nearest",
};

type ParamReader = { get(name: string): string | null };

const num = (value: string | null, min: number, max: number) => {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export function parseStoreFilters(params: ParamReader): StoreFilters {
  const lat = num(params.get("lat"), -90, 90);
  const lng = num(params.get("lng"), -180, 180);
  const hasPoint = lat !== null && lng !== null;
  const region = params.get("region");
  const country = params.get("country")?.toUpperCase() ?? "";
  const radius = num(params.get("radius"), 0, 5000);
  const sort = params.get("sort");
  const features = (params.get("feature") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isStoreFeature);

  return {
    q: (params.get("q") ?? "").slice(0, 100),
    region: isRegion(region) ? region : null,
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    features: [...new Set(features)],
    verifiedOnly: params.get("pending") !== "1",
    near: hasPoint ? (params.get("near") ?? "").slice(0, 120) || "Selected location" : null,
    lat: hasPoint ? lat : null,
    lng: hasPoint ? lng : null,
    radius: radius ?? DEFAULT_STORE_FILTERS.radius,
    unit: params.get("unit") === "km" ? "km" : "mi",
    sort: sort === "events" ? "events" : sort === "distance" && hasPoint ? "distance" : "name",
  };
}

/** Query string without "?", omitting defaults, in a stable key order. */
export function serializeStoreFilters(filters: StoreFilters): string {
  const p = new URLSearchParams();
  if (filters.q.trim()) p.set("q", filters.q.trim());
  if (filters.region) p.set("region", filters.region);
  if (filters.country) p.set("country", filters.country);
  if (filters.features.length) p.set("feature", filters.features.join(","));
  if (!filters.verifiedOnly) p.set("pending", "1");
  if (filters.lat !== null && filters.lng !== null) {
    if (filters.near) p.set("near", filters.near);
    p.set("lat", filters.lat.toFixed(4));
    p.set("lng", filters.lng.toFixed(4));
    if (filters.radius !== DEFAULT_STORE_FILTERS.radius) p.set("radius", String(filters.radius));
  }
  if (filters.unit !== DEFAULT_STORE_FILTERS.unit) p.set("unit", filters.unit);
  if (filters.sort !== DEFAULT_STORE_FILTERS.sort) p.set("sort", filters.sort);
  return p.toString();
}

export function hasStoreLocation(filters: StoreFilters): filters is StoreFilters & { lat: number; lng: number } {
  return filters.lat !== null && filters.lng !== null;
}

/** Narrowing filters in use (sort, unit and the default verified toggle are not counted). */
export function countStoreFilters(filters: StoreFilters): number {
  return (
    (filters.q.trim() ? 1 : 0) +
    (filters.region ? 1 : 0) +
    (filters.country ? 1 : 0) +
    filters.features.length +
    (filters.verifiedOnly ? 0 : 1) +
    (hasStoreLocation(filters) ? 1 : 0)
  );
}

export interface FilteredStore {
  store: StoreSummary;
  /** Distance from the search origin in `filters.unit`, when a location is set. */
  distance: number | null;
}

export function storeSearchText(store: StoreSummary): string {
  return normalizeQuery(
    [store.name, store.tagline, store.city, store.admin, store.countryName, store.country].filter(Boolean).join(" "),
  );
}

/**
 * Filter and sort stores. Pass `searchIndex` (slug → normalised text) to avoid
 * re-normalising every store on each keystroke.
 */
export function applyStoreFilters(
  stores: readonly StoreSummary[],
  filters: StoreFilters,
  searchIndex?: ReadonlyMap<string, string>,
): FilteredStore[] {
  // Commas separate terms too, so "London, United Kingdom" matches like "London United Kingdom".
  const terms = searchTerms(filters.q);
  const origin = hasStoreLocation(filters) ? { lat: filters.lat, lng: filters.lng } : null;

  const out: FilteredStore[] = [];
  for (const store of stores) {
    if (filters.verifiedOnly && !store.verified) continue;
    if (filters.region && store.region !== filters.region) continue;
    if (filters.country && store.country !== filters.country) continue;
    if (filters.features.length && !filters.features.every((f) => store.features.includes(f))) continue;
    if (terms.length) {
      const haystack = searchIndex?.get(store.slug) ?? storeSearchText(store);
      if (!terms.every((term) => haystack.includes(term))) continue;
    }
    let distance: number | null = null;
    if (origin) {
      distance = distanceIn(origin, store.location, filters.unit);
      if (filters.radius > 0 && distance > filters.radius) continue;
    }
    out.push({ store, distance });
  }

  const byName = (a: FilteredStore, b: FilteredStore) => a.store.name.localeCompare(b.store.name, "en");
  if (filters.sort === "distance" && origin) {
    out.sort((a, b) => a.distance! - b.distance! || byName(a, b));
  } else if (filters.sort === "events") {
    out.sort((a, b) => b.store.upcomingCount - a.store.upcomingCount || byName(a, b));
  } else {
    out.sort(byName);
  }
  return out;
}

/** The single nearest store (ignoring radius), for "nothing within 50 mi" hints. */
export function nearestStore(
  stores: readonly StoreSummary[],
  filters: StoreFilters,
  searchIndex?: ReadonlyMap<string, string>,
): FilteredStore | null {
  if (!hasStoreLocation(filters)) return null;
  const [first] = applyStoreFilters(stores, { ...filters, radius: 0, sort: "distance" }, searchIndex);
  return first ?? null;
}
