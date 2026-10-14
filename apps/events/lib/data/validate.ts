import type { CurrencyCode, StoreFeature, Weekday } from "@naruto-tcg/types";
import { isEventFormat, isEventType, isStoreFeature } from "../event-meta";
import { isLocalDate, isLocalDateTime, isValidTimeZone } from "../time";
import type { EventSeed, MilestoneSeed, PlaceSeed, StoreSeed } from "./schema";

/**
 * Runtime validation for seed / imported JSON. Every problem is collected and
 * reported at once so a bad import fails the build with an actionable list.
 */

export class SeedValidationError extends Error {
  constructor(
    public readonly file: string,
    public readonly issues: string[],
  ) {
    super(`Invalid ${file} (${issues.length} issue${issues.length === 1 ? "" : "s"}):\n  - ${issues.join("\n  - ")}`);
    this.name = "SeedValidationError";
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const CURRENCIES: readonly CurrencyCode[] = ["USD", "CAD", "EUR", "GBP", "AUD", "NZD", "SEK", "NOK", "DKK", "PLN", "CHF", "JPY"];
const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const STATUSES = ["scheduled", "postponed", "cancelled"];
const METHODS = ["online", "in-store", "external"];
const ORGANIZER_KINDS = ["official", "store", "community"];
const MILESTONE_KINDS = ["convention", "set-release", "prerelease", "championship", "announcement"];

type Issues = string[];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptStr = (v: unknown) => v === undefined || isStr(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isUrl = (v: unknown) => {
  if (!isStr(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};
const isCountry = (v: unknown) => typeof v === "string" && /^[A-Z]{2}$/.test(v);

function checkAddress(v: unknown, at: string, issues: Issues) {
  if (!isObj(v)) return issues.push(`${at}: address must be an object`);
  if (!isStr(v.line1)) issues.push(`${at}.line1 is required`);
  if (!isOptStr(v.line2)) issues.push(`${at}.line2 must be a non-empty string when present`);
  if (!isStr(v.city)) issues.push(`${at}.city is required`);
  if (!isOptStr(v.region)) issues.push(`${at}.region must be a non-empty string when present`);
  if (!isOptStr(v.postalCode)) issues.push(`${at}.postalCode must be a non-empty string when present`);
  if (!isCountry(v.country)) issues.push(`${at}.country must be an ISO 3166-1 alpha-2 code like "US"`);
}

function checkPoint(v: unknown, at: string, issues: Issues) {
  if (!isObj(v) || !isNum(v.lat) || !isNum(v.lng) || Math.abs(v.lat) > 90 || Math.abs(v.lng) > 180) {
    issues.push(`${at} must be { lat: -90..90, lng: -180..180 }`);
  }
}

function checkUnique(values: string[], label: string, issues: Issues) {
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) issues.push(`duplicate ${label} "${v}"`);
    seen.add(v);
  }
}

export function validateStores(input: unknown): StoreSeed[] {
  const issues: Issues = [];
  if (!Array.isArray(input)) throw new SeedValidationError("stores.json", ["root must be an array"]);
  input.forEach((s: unknown, i) => {
    const at = `stores[${i}]${isObj(s) && isStr(s.slug) ? ` (${s.slug})` : ""}`;
    if (!isObj(s)) return issues.push(`${at} must be an object`);
    if (!isStr(s.slug) || !SLUG.test(s.slug)) issues.push(`${at}.slug must be lowercase-hyphenated`);
    if (!isStr(s.name)) issues.push(`${at}.name is required`);
    if (!isOptStr(s.tagline)) issues.push(`${at}.tagline must be a non-empty string when present`);
    if (!isStr(s.description)) issues.push(`${at}.description is required`);
    if (typeof s.verified !== "boolean") issues.push(`${at}.verified must be boolean`);
    if (s.verifiedSince !== undefined && !(typeof s.verifiedSince === "string" && isLocalDate(s.verifiedSince)))
      issues.push(`${at}.verifiedSince must be YYYY-MM-DD`);
    checkAddress(s.address, `${at}.address`, issues);
    checkPoint(s.location, `${at}.location`, issues);
    if (!isStr(s.timeZone) || !isValidTimeZone(s.timeZone)) issues.push(`${at}.timeZone must be a valid IANA zone`);
    if (!isObj(s.contact)) issues.push(`${at}.contact must be an object`);
    else {
      if (!isOptStr(s.contact.phone)) issues.push(`${at}.contact.phone must be a string`);
      if (s.contact.email !== undefined && !(isStr(s.contact.email) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.contact.email)))
        issues.push(`${at}.contact.email is not a valid email`);
      if (s.contact.website !== undefined && !isUrl(s.contact.website)) issues.push(`${at}.contact.website must be a URL`);
    }
    if (!isObj(s.social)) issues.push(`${at}.social must be an object (use {} for none)`);
    else
      for (const [k, url] of Object.entries(s.social)) {
        if (!["instagram", "x", "facebook", "discord", "youtube", "tiktok", "twitch"].includes(k))
          issues.push(`${at}.social.${k} is not a supported network`);
        if (!isUrl(url)) issues.push(`${at}.social.${k} must be a URL`);
      }
    if (!isObj(s.hours)) issues.push(`${at}.hours must be an object keyed by weekday`);
    else
      for (const day of WEEKDAYS) {
        const windows = s.hours[day];
        if (!Array.isArray(windows)) {
          issues.push(`${at}.hours.${day} must be an array (empty = closed)`);
          continue;
        }
        windows.forEach((w: unknown, wi) => {
          if (!Array.isArray(w) || w.length !== 2 || !HHMM.test(String(w[0])) || !HHMM.test(String(w[1])) || w[0] >= w[1])
            issues.push(`${at}.hours.${day}[${wi}] must be ["HH:mm", "HH:mm"] with open < close`);
        });
      }
    if (!Array.isArray(s.features) || !s.features.every((f) => isStoreFeature(f)))
      issues.push(`${at}.features contains an unknown feature`);
    else checkUnique(s.features as StoreFeature[], `${at} feature`, issues);
    if (s.tableCount !== undefined && !(isNum(s.tableCount) && s.tableCount >= 0)) issues.push(`${at}.tableCount must be >= 0`);
    if (!Array.isArray(s.languages) || !s.languages.every(isStr)) issues.push(`${at}.languages must be an array of tags`);
    if (s.source !== undefined && !(isObj(s.source) && isUrl(s.source.url) && isStr(s.source.retrievedAt)))
      issues.push(`${at}.source must be { url, retrievedAt }`);
  });
  checkUnique(
    input.filter(isObj).map((s) => String(s.slug)),
    "store slug",
    issues,
  );
  if (issues.length) throw new SeedValidationError("stores.json", issues);
  return input as StoreSeed[];
}

export function validateEvents(input: unknown, stores: StoreSeed[]): EventSeed[] {
  const issues: Issues = [];
  if (!Array.isArray(input)) throw new SeedValidationError("events.json", ["root must be an array"]);
  const storeSlugs = new Set(stores.map((s) => s.slug));
  input.forEach((e: unknown, i) => {
    const at = `events[${i}]${isObj(e) && isStr(e.id) ? ` (${e.id})` : ""}`;
    if (!isObj(e)) return issues.push(`${at} must be an object`);
    if (!isStr(e.id) || !SLUG.test(e.id)) issues.push(`${at}.id must be lowercase-hyphenated`);
    if (!isStr(e.title)) issues.push(`${at}.title is required`);
    if (!isEventType(e.type)) issues.push(`${at}.type "${String(e.type)}" is not a known event type`);
    if (!isEventFormat(e.format)) issues.push(`${at}.format "${String(e.format)}" is not a known format`);
    if (e.status !== undefined && !STATUSES.includes(String(e.status))) issues.push(`${at}.status is invalid`);
    if (!isStr(e.description)) issues.push(`${at}.description is required`);

    const hasStore = e.storeSlug !== undefined;
    const hasVenue = e.venue !== undefined;
    if (hasStore === hasVenue) issues.push(`${at} needs exactly one of storeSlug or venue`);
    if (hasStore && !(isStr(e.storeSlug) && storeSlugs.has(e.storeSlug)))
      issues.push(`${at}.storeSlug "${String(e.storeSlug)}" does not match a store`);
    if (hasVenue) {
      if (!isObj(e.venue)) issues.push(`${at}.venue must be an object`);
      else {
        if (!isStr(e.venue.name)) issues.push(`${at}.venue.name is required`);
        if (!isOptStr(e.venue.hall)) issues.push(`${at}.venue.hall must be a non-empty string when present`);
        checkAddress(e.venue.address, `${at}.venue.address`, issues);
        checkPoint(e.venue.location, `${at}.venue.location`, issues);
      }
      if (!isStr(e.timeZone)) issues.push(`${at}.timeZone is required for non-store venues`);
    }
    if (e.timeZone !== undefined && !(isStr(e.timeZone) && isValidTimeZone(e.timeZone)))
      issues.push(`${at}.timeZone must be a valid IANA zone`);

    const startOk = typeof e.start === "string" && isLocalDateTime(e.start);
    const endOk = typeof e.end === "string" && isLocalDateTime(e.end);
    if (!startOk) issues.push(`${at}.start must be local "YYYY-MM-DDTHH:mm"`);
    if (!endOk) issues.push(`${at}.end must be local "YYYY-MM-DDTHH:mm"`);
    if (startOk && endOk && String(e.end) <= String(e.start)) issues.push(`${at}.end must be after start`);

    if (!isObj(e.entryFee) || !isNum(e.entryFee.amount) || e.entryFee.amount < 0)
      issues.push(`${at}.entryFee.amount must be a number >= 0`);
    if (!isObj(e.entryFee) || !CURRENCIES.includes(e.entryFee.currency as CurrencyCode))
      issues.push(`${at}.entryFee.currency must be one of ${CURRENCIES.join(", ")}`);
    if (!(e.capacity === null || (isNum(e.capacity) && Number.isInteger(e.capacity) && e.capacity > 0)))
      issues.push(`${at}.capacity must be a positive integer or null`);
    if (!(isNum(e.registeredCount) && Number.isInteger(e.registeredCount) && e.registeredCount >= 0))
      issues.push(`${at}.registeredCount must be a non-negative integer`);
    else if (isNum(e.capacity) && e.registeredCount > e.capacity)
      issues.push(`${at}.registeredCount (${e.registeredCount}) exceeds capacity (${e.capacity})`);

    if (!isObj(e.registration) || !METHODS.includes(String(e.registration.method)))
      issues.push(`${at}.registration.method must be online, in-store or external`);
    else {
      if (e.registration.method === "external" && !isUrl(e.registration.url))
        issues.push(`${at}.registration.url is required for external registration`);
      if (e.registration.url !== undefined && !isUrl(e.registration.url)) issues.push(`${at}.registration.url must be a URL`);
      for (const k of ["opens", "closes"] as const) {
        const v = e.registration[k];
        if (v !== undefined && !(typeof v === "string" && isLocalDateTime(v)))
          issues.push(`${at}.registration.${k} must be local "YYYY-MM-DDTHH:mm"`);
      }
    }

    if (e.organizer !== undefined) {
      const o = e.organizer;
      if (!isObj(o) || !isStr(o.name) || !ORGANIZER_KINDS.includes(String(o.kind)) || typeof o.verified !== "boolean")
        issues.push(`${at}.organizer needs name, kind (official|store|community) and verified`);
      else if (o.website !== undefined && !isUrl(o.website)) issues.push(`${at}.organizer.website must be a URL`);
    } else if (!hasStore) issues.push(`${at}.organizer is required when the event is not hosted by a store`);

    if (e.participants !== undefined) {
      if (!Array.isArray(e.participants)) issues.push(`${at}.participants must be an array`);
      else {
        e.participants.forEach((p: unknown, pi) => {
          if (!isObj(p) || !isStr(p.displayName)) issues.push(`${at}.participants[${pi}].displayName is required`);
          else if (p.country !== undefined && !isCountry(p.country))
            issues.push(`${at}.participants[${pi}].country must be ISO alpha-2`);
        });
        if (isNum(e.registeredCount) && e.participants.length > e.registeredCount)
          issues.push(`${at}.participants (${e.participants.length}) exceeds registeredCount`);
      }
    }
    for (const k of ["prizes", "tags"] as const) {
      if (e[k] !== undefined && !(Array.isArray(e[k]) && (e[k] as unknown[]).every(isStr)))
        issues.push(`${at}.${k} must be an array of strings`);
    }
    if (e.recurrence !== undefined) {
      const r = e.recurrence;
      if (!isObj(r) || r.frequency !== "weekly" || typeof r.until !== "string" || !isLocalDate(r.until))
        issues.push(`${at}.recurrence must be { frequency: "weekly", until: "YYYY-MM-DD" }`);
      else {
        if (startOk && r.until < String(e.start).slice(0, 10)) issues.push(`${at}.recurrence.until is before start`);
        if (r.except !== undefined && !(Array.isArray(r.except) && r.except.every((d) => typeof d === "string" && isLocalDate(d))))
          issues.push(`${at}.recurrence.except must be YYYY-MM-DD dates`);
      }
    }
    if (e.source !== undefined && !(isObj(e.source) && isUrl(e.source.url) && isStr(e.source.retrievedAt)))
      issues.push(`${at}.source must be { url, retrievedAt }`);
  });
  checkUnique(
    input.filter(isObj).map((e) => String(e.id)),
    "event id",
    issues,
  );
  if (issues.length) throw new SeedValidationError("events.json", issues);
  return input as EventSeed[];
}

export function validatePlaces(input: unknown): PlaceSeed[] {
  const issues: Issues = [];
  if (!Array.isArray(input)) throw new SeedValidationError("places.json", ["root must be an array"]);
  input.forEach((p: unknown, i) => {
    const at = `places[${i}]${isObj(p) && isStr(p.name) ? ` (${p.name})` : ""}`;
    if (!isObj(p)) return issues.push(`${at} must be an object`);
    if (!isStr(p.name)) issues.push(`${at}.name is required`);
    if (!isOptStr(p.admin)) issues.push(`${at}.admin must be a non-empty string when present`);
    if (!isCountry(p.country)) issues.push(`${at}.country must be ISO alpha-2`);
    checkPoint({ lat: p.lat, lng: p.lng }, at, issues);
    for (const k of ["aliases", "postalCodes"] as const) {
      if (p[k] !== undefined && !(Array.isArray(p[k]) && (p[k] as unknown[]).every(isStr)))
        issues.push(`${at}.${k} must be an array of strings`);
    }
  });
  if (issues.length) throw new SeedValidationError("places.json", issues);
  return input as PlaceSeed[];
}

export function validateMilestones(input: unknown, eventIds: Set<string>): MilestoneSeed[] {
  const issues: Issues = [];
  if (!Array.isArray(input)) throw new SeedValidationError("milestones.json", ["root must be an array"]);
  input.forEach((m: unknown, i) => {
    const at = `milestones[${i}]${isObj(m) && isStr(m.id) ? ` (${m.id})` : ""}`;
    if (!isObj(m)) return issues.push(`${at} must be an object`);
    if (!isStr(m.id) || !SLUG.test(m.id)) issues.push(`${at}.id must be lowercase-hyphenated`);
    if (!isStr(m.title)) issues.push(`${at}.title is required`);
    if (!isStr(m.subtitle)) issues.push(`${at}.subtitle is required`);
    if (!MILESTONE_KINDS.includes(String(m.kind))) issues.push(`${at}.kind is invalid`);
    if (!(typeof m.start === "string" && isLocalDateTime(m.start))) issues.push(`${at}.start must be local "YYYY-MM-DDTHH:mm"`);
    if (m.end !== undefined && !(typeof m.end === "string" && isLocalDateTime(m.end) && m.end > String(m.start)))
      issues.push(`${at}.end must be local "YYYY-MM-DDTHH:mm" after start`);
    if (!isStr(m.timeZone) || !isValidTimeZone(m.timeZone)) issues.push(`${at}.timeZone must be a valid IANA zone`);
    if (!(typeof m.announced === "string" && isLocalDate(m.announced))) issues.push(`${at}.announced must be YYYY-MM-DD`);
    if (m.eventId !== undefined && !(isStr(m.eventId) && eventIds.has(m.eventId)))
      issues.push(`${at}.eventId "${String(m.eventId)}" does not match an event`);
    if (m.href !== undefined && !(isStr(m.href) && (/^\/(?![/\\])/.test(m.href) || isUrl(m.href))))
      issues.push(`${at}.href must be a path or URL`);
  });
  checkUnique(
    input.filter(isObj).map((m) => String(m.id)),
    "milestone id",
    issues,
  );
  if (issues.length) throw new SeedValidationError("milestones.json", issues);
  return input as MilestoneSeed[];
}
