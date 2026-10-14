import type { EventFormat, EventType, Region } from "@naruto-tcg/types";
import { isEventFormat, isEventType, isRegion } from "./event-meta";
import type { EventSummary } from "./event-summary";
import { distanceIn, type DistanceUnit } from "./geo";
import { normalizeQuery } from "./places";
import { isLocalDate } from "./time";

/**
 * Event directory filters. The URL query string is the source of truth so list,
 * calendar and map views share state and every filtered view is linkable:
 *
 *   /events?type=regional,store-championship&near=Chicago&lat=41.88&lng=-87.63&radius=50
 */
export interface EventFilters {
  q: string;
  types: EventType[];
  formats: EventFormat[];
  region: Region | null;
  /** Inclusive venue-local date range, "YYYY-MM-DD". */
  from: string | null;
  to: string | null;
  /** Human label of the search origin, e.g. "Chicago, IL, US" or "Your location". */
  near: string | null;
  lat: number | null;
  lng: number | null;
  radius: number;
  unit: DistanceUnit;
  freeOnly: boolean;
  includePast: boolean;
  sort: "date" | "distance";
  view: "list" | "calendar";
  /** Calendar month on display, "YYYY-MM". */
  month: string | null;
}

export const RADIUS_OPTIONS = [10, 25, 50, 100, 250, 500] as const;

export const DEFAULT_FILTERS: EventFilters = {
  q: "",
  types: [],
  formats: [],
  region: null,
  from: null,
  to: null,
  near: null,
  lat: null,
  lng: null,
  radius: 50,
  unit: "mi",
  freeOnly: false,
  includePast: false,
  sort: "date",
  view: "list",
  month: null,
};

type ParamSource = URLSearchParams | { get(name: string): string | null } | Record<string, string | string[] | undefined>;

function reader(source: ParamSource) {
  if (typeof (source as URLSearchParams).get === "function") {
    return (key: string) => (source as URLSearchParams).get(key);
  }
  return (key: string) => {
    const v = (source as Record<string, string | string[] | undefined>)[key];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };
}

const list = (value: string | null) =>
  value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const num = (value: string | null, min: number, max: number) => {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/** Parse filters from `searchParams` (server page props or `useSearchParams()`), ignoring invalid values. */
export function parseEventFilters(source: ParamSource): EventFilters {
  const get = reader(source);
  const lat = num(get("lat"), -90, 90);
  const lng = num(get("lng"), -180, 180);
  const hasPoint = lat !== null && lng !== null;
  const from = get("from");
  const to = get("to");
  const month = get("month");
  const radius = num(get("radius"), 1, 5000);
  const region = get("region");
  const sort = get("sort");

  return {
    q: (get("q") ?? "").slice(0, 100),
    types: [...new Set(list(get("type")).filter(isEventType))],
    formats: [...new Set(list(get("format")).filter(isEventFormat))],
    region: isRegion(region) ? region : null,
    from: from && isLocalDate(from) ? from : null,
    to: to && isLocalDate(to) ? to : null,
    near: hasPoint ? (get("near") ?? "").slice(0, 120) || "Selected location" : null,
    lat: hasPoint ? lat : null,
    lng: hasPoint ? lng : null,
    radius: radius ?? DEFAULT_FILTERS.radius,
    unit: get("unit") === "km" ? "km" : "mi",
    freeOnly: get("free") === "1",
    includePast: get("past") === "1",
    sort: sort === "distance" && hasPoint ? "distance" : "date",
    view: get("view") === "calendar" ? "calendar" : "list",
    month: month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null,
  };
}

/** Serialise to a query string (no leading "?"), omitting defaults, in a stable key order. */
export function serializeEventFilters(filters: EventFilters): string {
  const p = new URLSearchParams();
  if (filters.q.trim()) p.set("q", filters.q.trim());
  if (filters.types.length) p.set("type", filters.types.join(","));
  if (filters.formats.length) p.set("format", filters.formats.join(","));
  if (filters.region) p.set("region", filters.region);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.lat !== null && filters.lng !== null) {
    if (filters.near) p.set("near", filters.near);
    p.set("lat", filters.lat.toFixed(4));
    p.set("lng", filters.lng.toFixed(4));
    if (filters.radius !== DEFAULT_FILTERS.radius) p.set("radius", String(filters.radius));
    if (filters.sort === "distance") p.set("sort", "distance");
  }
  if (filters.unit !== DEFAULT_FILTERS.unit) p.set("unit", filters.unit);
  if (filters.freeOnly) p.set("free", "1");
  if (filters.includePast) p.set("past", "1");
  if (filters.view !== DEFAULT_FILTERS.view) p.set("view", filters.view);
  if (filters.month) p.set("month", filters.month);
  return p.toString();
}

export function hasLocation(filters: EventFilters): filters is EventFilters & { lat: number; lng: number } {
  return filters.lat !== null && filters.lng !== null;
}

/** Number of user-applied narrowing filters (for "Clear filters (3)" badges). View/sort/unit are not counted. */
export function countActiveFilters(filters: EventFilters): number {
  return (
    (filters.q.trim() ? 1 : 0) +
    (filters.types.length ? 1 : 0) +
    (filters.formats.length ? 1 : 0) +
    (filters.region ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (hasLocation(filters) ? 1 : 0) +
    (filters.freeOnly ? 1 : 0) +
    (filters.includePast ? 1 : 0)
  );
}

export interface FilteredEvent {
  event: EventSummary;
  /** Distance from the search origin in `filters.unit`, when a location is set. */
  distance: number | null;
}

/**
 * Apply filters and sort. `now` decides what counts as past; pass a stable value
 * (e.g. the request time from the server) so server and client renders agree.
 */
export function applyEventFilters(events: EventSummary[], filters: EventFilters, now: Date): FilteredEvent[] {
  const nowMs = now.getTime();
  const q = normalizeQuery(filters.q);
  const types = new Set(filters.types);
  const formats = new Set(filters.formats);
  const origin = hasLocation(filters) ? { lat: filters.lat, lng: filters.lng } : null;

  const out: FilteredEvent[] = [];
  for (const event of events) {
    if (!filters.includePast && new Date(event.endsAt).getTime() <= nowMs) continue;
    if (types.size && !types.has(event.type)) continue;
    if (formats.size && !formats.has(event.format)) continue;
    if (filters.region && event.region !== filters.region) continue;
    if (filters.freeOnly && event.entryFee.amount !== 0) continue;
    // Overlap of the event's local date span with the inclusive [from, to] range.
    if (filters.from && event.display.localEndDate < filters.from) continue;
    if (filters.to && event.display.localDate > filters.to) continue;
    if (q) {
      const haystack = normalizeQuery(
        [
          event.title,
          event.venue.name,
          event.venue.city,
          event.venue.admin,
          event.display.countryName,
          event.organizerName,
          ...event.tags,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!q.split(" ").every((term) => haystack.includes(term))) continue;
    }
    let distance: number | null = null;
    if (origin) {
      distance = distanceIn(origin, event.venue.location, filters.unit);
      if (distance > filters.radius) continue;
    }
    out.push({ event, distance });
  }

  if (filters.sort === "distance" && origin) {
    out.sort((a, b) => a.distance! - b.distance! || a.event.startsAt.localeCompare(b.event.startsAt));
  } else {
    out.sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt) || a.event.id.localeCompare(b.event.id));
  }
  return out;
}
