/**
 * Event, venue and store domain types for the Naruto TCG organised-play platform.
 *
 * These are the normalised shapes the apps consume. Instants are ISO 8601 UTC
 * strings; every event and store also carries an IANA time zone so local
 * wall-clock times can be rendered correctly for the venue.
 */

export type EventType =
  | "premier-demo"
  | "convention-showcase"
  | "lgs-weekly"
  | "store-championship"
  | "regional";

export type EventFormat =
  | "learn-to-play"
  | "constructed"
  | "sealed"
  | "booster-draft"
  | "starter-deck-battle"
  | "team-battle";

export type EventStatus = "scheduled" | "postponed" | "cancelled";

export type RegistrationMethod = "online" | "in-store" | "external";

/** Continent-level grouping used for directory filters. */
export type Region = "north-america" | "europe" | "oceania" | "asia";

/** ISO 4217 currency codes the platform formats entry fees in. */
export type CurrencyCode =
  | "USD"
  | "CAD"
  | "EUR"
  | "GBP"
  | "AUD"
  | "NZD"
  | "SEK"
  | "NOK"
  | "DKK"
  | "PLN"
  | "CHF"
  | "JPY";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PostalAddress {
  line1: string;
  line2?: string;
  city: string;
  /** State, province, county or region. */
  region?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US", "GB", "AU". */
  country: string;
}

export interface Money {
  /** Major currency units (e.g. 12.5 = $12.50). 0 means free entry. */
  amount: number;
  currency: CurrencyCode;
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** Local 24h opening window, e.g. ["11:00", "21:30"]. "24:00" is allowed as a close time. */
export type OpeningWindow = [open: string, close: string];

/** Opening windows per weekday; an empty array means closed all day. */
export type WeeklyHours = Record<Weekday, OpeningWindow[]>;

export type StoreFeature =
  | "demo-kits"
  | "weekly-play"
  | "tournament-host"
  | "prerelease-host"
  | "play-space"
  | "singles"
  | "sealed-product"
  | "accessible"
  | "parking"
  | "food-drink";

export interface SocialLinks {
  instagram?: string;
  x?: string;
  facebook?: string;
  discord?: string;
  youtube?: string;
  tiktok?: string;
  twitch?: string;
}

export interface StoreContact {
  phone?: string;
  email?: string;
  website?: string;
}

export interface Store {
  slug: string;
  name: string;
  tagline?: string;
  description: string;
  verified: boolean;
  /** Date (YYYY-MM-DD) the store was verified as an official demo host. */
  verifiedSince?: string;
  address: PostalAddress;
  location: GeoPoint;
  timeZone: string;
  region: Region;
  contact: StoreContact;
  social: SocialLinks;
  hours: WeeklyHours;
  features: StoreFeature[];
  tableCount?: number;
  /** BCP 47 language tags spoken by staff, e.g. ["en", "es"]. */
  languages: string[];
  /** Where an imported record came from. */
  source?: EventSource;
}

export interface Venue {
  name: string;
  /** Hall, booth or room within the venue, e.g. "Hall B · Booth 2140". */
  hall?: string;
  address: PostalAddress;
  location: GeoPoint;
  /** Set when the venue is a store from the directory. */
  storeSlug?: string;
}

export type OrganizerKind = "official" | "store" | "community";

export interface Organizer {
  name: string;
  kind: OrganizerKind;
  verified: boolean;
  email?: string;
  phone?: string;
  website?: string;
  storeSlug?: string;
}

export interface Participant {
  displayName: string;
  /** ISO 3166-1 alpha-2 country code. */
  country?: string;
  /** Optional team or club the player represents. */
  team?: string;
}

export interface EventRegistration {
  method: RegistrationMethod;
  /** External sign-up page when method is "external". */
  url?: string;
  /** ISO UTC instant registration opens. Absent = already open. */
  opensAt?: string;
  /** ISO UTC instant registration closes. Absent = closes at event start. */
  closesAt?: string;
}

export interface EventSource {
  url: string;
  /** ISO date-time the record was captured from the source. */
  retrievedAt: string;
}

export interface TcgEvent {
  /** URL-safe unique id; occurrences of recurring events are suffixed with their local date. */
  id: string;
  /** Shared id for every occurrence of a recurring series. */
  seriesId?: string;
  title: string;
  type: EventType;
  format: EventFormat;
  status: EventStatus;
  description: string;
  /** ISO 8601 UTC instant. */
  startsAt: string;
  /** ISO 8601 UTC instant. */
  endsAt: string;
  /** IANA time zone of the venue, e.g. "America/Los_Angeles". */
  timeZone: string;
  venue: Venue;
  region: Region;
  entryFee: Money;
  /** Maximum players; null means no cap. */
  capacity: number | null;
  registeredCount: number;
  registration: EventRegistration;
  organizer: Organizer;
  /** Public roster, only present when the organiser publishes one. */
  participants?: Participant[];
  prizes: string[];
  tags: string[];
  source?: EventSource;
}
