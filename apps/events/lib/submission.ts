import type {
  CurrencyCode,
  EventFormat,
  EventType,
  GeoPoint,
  Money,
  Organizer,
  OrganizerKind,
  Region,
  RegistrationMethod,
} from "@naruto-tcg/types";
import type { EventSeed, VenueSeed } from "./data/schema";
import { isEventFormat, isEventType, regionForCountry } from "./event-meta";
import { addDaysToKey, formatDate, isLocalDate, isValidTimeZone } from "./time";

/**
 * "Organise / Submit an event": the submission contract shared by the wizard
 * (`components/submit/*`) and `POST /api/submissions`.
 *
 * Isomorphic and pure (no "server-only", no storage): the wizard validates each
 * step with exactly the rules the API enforces, and the review step renders the
 * same `toEventSeed` JSON the moderation queue would import into `data/events.json`.
 *
 * Two shapes are involved:
 *   - `SubmissionDraft` is the form state. Every input is a string (so "empty" is
 *     representable), both venue modes keep their fields, and enums may be "".
 *   - `EventSubmission` is the clean, typed payload. `validateSubmission` turns any
 *     draft-like or submission-like JSON into one, or into field errors.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type OrganiserRole = "store-owner" | "tournament-organizer" | "community-leader";
export type VenueMode = "store" | "new";
export type Recurrence = "none" | "weekly";

export interface SubmissionOrganiser {
  name: string;
  email: string;
  role: OrganiserRole;
  phone?: string;
}

export interface StoreVenueSubmission {
  mode: "store";
  storeSlug: string;
}

export interface NewVenueSubmission {
  mode: "new";
  name: string;
  line1: string;
  line2?: string;
  city: string;
  /** State, province or county. */
  region?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  lat?: number;
  lng?: number;
}

export type VenueSubmission = StoreVenueSubmission | NewVenueSubmission;

export interface EventSubmission {
  organiser: SubmissionOrganiser;
  venue: VenueSubmission;
  event: { title: string; type: EventType; format: EventFormat; description: string; tags: string[] };
  schedule: {
    /** Venue-local "YYYY-MM-DD". */
    date: string;
    /** Venue-local "HH:mm". */
    startTime: string;
    endTime: string;
    /** Last day of a multi-day event, "YYYY-MM-DD". */
    endDate?: string;
    timeZone: string;
    recurrence: Recurrence;
    /** Last date a weekly session may fall on, "YYYY-MM-DD". */
    repeatUntil?: string;
  };
  capacity: { uncapped: boolean; max?: number };
  fee: Money;
  registration: { method: RegistrationMethod; url?: string; opensDate?: string };
  prizes: string[];
  participantListPublic: boolean;
  agreeToGuidelines: boolean;
}

export interface SubmissionDraft {
  organiser: { name: string; email: string; role: OrganiserRole | ""; phone: string };
  venue: {
    mode: VenueMode | "";
    storeSlug: string;
    name: string;
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    lat: string;
    lng: string;
  };
  event: { type: EventType | ""; format: EventFormat | ""; title: string; description: string; tags: string[] };
  schedule: {
    date: string;
    startTime: string;
    endTime: string;
    multiDay: boolean;
    endDate: string;
    timeZone: string;
    recurrence: Recurrence | "";
    repeatUntil: string;
  };
  capacity: { uncapped: boolean; max: string };
  fee: { amount: string; currency: CurrencyCode | "" };
  registration: { method: RegistrationMethod | ""; url: string; opensDate: string };
  prizes: string[];
  participantListPublic: boolean;
  agreeToGuidelines: boolean;
}

/** Verified directory store as offered by the wizard's store picker (built on the server). */
export interface SubmissionStoreOption {
  slug: string;
  name: string;
  city: string;
  country: string;
  timeZone: string;
  region: Region;
  /** Pre-formatted "Los Angeles, CA, USA". */
  place: string;
}

/**
 * The seed a submission becomes. Identical to `EventSeed`, except that a new venue
 * submitted without coordinates has no `location` yet: moderators geocode the
 * address before import (see `isImportReady`).
 */
export type SubmissionSeed = Omit<EventSeed, "venue"> & {
  venue?: Omit<VenueSeed, "location"> & { location?: GeoPoint };
};

/** Field path ("organiser.email", "prizes.2") → message. */
export type FieldErrors = Record<string, string>;

export interface ValidationContext {
  /** Earliest allowed event date, "YYYY-MM-DD" — today where the validation runs. */
  today: string;
  /** Extra days allowed past the 18-month horizon (servers validating against UTC pass 2). */
  horizonSlackDays?: number;
  /** When given, a store venue must be one of these slugs. */
  storeSlugs?: ReadonlySet<string>;
}

export type SubmissionValidation = { ok: true; value: EventSubmission } | { ok: false; errors: FieldErrors };

/** JSON body of `POST /api/submissions`. `website` is the honeypot and must stay empty. */
export type SubmissionRequest = EventSubmission & { website?: string };

export type SubmissionStatus = "pending_review";

export interface SubmissionResponse {
  /** "SUB-" followed by 6 uppercase letters/digits. */
  id: string;
  status: SubmissionStatus;
  receivedAt: string;
  /** The seed queued for moderation. */
  seed?: SubmissionSeed;
}

export type SubmissionErrorCode = "invalid" | "rate-limited" | "too-large" | "unsupported-media-type" | "bad-request";

