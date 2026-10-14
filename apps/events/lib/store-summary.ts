import type { EventType, GeoPoint, Region, Store, StoreFeature, WeeklyHours } from "@naruto-tcg/types";
import type { EventSummary } from "./event-summary";
import { countryName, flagEmoji, placeLabel } from "./format";
import { formatDate, localeForRegion } from "./time";

/**
 * Serialisable view of a store for the directory and map. Date labels are
 * formatted on the server so client components never format venue times.
 */
export interface StoreSummary {
  slug: string;
  name: string;
  tagline?: string;
  verified: boolean;
  city: string;
  /** State, province or county. */
  admin?: string;
  country: string;
  countryName: string;
  flag: string;
  /** "Los Angeles, CA, USA". */
  place: string;
  region: Region;
  location: GeoPoint;
  timeZone: string;
  /** Display locale for the store's region (12h vs 24h clocks). */
  locale: string;
  hours: WeeklyHours;
  features: StoreFeature[];
  tableCount?: number;
  /** Scheduled or postponed events that have not ended yet. */
  upcomingCount: number;
  nextEvent?: {
    id: string;
    title: string;
    type: EventType;
    /** ISO start instant, for `<time dateTime>`. */
    startsAt: string;
    /** Venue-local "Sat, Oct 24 · 11:00 AM" / "Sat 24 Oct · 18:00". */
    dateLabel: string;
  };
}

/**
 * Build a summary from a store and the events it hosts (any order). `now` decides
 * which events count as upcoming; pass the request/revalidation time.
 */
export function toStoreSummary(store: Store, storeEvents: readonly EventSummary[], now: Date): StoreSummary {
  const nowMs = now.getTime();
  const upcoming = storeEvents
    .filter((e) => e.status !== "cancelled" && Date.parse(e.endsAt) > nowMs)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const next = upcoming[0];
  const locale = localeForRegion(store.region);

  return {
    slug: store.slug,
    name: store.name,
    ...(store.tagline ? { tagline: store.tagline } : {}),
    verified: store.verified,
    city: store.address.city,
    ...(store.address.region ? { admin: store.address.region } : {}),
    country: store.address.country,
    countryName: countryName(store.address.country),
    flag: flagEmoji(store.address.country),
    place: placeLabel(store.address),
    region: store.region,
    location: store.location,
    timeZone: store.timeZone,
    locale,
    hours: store.hours,
    features: store.features,
    ...(store.tableCount !== undefined ? { tableCount: store.tableCount } : {}),
    upcomingCount: upcoming.length,
    ...(next
      ? {
          nextEvent: {
            id: next.id,
            title: next.title,
            type: next.type,
            startsAt: next.startsAt,
            dateLabel: `${formatDate(next.startsAt, next.timeZone, locale, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })} · ${next.display.startTime}`,
          },
        }
      : {}),
  };
}

/** Group event summaries by host store slug. */
export function groupEventsByStore(events: readonly EventSummary[]): Map<string, EventSummary[]> {
  const byStore = new Map<string, EventSummary[]>();
  for (const event of events) {
    const slug = event.venue.storeSlug;
    if (!slug) continue;
    const list = byStore.get(slug);
    if (list) list.push(event);
    else byStore.set(slug, [event]);
  }
  return byStore;
}
