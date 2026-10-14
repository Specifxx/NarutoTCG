import type {
  EventFormat,
  EventSource,
  EventStatus,
  EventType,
  GeoPoint,
  Money,
  Organizer,
  Participant,
  PostalAddress,
  RegistrationMethod,
  Store,
} from "@naruto-tcg/types";

/**
 * Seed / import format for `data/*.json`.
 *
 * This is the shape scrapers and organisers hand us: times are venue-local wall-clock
 * strings ("YYYY-MM-DDTHH:mm") rather than UTC instants, store-hosted events only
 * reference the store by slug, and weekly events are a single record with a
 * recurrence rule. `lib/data/normalize.ts` turns it into the domain types in
 * `@naruto-tcg/types`, and `lib/data/validate.ts` rejects anything malformed at build time.
 */

/** A store record. `region` is derived from the country. */
export type StoreSeed = Omit<Store, "region">;

export interface VenueSeed {
  name: string;
  hall?: string;
  address: PostalAddress;
  location: GeoPoint;
}

export interface RegistrationSeed {
  method: RegistrationMethod;
  url?: string;
  /** Venue-local "YYYY-MM-DDTHH:mm". */
  opens?: string;
  /** Venue-local "YYYY-MM-DDTHH:mm". */
  closes?: string;
}

export interface RecurrenceSeed {
  frequency: "weekly";
  /** Last local date (inclusive) an occurrence may fall on, "YYYY-MM-DD". */
  until: string;
  /** Local dates ("YYYY-MM-DD") to skip, e.g. holidays. */
  except?: string[];
}

export interface EventSeed {
  /** Unique, URL-safe (lowercase letters, digits, hyphens). Recurring occurrences get "-YYYY-MM-DD" appended. */
  id: string;
  title: string;
  type: EventType;
  format: EventFormat;
  status?: EventStatus;
  description: string;
  /** Host store from `stores.json`. Exactly one of `storeSlug` or `venue` is required. */
  storeSlug?: string;
  venue?: VenueSeed;
  /** Venue-local start, "YYYY-MM-DDTHH:mm". For recurring events, the first occurrence. */
  start: string;
  /** Venue-local end, "YYYY-MM-DDTHH:mm" (same day offset is reused for each occurrence). */
  end: string;
  /** IANA zone; defaults to the host store's zone. Required when `venue` is used. */
  timeZone?: string;
  entryFee: Money;
  capacity: number | null;
  registeredCount: number;
  registration: RegistrationSeed;
  /** Defaults to the host store as a verified "store" organiser. */
  organizer?: Organizer;
  participants?: Participant[];
  prizes?: string[];
  tags?: string[];
  recurrence?: RecurrenceSeed;
  source?: EventSource;
}

/** Gazetteer entry used to resolve "Find events near [ZIP/City]" without an external API. */
export interface PlaceSeed {
  name: string;
  /** State / province / county, e.g. "CA", "NSW", "Bavaria". */
  admin?: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  lat: number;
  lng: number;
  /** Alternative spellings and nicknames, e.g. ["LA", "L.A."]. */
  aliases?: string[];
  /** Postal codes or outward codes that resolve to this place, e.g. ["90012", "90013"] or ["M1", "M4"]. */
  postalCodes?: string[];
}

export type MilestoneKind = "convention" | "set-release" | "prerelease" | "championship" | "announcement";

export interface MilestoneSeed {
  id: string;
  title: string;
  subtitle: string;
  kind: MilestoneKind;
  /** Venue-local "YYYY-MM-DDTHH:mm" (or the release zone for global launches). */
  start: string;
  end?: string;
  timeZone: string;
  /** Date ("YYYY-MM-DD") the milestone was announced; drives the progress bar. */
  announced: string;
  location?: string;
  /** Links the countdown to an event detail page. */
  eventId?: string;
  /** External or internal link for more info. */
  href?: string;
  highlight?: boolean;
}
