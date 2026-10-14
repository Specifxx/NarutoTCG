import type { EventStatus, TcgEvent } from "@naruto-tcg/types";

/**
 * Event registration: the request/response contract shared by
 * `POST /api/events/[id]/register` and the event page's RegisterPanel, the rules
 * for when sign-up is open, payload validation, and a server-side store.
 *
 * The module is deliberately isomorphic (no "server-only"): the panel imports the
 * same window rules, limits and validator the API enforces, so the button state and
 * inline errors can never disagree with what the server accepts. Only the API route
 * may call the store functions (`registerForEvent`, `liveRegisteredCount`).
 *
 * STORAGE CAVEAT — the store is an in-memory Map:
 *   - it resets whenever the server process restarts or redeploys;
 *   - every instance (serverless function, container replica) has its own copy, so
 *     counts and duplicate checks are per instance.
 * Replace `store()` with a database table (unique index on event id + normalised
 * email, row lock or atomic counter for capacity) before taking real sign-ups.
 */

export const DISPLAY_NAME_LENGTH = { min: 2, max: 32 } as const;
export const EMAIL_MAX_LENGTH = 254;

/** Countries offered in the registration form; anyone else picks "Prefer not to say". */
export const REGISTRATION_COUNTRIES = [
  "US", "CA", "MX", "BR", "GB", "IE", "FR", "DE", "ES", "PT", "IT", "NL", "BE", "LU", "CH", "AT", "DK",
  "SE", "NO", "FI", "IS", "PL", "CZ", "HU", "RO", "GR", "AU", "NZ", "JP", "KR", "TW", "HK", "SG", "MY",
  "PH", "TH", "ID", "VN", "IN",
] as const;

export type RegistrationStatus = "registered" | "waitlisted";

export interface RegistrationRequest {
  displayName: string;
  email: string;
  /** ISO 3166-1 alpha-2 code from REGISTRATION_COUNTRIES; omitted when not shared. */
  country?: string;
  acceptCodeOfConduct: boolean;
  /**
   * True when the player chose "Join waitlist". Informational only: the server
   * decides registered vs waitlisted from live capacity at the moment of the request.
   */
  waitlist?: boolean;
}

export interface RegistrationResponse {
  status: RegistrationStatus;
  /** "NTCG-" followed by 6 unambiguous uppercase letters/digits. */
  confirmationCode: string;
  /** Confirmed (non-waitlist) players after this request. */
  registeredCount: number;
  /** 1-based place in the queue when `status` is "waitlisted". */
  waitlistPosition?: number;
}

export type RegistrationField = "displayName" | "email" | "country" | "acceptCodeOfConduct";
export type RegistrationFieldErrors = Partial<Record<RegistrationField, string>>;

export type RegistrationPhase = "open" | "cancelled" | "ended" | "not-open" | "closed";

export type RegistrationErrorCode =
  | Exclude<RegistrationPhase, "open">
  | "not-found"
  | "not-online"
  | "duplicate"
  | "full"
  | "invalid"
  | "rate-limited"
  | "bad-request";

export interface RegistrationErrorResponse {
  error: string;
  code: RegistrationErrorCode;
  fieldErrors?: RegistrationFieldErrors;
}

/* -------------------------------------------------------------------------- */
/* Registration window                                                        */
/* -------------------------------------------------------------------------- */

export interface RegistrationSchedule {
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  /** Absent = already open. */
  opensAt?: string;
  /** Absent = closes when the event starts. */
  closesAt?: string;
}

/** Where an event's sign-up stands at `now`. Checked in priority order. */
export function registrationPhase(schedule: RegistrationSchedule, now: Date): RegistrationPhase {
  const t = now.getTime();
  if (schedule.status === "cancelled") return "cancelled";
  if (t >= Date.parse(schedule.endsAt)) return "ended";
  if (schedule.opensAt && t < Date.parse(schedule.opensAt)) return "not-open";
  if (t >= Date.parse(schedule.closesAt ?? schedule.startsAt)) return "closed";
  return "open";
}

export const PHASE_ERROR_MESSAGE: Record<Exclude<RegistrationPhase, "open">, string> = {
  cancelled: "This event has been cancelled, so registration is closed.",
  ended: "This event has already ended.",
  "not-open": "Registration for this event hasn't opened yet.",
  closed: "Registration for this event has closed.",
};

