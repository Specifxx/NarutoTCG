import type {
  EventFormat,
  EventStatus,
  EventType,
  GeoPoint,
  Money,
  Region,
  RegistrationMethod,
  TcgEvent,
} from "@naruto-tcg/types";
import { countryName, flagEmoji, formatMoney, placeLabel } from "./format";
import { formatDate, formatDateSpan, formatTime, formatTimeRange, localDateKey, localeForRegion } from "./time";

/**
 * Lightweight, serialisable view of an event for lists, calendars and maps.
 *
 * All venue-local labels are formatted on the server (see `toEventSummary`) and
 * shipped as strings, so client components never re-format dates and cannot
 * produce hydration mismatches from differing ICU builds.
 */
export interface EventSummary {
  id: string;
  seriesId?: string;
  title: string;
  type: EventType;
  format: EventFormat;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  region: Region;
  venue: {
    name: string;
    hall?: string;
    city: string;
    admin?: string;
    country: string;
    location: GeoPoint;
    storeSlug?: string;
  };
  entryFee: Money;
  capacity: number | null;
  registeredCount: number;
  registrationMethod: RegistrationMethod;
  organizerName: string;
  organizerVerified: boolean;
  tags: string[];
  display: {
    /** "Sat, Oct 24, 2026" (start date). */
    date: string;
    /** Start date, or "Fri, Oct 23 – Sun, Oct 25, 2026" for multi-day events. */
    dateSpan: string;
    /** "11:00 AM – 5:00 PM PDT". */
    timeRange: string;
    /** "11:00 AM". */
    startTime: string;
    /** Day of month, "24". */
    day: string;
    /** "Oct". */
    month: string;
    /** "Sat". */
    weekday: string;
    /** Venue-local start date "YYYY-MM-DD". */
    localDate: string;
    /** Venue-local end date "YYYY-MM-DD". */
    localEndDate: string;
    /** "Free" or "$15". */
    fee: string;
    /** "Los Angeles, CA, USA". */
    place: string;
    countryName: string;
    flag: string;
  };
}

export function toEventSummary(event: TcgEvent): EventSummary {
  const { timeZone, startsAt, endsAt } = event;
  const locale = localeForRegion(event.region);
  return {
    id: event.id,
    ...(event.seriesId ? { seriesId: event.seriesId } : {}),
    title: event.title,
    type: event.type,
    format: event.format,
    status: event.status,
    startsAt,
    endsAt,
    timeZone,
    region: event.region,
    venue: {
      name: event.venue.name,
      ...(event.venue.hall ? { hall: event.venue.hall } : {}),
      city: event.venue.address.city,
      ...(event.venue.address.region ? { admin: event.venue.address.region } : {}),
      country: event.venue.address.country,
      location: event.venue.location,
      ...(event.venue.storeSlug ? { storeSlug: event.venue.storeSlug } : {}),
    },
    entryFee: event.entryFee,
    capacity: event.capacity,
    registeredCount: event.registeredCount,
    registrationMethod: event.registration.method,
    organizerName: event.organizer.name,
    organizerVerified: event.organizer.verified,
    tags: event.tags,
    display: {
      date: formatDate(startsAt, timeZone, locale),
      dateSpan: formatDateSpan(startsAt, endsAt, timeZone, locale),
      timeRange: formatTimeRange(startsAt, endsAt, timeZone, locale),
      startTime: formatTime(startsAt, timeZone, locale),
      day: formatDate(startsAt, timeZone, "en-US", { day: "numeric" }),
      month: formatDate(startsAt, timeZone, "en-US", { month: "short" }),
      weekday: formatDate(startsAt, timeZone, "en-US", { weekday: "short" }),
      localDate: localDateKey(startsAt, timeZone),
      localEndDate: localDateKey(endsAt, timeZone),
      fee: formatMoney(event.entryFee),
      place: placeLabel(event.venue.address),
      countryName: countryName(event.venue.address.country),
      flag: flagEmoji(event.venue.address.country),
    },
  };
}

/** Seats left, or null when the event has no cap. */
export function spotsLeft(event: Pick<EventSummary, "capacity" | "registeredCount">): number | null {
  return event.capacity === null ? null : Math.max(0, event.capacity - event.registeredCount);
}

export function isPast(event: Pick<EventSummary, "endsAt">, now: Date): boolean {
  return new Date(event.endsAt).getTime() <= now.getTime();
}

export function isLive(event: Pick<EventSummary, "startsAt" | "endsAt">, now: Date): boolean {
  const t = now.getTime();
  return new Date(event.startsAt).getTime() <= t && t < new Date(event.endsAt).getTime();
}
