import type { EventType, GeoPoint } from "@naruto-tcg/types";
import type { EventSummary } from "@/lib/event-summary";
import type { FilteredEvent } from "@/lib/filters";

/** Every filtered event at one venue, shown as a single marker and list group. */
export interface VenueGroup {
  /** `venue.storeSlug`, or "lat,lng" to 4 dp for one-off venues. */
  key: string;
  name: string;
  city: string;
  flag: string;
  /** "Los Angeles, CA, USA". */
  place: string;
  storeSlug?: string;
  location: GeoPoint;
  /** Sorted by start time. */
  events: EventSummary[];
  /** Type of the soonest event; colours the marker. */
  primaryType: EventType;
  /** Distance from the search origin in the filter unit, when a location is set. */
  distance: number | null;
}

/** Search origin drawn on the map (marker + radius circle). */
export interface MapOrigin {
  lat: number;
  lng: number;
  label: string;
  radiusMeters: number;
}

/** Ask the map to fly to a venue and open its popup; `nonce` makes repeat requests for the same venue fire. */
export interface FocusRequest {
  key: string;
  nonce: number;
}

export function venueKey(event: EventSummary): string {
  const { storeSlug, location } = event.venue;
  return storeSlug ?? `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
}

/** DOM id of a venue's group in the sidebar list. */
export function venueGroupId(key: string): string {
  return `venue-${key.replace(/[^a-z0-9-]/gi, "_")}`;
}

/**
 * Group filtered results by venue. Groups keep the order in which their first
 * event appears in `results`, so they follow the active sort (soonest or nearest).
 */
export function groupByVenue(results: FilteredEvent[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();
  for (const { event, distance } of results) {
    const key = venueKey(event);
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
      continue;
    }
    groups.set(key, {
      key,
      name: event.venue.name,
      city: event.venue.city,
      flag: event.display.flag,
      place: event.display.place,
      ...(event.venue.storeSlug ? { storeSlug: event.venue.storeSlug } : {}),
      location: event.venue.location,
      events: [event],
      primaryType: event.type,
      distance,
    });
  }

  const out = [...groups.values()];
  for (const group of out) {
    group.events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
    group.primaryType = group.events[0].type;
  }
  return out;
}

/** Event counts per type, for the legend. */
export function countByType(results: FilteredEvent[]): Record<EventType, number> {
  const counts: Record<EventType, number> = {
    "premier-demo": 0,
    "convention-showcase": 0,
    "lgs-weekly": 0,
    "store-championship": 0,
    regional: 0,
  };
  for (const { event } of results) counts[event.type] += 1;
  return counts;
}