export function isFull(capacity: number | null, registeredCount: number): boolean {
  return capacity !== null && registeredCount >= capacity;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const DISPLAY_NAME_CHARS = /^[\p{L}\p{M}\p{N} ._'’-]+$/u;
// Deliberately permissive (one "@", a dot in the domain, no spaces); deliverability is the mailer's job.
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const COUNTRY_SET: ReadonlySet<string> = new Set(REGISTRATION_COUNTRIES);

export type RegistrationValidation =
  | { ok: true; value: RegistrationRequest }
  | { ok: false; fieldErrors: RegistrationFieldErrors };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Trim and collapse runs of whitespace so "  Kage   Kid " and "Kage Kid" are the same name. */
export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Validate an untrusted registration payload (JSON body or form state).
 * Returns the cleaned request, or one message per invalid field.
 */
export function validateRegistrationRequest(input: unknown): RegistrationValidation {
  const body = isRecord(input) ? input : {};
  const fieldErrors: RegistrationFieldErrors = {};

  const displayName = typeof body.displayName === "string" ? normalizeDisplayName(body.displayName) : "";
  const nameLength = [...displayName].length;
  if (nameLength === 0) {
    fieldErrors.displayName = "Enter the name you'll play under.";
  } else if (nameLength < DISPLAY_NAME_LENGTH.min || nameLength > DISPLAY_NAME_LENGTH.max) {
    fieldErrors.displayName = `Use ${DISPLAY_NAME_LENGTH.min}–${DISPLAY_NAME_LENGTH.max} characters.`;
  } else if (!DISPLAY_NAME_CHARS.test(displayName)) {
    fieldErrors.displayName = "Use letters, numbers, spaces and . _ - ' only.";
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (email.length === 0) {
    fieldErrors.email = "Enter your email address.";
  } else if (email.length > EMAIL_MAX_LENGTH || !EMAIL.test(email)) {
    fieldErrors.email = "Enter a valid email address, like name@example.com.";
  }

  let country: string | undefined;
  if (body.country !== undefined && body.country !== null && body.country !== "") {
    const code = typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
    if (COUNTRY_SET.has(code)) country = code;
    else fieldErrors.country = "Choose a country from the list, or leave it blank.";
  }

  if (body.acceptCodeOfConduct !== true) {
    fieldErrors.acceptCodeOfConduct = "You need to accept the code of conduct to register.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: {
      displayName,
      email,
      ...(country ? { country } : {}),
      acceptCodeOfConduct: true,
      ...(body.waitlist === true ? { waitlist: true } : {}),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Confirmation codes                                                         */
/* -------------------------------------------------------------------------- */

// 32 symbols without 0/O/1/I; 256 is a multiple of 32, so `byte % 32` has no modulo bias.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateConfirmationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `NTCG-${Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")}`;
}

/* -------------------------------------------------------------------------- */
/* In-memory store (server only — see the caveat at the top of this file)     */
/* -------------------------------------------------------------------------- */

interface StoredRegistration {
  email: string;
  displayName: string;
  country?: string;
  status: RegistrationStatus;
  confirmationCode: string;
  requestedWaitlist: boolean;
  createdAt: string;
}

/** Hard ceiling per event so an unauthenticated endpoint can't grow memory without bound. */
const MAX_RECORDS_PER_EVENT = 5_000;

const STORE_KEY = Symbol.for("naruto-tcg.events.registrations");

/**
 * Lazily created and pinned to `globalThis` so it survives dev hot reloads and is
 * never allocated in a browser bundle that only imports the shared helpers.
 */
function store(): Map<string, StoredRegistration[]> {
  const scope = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, StoredRegistration[]> };
  scope[STORE_KEY] ??= new Map();
  return scope[STORE_KEY];
}

type CountableEvent = Pick<TcgEvent, "id" | "registeredCount">;

/** Seed count plus confirmed in-memory registrations on this instance. */
export function liveRegisteredCount(event: CountableEvent): number {
  const records = store().get(event.id) ?? [];
  return event.registeredCount + records.filter((r) => r.status === "registered").length;
}

export type RegisterOutcome =
  | { ok: true; response: RegistrationResponse }
  | { ok: false; code: "duplicate" | "full" };

/**
 * Record a validated registration. Synchronous check-then-insert, so requests on
 * one instance cannot race past capacity or the duplicate check.
 */
export function registerForEvent(
  event: Pick<TcgEvent, "id" | "registeredCount" | "capacity">,
  request: RegistrationRequest,
  now = new Date(),
): RegisterOutcome {
  const records = store().get(event.id) ?? [];
  const email = normalizeEmail(request.email);
  if (records.some((r) => r.email === email)) return { ok: false, code: "duplicate" };
  if (records.length >= MAX_RECORDS_PER_EVENT) return { ok: false, code: "full" };

  const registeredBefore = liveRegisteredCount(event);
  const status: RegistrationStatus = isFull(event.capacity, registeredBefore) ? "waitlisted" : "registered";
  const record: StoredRegistration = {
    email,
    displayName: request.displayName,
    ...(request.country ? { country: request.country } : {}),
    status,
    confirmationCode: generateConfirmationCode(),
    requestedWaitlist: request.waitlist === true,
    createdAt: now.toISOString(),
  };
  store().set(event.id, [...records, record]);

  const waitlistPosition =
    status === "waitlisted" ? records.filter((r) => r.status === "waitlisted").length + 1 : undefined;
  return {
    ok: true,
    response: {
      status,
      confirmationCode: record.confirmationCode,
      registeredCount: status === "registered" ? registeredBefore + 1 : registeredBefore,
      ...(waitlistPosition ? { waitlistPosition } : {}),
    },
  };
}
