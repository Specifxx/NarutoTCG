import "server-only";

import type { Store, TcgEvent } from "@naruto-tcg/types";
import eventsJson from "@/data/events.json";
import milestonesJson from "@/data/milestones.json";
import placesJson from "@/data/places.json";
import storesJson from "@/data/stores.json";
import { toEventSummary, type EventSummary } from "../event-summary";
import { normalizeEvents, normalizeStore } from "./normalize";
import type { MilestoneSeed, PlaceSeed } from "./schema";
import { validateEvents, validateMilestones, validatePlaces, validateStores } from "./validate";

/**
 * Read-only repository over the seed data in `data/*.json`.
 *
 * Everything is validated and normalised once per server process. The functions
 * are async so call sites stay unchanged when this is backed by a database or API.
 */

interface Database {
  stores: Store[];
  storesBySlug: Map<string, Store>;
  events: TcgEvent[];
  eventsById: Map<string, TcgEvent>;
  summaries: EventSummary[];
  places: PlaceSeed[];
  milestones: MilestoneSeed[];
}

let db: Database | undefined;

function load(): Database {
  if (db) return db;
  const storeSeeds = validateStores(storesJson as unknown);
  const stores = storeSeeds.map(normalizeStore).sort((a, b) => a.name.localeCompare(b.name));
  const storesBySlug = new Map(stores.map((s) => [s.slug, s]));
  const events = normalizeEvents(validateEvents(eventsJson as unknown, storeSeeds), storesBySlug);
  const eventsById = new Map(events.map((e) => [e.id, e]));
  db = {
    stores,
    storesBySlug,
    events,
    eventsById,
    summaries: events.map(toEventSummary),
    places: validatePlaces(placesJson as unknown),
    milestones: validateMilestones(milestonesJson as unknown, new Set(eventsById.keys())),
  };
  return db;
}

/** All events (past and upcoming), sorted by start time. */
export async function getEvents(): Promise<TcgEvent[]> {
  return load().events;
}

export async function getEvent(id: string): Promise<TcgEvent | undefined> {
  return load().eventsById.get(id);
}

/** Serialisable summaries of all events, sorted by start time. */
export async function getEventSummaries(): Promise<EventSummary[]> {
  return load().summaries;
}

export async function getEventSummary(id: string): Promise<EventSummary | undefined> {
  return load().summaries.find((s) => s.id === id);
}

/** Events that have not yet ended, soonest first. */
export async function getUpcomingEventSummaries(
  options: { now?: Date; limit?: number; includeCancelled?: boolean } = {},
): Promise<EventSummary[]> {
  const now = (options.now ?? new Date()).getTime();
  const upcoming = load().summaries.filter(
    (s) => new Date(s.endsAt).getTime() > now && (options.includeCancelled || s.status !== "cancelled"),
  );
  return options.limit === undefined ? upcoming : upcoming.slice(0, options.limit);
}

/** Every event hosted at a store, soonest first. */
export async function getEventSummariesForStore(slug: string): Promise<EventSummary[]> {
  return load().summaries.filter((s) => s.venue.storeSlug === slug);
}

/** Other occurrences of the same weekly series. */
export async function getSeriesSummaries(seriesId: string): Promise<EventSummary[]> {
  return load().summaries.filter((s) => s.seriesId === seriesId);
}

export async function getStores(): Promise<Store[]> {
  return load().stores;
}

export async function getStore(slug: string): Promise<Store | undefined> {
  return load().storesBySlug.get(slug);
}

export async function getPlaces(): Promise<PlaceSeed[]> {
  return load().places;
}

export async function getMilestoneSeeds(): Promise<MilestoneSeed[]> {
  return load().milestones;
}

export interface DirectoryStats {
  upcomingEvents: number;
  stores: number;
  countries: number;
  cities: number;
}

export async function getDirectoryStats(now = new Date()): Promise<DirectoryStats> {
  const { summaries, stores } = load();
  const upcoming = summaries.filter((s) => new Date(s.endsAt) > now && s.status !== "cancelled");
  const countries = new Set([...stores.map((s) => s.address.country), ...upcoming.map((s) => s.venue.country)]);
  const cities = new Set([
    ...stores.map((s) => `${s.address.city}|${s.address.country}`),
    ...upcoming.map((s) => `${s.venue.city}|${s.venue.country}`),
  ]);
  return { upcomingEvents: upcoming.length, stores: stores.length, countries: countries.size, cities: cities.size };
}