export interface SubmissionErrorResponse {
  error: string;
  code: SubmissionErrorCode;
  errors?: FieldErrors;
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

export type StepId = "organiser" | "details" | "schedule" | "registration" | "review";

export interface StepMeta {
  id: StepId;
  title: string;
  shortTitle: string;
  description: string;
}

export const STEPS: readonly StepMeta[] = [
  {
    id: "organiser",
    title: "Organiser & venue",
    shortTitle: "Venue",
    description: "Who is running the event, and where it takes place.",
  },
  {
    id: "details",
    title: "Event details",
    shortTitle: "Details",
    description: "What kind of event it is and what players can expect.",
  },
  {
    id: "schedule",
    title: "Schedule & capacity",
    shortTitle: "Schedule",
    description: "When it runs, how many players fit, and what entry costs.",
  },
  {
    id: "registration",
    title: "Registration & prizes",
    shortTitle: "Sign-up",
    description: "How players sign up and what they can win.",
  },
  {
    id: "review",
    title: "Review & submit",
    shortTitle: "Review",
    description: "Check everything before it goes to our moderators.",
  },
];

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

const STEP_BY_PREFIX: Record<string, StepId> = {
  organiser: "organiser",
  venue: "organiser",
  event: "details",
  schedule: "schedule",
  capacity: "schedule",
  fee: "schedule",
  registration: "registration",
  prizes: "registration",
  participantListPublic: "registration",
  agreeToGuidelines: "review",
};

/** Which step owns a field path. Unknown paths belong to the review step. */
export function stepForField(path: string): StepId {
  return STEP_BY_PREFIX[path.split(".")[0]] ?? "review";
}

/** The earliest step (in wizard order) that has an error, if any. */
export function firstStepWithErrors(errors: FieldErrors): StepId | undefined {
  const steps = new Set(Object.keys(errors).map(stepForField));
  return STEPS.find((s) => steps.has(s.id))?.id;
}

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

export const REVIEW_BUSINESS_DAYS = 2;

export const LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 254 },
  address: { min: 2, max: 120 },
  title: { min: 8, max: 100 },
  description: { min: 40, max: 2000 },
  tags: { max: 8, min: 2, maxLength: 24 },
  prizes: { max: 10, min: 2, maxLength: 120 },
  capacity: { min: 2, max: 5000 },
  url: { max: 500 },
  horizonMonths: 18,
  seriesMonths: 6,
  multiDayMaxDays: 7,
} as const;

export const ORGANISER_ROLES: readonly { role: OrganiserRole; label: string; description: string }[] = [
  { role: "store-owner", label: "Store owner or staff", description: "You run or work at the hosting game store." },
  {
    role: "tournament-organizer",
    label: "Tournament organiser",
    description: "You run competitive events, possibly across several venues.",
  },
  {
    role: "community-leader",
    label: "Community leader",
    description: "You run a club, Discord or meetup and are hosting for your group.",
  },
];

export const REGISTRATION_METHODS: readonly { method: RegistrationMethod; label: string; description: string }[] = [
  {
    method: "online",
    label: "Online, on this site",
    description: "Players register on the event page. We track capacity and the waitlist for you.",
  },
  {
    method: "in-store",
    label: "In person at the venue",
    description: "Players sign up at the counter or on the day.",
  },
  {
    method: "external",
    label: "External sign-up page",
    description: "Players register on your own site, Discord form or ticketing platform.",
  },
];

export const CURRENCIES: readonly CurrencyCode[] = [
  "USD",
  "CAD",
  "EUR",
  "GBP",
  "AUD",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CHF",
  "JPY",
];

/** Entry fee ceiling in major units. Yen has no minor unit, so its ceiling is scaled. */
export function feeLimit(currency: CurrencyCode): number {
  return currency === "JPY" ? 50_000 : 500;
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export interface VenueCountry {
  code: string;
  name: string;
  currency: CurrencyCode;
  /** Set when the country has a single time zone. */
  timeZone?: string;
}

/** Countries a new venue can be in. Names are fixed strings so server and browser render identically. */
export const VENUE_COUNTRIES: readonly VenueCountry[] = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "MX", name: "Mexico", currency: "USD", timeZone: "America/Mexico_City" },
  { code: "AT", name: "Austria", currency: "EUR", timeZone: "Europe/Vienna" },
  { code: "BE", name: "Belgium", currency: "EUR", timeZone: "Europe/Brussels" },
  { code: "CZ", name: "Czechia", currency: "EUR", timeZone: "Europe/Prague" },
  { code: "DK", name: "Denmark", currency: "DKK", timeZone: "Europe/Copenhagen" },
  { code: "FI", name: "Finland", currency: "EUR", timeZone: "Europe/Helsinki" },
  { code: "FR", name: "France", currency: "EUR", timeZone: "Europe/Paris" },
  { code: "DE", name: "Germany", currency: "EUR", timeZone: "Europe/Berlin" },
  { code: "IE", name: "Ireland", currency: "EUR", timeZone: "Europe/Dublin" },
  { code: "IT", name: "Italy", currency: "EUR", timeZone: "Europe/Rome" },
  { code: "LU", name: "Luxembourg", currency: "EUR", timeZone: "Europe/Luxembourg" },
  { code: "NL", name: "Netherlands", currency: "EUR", timeZone: "Europe/Amsterdam" },
  { code: "NO", name: "Norway", currency: "NOK", timeZone: "Europe/Oslo" },
  { code: "PL", name: "Poland", currency: "PLN", timeZone: "Europe/Warsaw" },
  { code: "PT", name: "Portugal", currency: "EUR", timeZone: "Europe/Lisbon" },
  { code: "ES", name: "Spain", currency: "EUR", timeZone: "Europe/Madrid" },
  { code: "SE", name: "Sweden", currency: "SEK", timeZone: "Europe/Stockholm" },
  { code: "CH", name: "Switzerland", currency: "CHF", timeZone: "Europe/Zurich" },
  { code: "GB", name: "United Kingdom", currency: "GBP", timeZone: "Europe/London" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "NZ", name: "New Zealand", currency: "NZD", timeZone: "Pacific/Auckland" },
  { code: "JP", name: "Japan", currency: "JPY", timeZone: "Asia/Tokyo" },
  { code: "PH", name: "Philippines", currency: "USD", timeZone: "Asia/Manila" },
  { code: "SG", name: "Singapore", currency: "USD", timeZone: "Asia/Singapore" },
  { code: "KR", name: "South Korea", currency: "USD", timeZone: "Asia/Seoul" },
];

const COUNTRY_INDEX = new Map(VENUE_COUNTRIES.map((c) => [c.code, c]));

export function venueCountry(code: string): VenueCountry | undefined {
  return COUNTRY_INDEX.get(code.toUpperCase());
}

/** Default entry-fee currency for a country (EUR across Europe, USD elsewhere). */
export function currencyForCountry(code: string): CurrencyCode {
  const known = venueCountry(code)?.currency;
  if (known) return known;
  return regionForCountry(code) === "europe" ? "EUR" : "USD";
}

export interface TimeZoneGroup {
  label: string;
  zones: readonly { value: string; label: string }[];
}

export const TIME_ZONE_GROUPS: readonly TimeZoneGroup[] = [
  {
    label: "Americas",
    zones: [
      { value: "Pacific/Honolulu", label: "Honolulu (Hawaii)" },
      { value: "America/Anchorage", label: "Anchorage (Alaska)" },
      { value: "America/Los_Angeles", label: "Los Angeles (Pacific)" },
      { value: "America/Vancouver", label: "Vancouver (Pacific)" },
      { value: "America/Phoenix", label: "Phoenix (Arizona)" },
      { value: "America/Denver", label: "Denver (Mountain)" },
      { value: "America/Edmonton", label: "Edmonton (Mountain)" },
      { value: "America/Chicago", label: "Chicago (Central)" },
      { value: "America/Winnipeg", label: "Winnipeg (Central)" },
      { value: "America/Mexico_City", label: "Mexico City" },
      { value: "America/New_York", label: "New York (Eastern)" },
      { value: "America/Toronto", label: "Toronto (Eastern)" },
      { value: "America/Halifax", label: "Halifax (Atlantic)" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { value: "Europe/London", label: "London" },
      { value: "Europe/Dublin", label: "Dublin" },
      { value: "Europe/Lisbon", label: "Lisbon" },
      { value: "Europe/Paris", label: "Paris" },
      { value: "Europe/Brussels", label: "Brussels" },
      { value: "Europe/Amsterdam", label: "Amsterdam" },
      { value: "Europe/Luxembourg", label: "Luxembourg" },
      { value: "Europe/Berlin", label: "Berlin" },
      { value: "Europe/Zurich", label: "Zurich" },
      { value: "Europe/Vienna", label: "Vienna" },
      { value: "Europe/Prague", label: "Prague" },
      { value: "Europe/Madrid", label: "Madrid" },
      { value: "Europe/Rome", label: "Rome" },
      { value: "Europe/Copenhagen", label: "Copenhagen" },
      { value: "Europe/Oslo", label: "Oslo" },
      { value: "Europe/Stockholm", label: "Stockholm" },
      { value: "Europe/Warsaw", label: "Warsaw" },
      { value: "Europe/Helsinki", label: "Helsinki" },
      { value: "Europe/Athens", label: "Athens" },
    ],
  },
  {
    label: "Oceania",
    zones: [
      { value: "Australia/Perth", label: "Perth (AWST)" },
      { value: "Australia/Darwin", label: "Darwin (ACST)" },
      { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
      { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
      { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
      { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
      { value: "Australia/Hobart", label: "Hobart (AEST/AEDT)" },
      { value: "Pacific/Auckland", label: "Auckland" },
    ],
  },
  {
    label: "Asia",
    zones: [
      { value: "Asia/Tokyo", label: "Tokyo" },
      { value: "Asia/Seoul", label: "Seoul" },
      { value: "Asia/Manila", label: "Manila" },
      { value: "Asia/Singapore", label: "Singapore" },
      { value: "Asia/Hong_Kong", label: "Hong Kong" },
    ],
  },
];

const ZONE_LABELS = new Map(TIME_ZONE_GROUPS.flatMap((g) => g.zones.map((z) => [z.value, z.label] as const)));

export function isListedTimeZone(value: string): boolean {
  return ZONE_LABELS.has(value);
}

/** "Los Angeles (Pacific)", or the IANA id made readable for zones outside the list. */
export function timeZoneLabel(value: string): string {
  return ZONE_LABELS.get(value) ?? value.replace(/_/g, " ");
}

export const TAG_SUGGESTIONS: readonly string[] = [
  "beginner-friendly",
  "loaner-decks",
  "family-friendly",
  "casual",
  "competitive",
  "promo-cards",
  "top-8",
  "streamed",
  "bilingual",
  "kids",
];

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Length in user-perceived code points (emoji count once), as limits are enforced. */
export function charCount(value: string): number {
  return [...value].length;
}

/** Single-line text: trimmed, inner whitespace collapsed. */
export function cleanLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Multi-line text: unified newlines, no trailing spaces, at most one blank line in a row. */
export function cleanMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Beginner Friendly!" → "beginner-friendly". Returns "" when nothing usable is left. */
export function normalizeTag(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.tags.maxLength)
    .replace(/-+$/, "");
}

export function isValidTag(tag: string): boolean {
  return TAG.test(tag) && tag.length >= LIMITS.tags.min && tag.length <= LIMITS.tags.maxLength;
}

/** Add whole calendar months to a "YYYY-MM-DD" key, clamping to the month's last day. */
export function addMonthsToKey(key: string, months: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

/** Whole days from one "YYYY-MM-DD" key to another. */
export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "YYYY-MM-DD" of a Date in the runtime's own zone (the organiser's browser). */
export function localDateKeyOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Validation context for the API: UTC today minus a day, so no organiser's "today" is ever rejected. */
export function serverValidationContext(now: Date, storeSlugs?: ReadonlySet<string>): ValidationContext {
  return {
    today: addDaysToKey(now.toISOString().slice(0, 10), -1),
    horizonSlackDays: 2,
    ...(storeSlugs ? { storeSlugs } : {}),
  };
}

/** Last date an event may be scheduled on. */
export function latestEventDate(ctx: Pick<ValidationContext, "today" | "horizonSlackDays">): string {
  return addDaysToKey(addMonthsToKey(ctx.today, LIMITS.horizonMonths), ctx.horizonSlackDays ?? 0);
}

/**
 * Deterministic label for a calendar date key ("Sat, Nov 7, 2026"). The key is
 * a wall-clock date, so it is formatted at UTC noon in UTC — never shifted by a zone.
 */
export function describeDateKey(
  key: string,
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" },
): string {
  if (!isLocalDate(key)) return key;
  return formatDate(`${key}T12:00:00Z`, "UTC", "en-US", options);
}

export function weekdayOfKey(key: string): string {
  return describeDateKey(key, { weekday: "long" });
}

/** Sessions in a weekly series from `date` through `until` (inclusive). */
export function weeklyOccurrences(date: string, until: string): number {
  if (!isLocalDate(date) || !isLocalDate(until) || until < date) return 0;
  return Math.floor(daysBetweenKeys(date, until) / 7) + 1;
}

/* -------------------------------------------------------------------------- */
/* Drafts                                                                     */
/* -------------------------------------------------------------------------- */

export function createEmptyDraft(options: { store?: SubmissionStoreOption; timeZone?: string } = {}): SubmissionDraft {
  const { store } = options;
  return {
    organiser: { name: "", email: "", role: "", phone: "" },
    venue: {
      mode: "store",
      storeSlug: store?.slug ?? "",
      name: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
      lat: "",
      lng: "",
    },
    event: { type: "", format: "", title: "", description: "", tags: [] },
    schedule: {
      date: "",
      startTime: "",
      endTime: "",
      multiDay: false,
      endDate: "",
      timeZone: store?.timeZone ?? options.timeZone ?? "",
      recurrence: "none",
      repeatUntil: "",
    },
    capacity: { uncapped: false, max: "" },
    fee: { amount: "", currency: store ? currencyForCountry(store.country) : "USD" },
    registration: { method: "online", url: "", opensDate: "" },
    prizes: [],
    participantListPublic: false,
    agreeToGuidelines: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const rec = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
const str = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | "" =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : "";

const ROLE_VALUES = ORGANISER_ROLES.map((r) => r.role);
const METHOD_VALUES = REGISTRATION_METHODS.map((m) => m.method);

/**
 * Read untrusted JSON — a stored draft, or an `EventSubmission` posted to the API —
 * into a draft. Never throws; anything unusable becomes "" and fails validation.
 */
export function coerceDraft(input: unknown): SubmissionDraft {
  const body = rec(input);
  const organiser = rec(body.organiser);
  const venue = rec(body.venue);
  const event = rec(body.event);
  const schedule = rec(body.schedule);
  const capacity = rec(body.capacity);
  const fee = rec(body.fee);
  const registration = rec(body.registration);
  const endDate = str(schedule.endDate);
  return {
    organiser: {
      name: str(organiser.name),
      email: str(organiser.email),
      role: oneOf(organiser.role, ROLE_VALUES),
      phone: str(organiser.phone),
    },
    venue: {
      mode: oneOf(venue.mode, ["store", "new"] as const),
      storeSlug: str(venue.storeSlug),
      name: str(venue.name),
      line1: str(venue.line1),
      line2: str(venue.line2),
      city: str(venue.city),
      region: str(venue.region),
      postalCode: str(venue.postalCode),
      country: str(venue.country).toUpperCase(),
      lat: str(venue.lat),
      lng: str(venue.lng),
    },
    event: {
      type: isEventType(event.type) ? event.type : "",
      format: isEventFormat(event.format) ? event.format : "",
      title: str(event.title),
      description: str(event.description),
      tags: strings(event.tags),
    },
    schedule: {
      date: str(schedule.date),
      startTime: str(schedule.startTime),
      endTime: str(schedule.endTime),
      multiDay: typeof schedule.multiDay === "boolean" ? schedule.multiDay : endDate !== "",
      endDate,
      timeZone: str(schedule.timeZone),
      recurrence: schedule.recurrence === undefined ? "none" : oneOf(schedule.recurrence, ["none", "weekly"] as const),
      repeatUntil: str(schedule.repeatUntil),
    },
    capacity: { uncapped: capacity.uncapped === true, max: str(capacity.max) },
    fee: { amount: str(fee.amount), currency: isCurrencyCode(fee.currency) ? fee.currency : "" },
    registration: {
      method: oneOf(registration.method, METHOD_VALUES),
      url: str(registration.url),
      opensDate: str(registration.opensDate),
    },
    prizes: strings(body.prizes),
    participantListPublic: body.participantListPublic === true,
    agreeToGuidelines: body.agreeToGuidelines === true,
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

// Deliberately permissive (one "@", a dotted domain, no spaces); deliverability is the mailer's job.
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const PHONE = /^\+?[\d\s().-]{6,24}$/;
const POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]{0,10}[A-Za-z0-9]$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const WHOLE = /^\d+$/;
const DECIMAL_2 = /^\d+(?:\.\d{1,2})?$/;

function lengthError(value: string, min: number, max: number, emptyMessage?: string): string | undefined {
  const n = charCount(value);
  if (n === 0) return emptyMessage;
  if (n < min) return `Use at least ${min} characters.`;
  if (n > max) return `Use ${max} characters or fewer (currently ${n}).`;
  return undefined;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** "" → undefined (not given); a usable number; or null when it can't be parsed. */
function parseCoordinate(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

class ErrorBag {
  readonly errors: FieldErrors = {};
  set(path: string, message: string | undefined) {
    if (message && !(path in this.errors)) this.errors[path] = message;
  }
}

function validateOrganiserStep(d: SubmissionDraft, ctx: ValidationContext): FieldErrors {
  const bag = new ErrorBag();
  const { organiser, venue } = d;

  bag.set(
    "organiser.name",
    lengthError(cleanLine(organiser.name), LIMITS.name.min, LIMITS.name.max, "Enter your name."),
  );
  const email = organiser.email.trim();
  if (!email) bag.set("organiser.email", "Enter your email address.");
  else if (email.length > LIMITS.email.max || !EMAIL.test(email))
    bag.set("organiser.email", "Enter a valid email address, like name@example.com.");
  if (!organiser.role) bag.set("organiser.role", "Choose the option that best describes you.");
  const phone = organiser.phone.trim();
  if (phone && (!PHONE.test(phone) || phone.replace(/\D/g, "").length < 6))
    bag.set("organiser.phone", "Enter a phone number with at least 6 digits, or leave it blank.");

  if (!venue.mode) {
    bag.set("venue.mode", "Choose where the event takes place.");
  } else if (venue.mode === "store") {
    const slug = venue.storeSlug.trim();
    if (!slug) bag.set("venue.storeSlug", "Choose a store from the directory.");
    else if (ctx.storeSlugs && !ctx.storeSlugs.has(slug))
      bag.set("venue.storeSlug", "That store isn't in the verified directory. Choose another, or add a new venue.");
  } else {
    bag.set(
      "venue.name",
      lengthError(cleanLine(venue.name), LIMITS.name.min, LIMITS.name.max, "Enter the venue's name."),
    );
    bag.set(
      "venue.line1",
      lengthError(cleanLine(venue.line1), LIMITS.address.min, LIMITS.address.max, "Enter the street address."),
    );
    bag.set("venue.line2", lengthError(cleanLine(venue.line2), 1, LIMITS.address.max));
    bag.set("venue.city", lengthError(cleanLine(venue.city), LIMITS.name.min, LIMITS.name.max, "Enter the town or city."));
    bag.set("venue.region", lengthError(cleanLine(venue.region), 1, LIMITS.name.max));
    const postal = venue.postalCode.trim();
    if (postal && !POSTAL.test(postal)) bag.set("venue.postalCode", "Use letters, numbers, spaces and hyphens only.");
    if (!venue.country) bag.set("venue.country", "Choose the country.");
    else if (!venueCountry(venue.country)) bag.set("venue.country", "Choose a country from the list.");

    const lat = parseCoordinate(venue.lat);
    const lng = parseCoordinate(venue.lng);
    if (lat === null || (lat !== undefined && Math.abs(lat) > 90))
      bag.set("venue.lat", "Latitude must be a number between -90 and 90.");
    if (lng === null || (lng !== undefined && Math.abs(lng) > 180))
      bag.set("venue.lng", "Longitude must be a number between -180 and 180.");
    if (lat === undefined && lng !== undefined && lng !== null) bag.set("venue.lat", "Add the latitude too, or clear both.");
    if (lng === undefined && lat !== undefined && lat !== null) bag.set("venue.lng", "Add the longitude too, or clear both.");
  }
  return bag.errors;
}

function validateDetailsStep(d: SubmissionDraft): FieldErrors {
  const bag = new ErrorBag();
  const { event } = d;
  if (!event.type) bag.set("event.type", "Choose the type of event.");
  if (!event.format) bag.set("event.format", "Choose a format.");
  bag.set(
    "event.title",
    lengthError(cleanLine(event.title), LIMITS.title.min, LIMITS.title.max, "Give the event a title."),
  );
  bag.set(
    "event.description",
    lengthError(
      cleanMultiline(event.description),
      LIMITS.description.min,
      LIMITS.description.max,
      "Describe the event for players.",
    ),
  );
  if (event.tags.length > LIMITS.tags.max) bag.set("event.tags", `Use up to ${LIMITS.tags.max} tags.`);
  const invalid = event.tags.find((t) => !isValidTag(t));
  if (invalid !== undefined)
    bag.set(
      "event.tags",
      `"${invalid}" isn't a valid tag. Use ${LIMITS.tags.min}–${LIMITS.tags.maxLength} lowercase letters, numbers and hyphens.`,
    );
  if (new Set(event.tags).size !== event.tags.length) bag.set("event.tags", "Remove the duplicate tags.");
  return bag.errors;
}

function validateScheduleStep(d: SubmissionDraft, ctx: ValidationContext): FieldErrors {
  const bag = new ErrorBag();
  const { schedule, capacity, fee } = d;

  const dateOk = isLocalDate(schedule.date);
  const latest = latestEventDate(ctx);
  if (!schedule.date) bag.set("schedule.date", "Choose the event date.");
  else if (!dateOk) bag.set("schedule.date", "Enter a real date.");
  else if (schedule.date < ctx.today) bag.set("schedule.date", "The event date can't be in the past.");
  else if (schedule.date > latest)
    bag.set(
      "schedule.date",
      `Events can be listed up to ${LIMITS.horizonMonths} months ahead (until ${describeDateKey(latest)}).`,
    );

  const startOk = TIME.test(schedule.startTime);
  const endOk = TIME.test(schedule.endTime);
  if (!startOk) bag.set("schedule.startTime", schedule.startTime ? "Enter a time like 18:30." : "Enter the start time.");
  if (!endOk) bag.set("schedule.endTime", schedule.endTime ? "Enter a time like 22:00." : "Enter the finish time.");

  if (schedule.multiDay) {
    const endDate = schedule.endDate;
    if (!endDate) bag.set("schedule.endDate", "Choose the last day of the event.");
    else if (!isLocalDate(endDate)) bag.set("schedule.endDate", "Enter a real date.");
    else if (dateOk && endDate <= schedule.date) bag.set("schedule.endDate", "The last day must be after the first day.");
    else if (dateOk && daysBetweenKeys(schedule.date, endDate) >= LIMITS.multiDayMaxDays)
      bag.set("schedule.endDate", `Multi-day events can run for up to ${LIMITS.multiDayMaxDays} days.`);
  } else if (startOk && endOk && schedule.endTime <= schedule.startTime) {
    bag.set(
      "schedule.endTime",
      "The finish time must be after the start time. For events that run past midnight, tick “Runs over multiple days”.",
    );
  }

  if (!schedule.timeZone) bag.set("schedule.timeZone", "Choose the venue's time zone.");
  else if (!isValidTimeZone(schedule.timeZone)) bag.set("schedule.timeZone", "Choose a time zone from the list.");

  if (!schedule.recurrence) bag.set("schedule.recurrence", "Choose whether the event repeats.");
  else if (schedule.recurrence === "weekly") {
    if (schedule.multiDay)
      bag.set("schedule.recurrence", "Multi-day events can't repeat weekly. Choose One-off, or untick multiple days.");
    const until = schedule.repeatUntil;
    if (!until) bag.set("schedule.repeatUntil", "Choose the date of the last session.");
    else if (!isLocalDate(until)) bag.set("schedule.repeatUntil", "Enter a real date.");
    else if (dateOk && until < addDaysToKey(schedule.date, 7))
      bag.set("schedule.repeatUntil", "Choose a date at least a week after the first session.");
    else if (dateOk && until > addMonthsToKey(schedule.date, LIMITS.seriesMonths))
      bag.set(
        "schedule.repeatUntil",
        `Weekly series can be listed ${LIMITS.seriesMonths} months at a time (until ${describeDateKey(
          addMonthsToKey(schedule.date, LIMITS.seriesMonths),
        )}).`,
      );
  }

  if (!capacity.uncapped) {
    const max = capacity.max.trim();
    if (!max) bag.set("capacity.max", "Enter the player cap, or tick “No player cap”.");
    else if (!WHOLE.test(max)) bag.set("capacity.max", "Enter a whole number of players.");
    else if (Number(max) < LIMITS.capacity.min || Number(max) > LIMITS.capacity.max)
      bag.set("capacity.max", `Player caps run from ${LIMITS.capacity.min} to ${LIMITS.capacity.max.toLocaleString("en-US")}.`);
  }

  if (!fee.currency) bag.set("fee.currency", "Choose a currency.");
  const amount = fee.amount.trim();
  const decimals = fee.currency === "JPY" ? WHOLE : DECIMAL_2;
  if (!amount) bag.set("fee.amount", "Enter the entry fee, or 0 for free entry.");
  else if (!decimals.test(amount))
    bag.set("fee.amount", fee.currency === "JPY" ? "Enter a whole amount of yen." : "Enter an amount like 10 or 12.50.");
  else if (fee.currency && Number(amount) > feeLimit(fee.currency))
    bag.set("fee.amount", `Entry fees can be up to ${feeLimit(fee.currency).toLocaleString("en-US")} ${fee.currency}.`);

  return bag.errors;
}

function validateRegistrationStep(d: SubmissionDraft, ctx: ValidationContext): FieldErrors {
  const bag = new ErrorBag();
  const { registration } = d;

  if (!registration.method) bag.set("registration.method", "Choose how players register.");
  if (registration.method === "external") {
    const url = registration.url.trim();
    if (!url) bag.set("registration.url", "Enter the sign-up link.");
    else if (url.length > LIMITS.url.max || !isHttpsUrl(url))
      bag.set("registration.url", "Enter a full, secure link starting with https://");
  }

  const opens = registration.opensDate.trim();
  if (opens) {
    if (!isLocalDate(opens)) bag.set("registration.opensDate", "Enter a real date.");
    else if (opens < ctx.today)
      bag.set("registration.opensDate", "Pick today or later, or leave it blank if sign-ups open straight away.");
    else if (isLocalDate(d.schedule.date) && opens > d.schedule.date)
      bag.set("registration.opensDate", "Registration has to open on or before the event date.");
  }

  const filled = d.prizes.filter((p) => cleanLine(p) !== "");
  if (filled.length > LIMITS.prizes.max) bag.set("prizes", `List up to ${LIMITS.prizes.max} prizes.`);
  d.prizes.forEach((prize, i) => {
    const value = cleanLine(prize);
    if (value) bag.set(`prizes.${i}`, lengthError(value, LIMITS.prizes.min, LIMITS.prizes.maxLength));
  });
  return bag.errors;
}

function validateReviewStep(d: SubmissionDraft): FieldErrors {
  return d.agreeToGuidelines
    ? {}
    : { agreeToGuidelines: "Confirm the event meets the community guidelines to submit it." };
}

/** Errors for one wizard step. Only that step's fields are checked. */
export function validateStep(step: StepId, draft: SubmissionDraft, ctx: ValidationContext): FieldErrors {
  switch (step) {
    case "organiser":
      return validateOrganiserStep(draft, ctx);
    case "details":
      return validateDetailsStep(draft);
    case "schedule":
      return validateScheduleStep(draft, ctx);
    case "registration":
      return validateRegistrationStep(draft, ctx);
    case "review":
      return validateReviewStep(draft);
  }
}

export function validateDraft(draft: SubmissionDraft, ctx: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  for (const step of STEPS) Object.assign(errors, validateStep(step.id, draft, ctx));
  return errors;
}

function required<T extends string>(value: T | "", field: string): T {
  if (value === "") throw new Error(`buildSubmission: "${field}" is empty; validate the draft first`);
  return value;
}

/** Clean, typed submission from a draft that has passed validation. */
function buildSubmission(d: SubmissionDraft): EventSubmission {
  const phone = cleanLine(d.organiser.phone);
  const venue: VenueSubmission =
    d.venue.mode === "store"
      ? { mode: "store", storeSlug: d.venue.storeSlug.trim() }
      : buildNewVenue(d.venue);
  const weekly = d.schedule.recurrence === "weekly";
  const method = required(d.registration.method, "registration.method");
  const opensDate = d.registration.opensDate.trim();
  return {
    organiser: {
      name: cleanLine(d.organiser.name),
      email: d.organiser.email.trim().toLowerCase(),
      role: required(d.organiser.role, "organiser.role"),
      ...(phone ? { phone } : {}),
    },
    venue,
    event: {
      title: cleanLine(d.event.title),
      type: required(d.event.type, "event.type"),
      format: required(d.event.format, "event.format"),
      description: cleanMultiline(d.event.description),
      tags: [...d.event.tags],
    },
    schedule: {
      date: d.schedule.date,
      startTime: d.schedule.startTime,
      endTime: d.schedule.endTime,
      ...(d.schedule.multiDay ? { endDate: d.schedule.endDate } : {}),
      timeZone: d.schedule.timeZone,
      recurrence: weekly ? "weekly" : "none",
      ...(weekly ? { repeatUntil: d.schedule.repeatUntil } : {}),
    },
    capacity: d.capacity.uncapped ? { uncapped: true } : { uncapped: false, max: Number(d.capacity.max.trim()) },
    fee: { amount: Number(d.fee.amount.trim()), currency: required(d.fee.currency, "fee.currency") },
    registration: {
      method,
      ...(method === "external" ? { url: d.registration.url.trim() } : {}),
      ...(opensDate ? { opensDate } : {}),
    },
    prizes: d.prizes.map(cleanLine).filter((p) => p !== ""),
    participantListPublic: d.participantListPublic,
    agreeToGuidelines: d.agreeToGuidelines,
  };
}

function buildNewVenue(v: SubmissionDraft["venue"]): NewVenueSubmission {
  const line2 = cleanLine(v.line2);
  const region = cleanLine(v.region);
  const postalCode = cleanLine(v.postalCode).toUpperCase();
  const lat = parseCoordinate(v.lat);
  const lng = parseCoordinate(v.lng);
  return {
    mode: "new",
    name: cleanLine(v.name),
    line1: cleanLine(v.line1),
    ...(line2 ? { line2 } : {}),
    city: cleanLine(v.city),
    ...(region ? { region } : {}),
    ...(postalCode ? { postalCode } : {}),
    country: v.country.toUpperCase(),
    ...(typeof lat === "number" && typeof lng === "number" ? { lat, lng } : {}),
  };
}

/**
 * Validate untrusted input (a draft, or JSON posted to the API) as a complete
 * submission. Returns the cleaned submission or every field error at once.
 */
export function validateSubmission(input: unknown, ctx: ValidationContext): SubmissionValidation {
  const draft = coerceDraft(input);
  const errors = validateDraft(draft, ctx);
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: buildSubmission(draft) };
}

/** The submission the review step previews: steps 1–4 must be valid; the guidelines tick is not required yet. */
export function previewSubmission(draft: SubmissionDraft, ctx: ValidationContext): EventSubmission | null {
  const errors = STEPS.filter((s) => s.id !== "review").some(
    (s) => Object.keys(validateStep(s.id, draft, ctx)).length > 0,
  );
  return errors ? null : buildSubmission(draft);
}

/* -------------------------------------------------------------------------- */
/* Seed conversion                                                            */
/* -------------------------------------------------------------------------- */

function slugify(value: string, maxLength = 60): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > maxLength / 2 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, "");
}

/**
 * Proposed seed id: the store slug (or the new venue's city) and the title slug —
 * the event type when the title has no Latin characters — plus the date for one-off
 * events. Weekly series omit the date because the importer appends "-YYYY-MM-DD" to
 * every occurrence. The scope keeps two stores' "Friday Night Naruto" apart.
 */
export function suggestSeedId(submission: EventSubmission): string {
  const { event, venue, schedule } = submission;
  const base = slugify(event.title) || event.type;
  const scope = slugify(venue.mode === "store" ? venue.storeSlug : venue.city, 30);
  const scoped = base === scope || base.startsWith(`${scope}-`);
  const stem = scope && !scoped ? `${scope}-${base}` : base;
  return schedule.recurrence === "weekly" ? stem : `${stem}-${schedule.date}`;
}

const ORGANIZER_KIND: Record<OrganiserRole, OrganizerKind> = {
  "store-owner": "store",
  "tournament-organizer": "community",
  "community-leader": "community",
};

/**
 * True when the organiser's email and phone are published as the event's contact:
 * everyone except store staff listing at their own directory store.
 */
export function organiserContactIsPublic(submission: Pick<EventSubmission, "organiser" | "venue">): boolean {
  return !(submission.organiser.role === "store-owner" && submission.venue.mode === "store");
}

/**
 * The `data/events.json` record this submission becomes once approved.
 *
 * - Store staff listing at their own directory store get the default organiser
 *   (the store); everyone else is listed as an unverified organiser with the
 *   contact details they gave.
 * - Store venues omit `timeZone`, so the importer uses the store's own zone.
 * - A public player list is represented by an empty `participants` roster.
 * - `registeredCount` starts at 0; the registration window opens at local midnight.
 */
export function toEventSeed(submission: EventSubmission, id: string): SubmissionSeed {
  const { organiser, venue, event, schedule, capacity, fee, registration } = submission;
  const organizer: Organizer | undefined = organiserContactIsPublic(submission)
    ? {
        name: organiser.name,
        kind: ORGANIZER_KIND[organiser.role],
        verified: false,
        email: organiser.email,
        ...(organiser.phone ? { phone: organiser.phone } : {}),
      }
    : undefined;

  return {
    id,
    title: event.title,
    type: event.type,
    format: event.format,
    status: "scheduled",
    description: event.description,
    ...(venue.mode === "store"
      ? { storeSlug: venue.storeSlug }
      : {
          venue: {
            name: venue.name,
            address: {
              line1: venue.line1,
              ...(venue.line2 ? { line2: venue.line2 } : {}),
              city: venue.city,
              ...(venue.region ? { region: venue.region } : {}),
              ...(venue.postalCode ? { postalCode: venue.postalCode } : {}),
              country: venue.country,
            },
            ...(venue.lat !== undefined && venue.lng !== undefined ? { location: { lat: venue.lat, lng: venue.lng } } : {}),
          },
        }),
    start: `${schedule.date}T${schedule.startTime}`,
    end: `${schedule.endDate ?? schedule.date}T${schedule.endTime}`,
    // A store venue is at the store: let the importer use the store's own zone.
    ...(venue.mode === "store" ? {} : { timeZone: schedule.timeZone }),
    entryFee: { amount: fee.amount, currency: fee.currency },
    capacity: capacity.uncapped ? null : (capacity.max ?? null),
    registeredCount: 0,
    registration: {
      method: registration.method,
      ...(registration.url ? { url: registration.url } : {}),
      ...(registration.opensDate ? { opens: `${registration.opensDate}T00:00` } : {}),
    },
    ...(organizer ? { organizer } : {}),
    ...(submission.participantListPublic ? { participants: [] } : {}),
    prizes: submission.prizes,
    tags: event.tags,
    ...(schedule.recurrence === "weekly" && schedule.repeatUntil
      ? { recurrence: { frequency: "weekly" as const, until: schedule.repeatUntil } }
      : {}),
  };
}

/** True when the seed can be imported as-is (a new venue has coordinates). */
export function isImportReady(seed: SubmissionSeed): seed is EventSeed {
  return !seed.venue || seed.venue.location !== undefined;
}
