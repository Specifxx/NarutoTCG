import type { EventLocation, EventTier } from "@naruto-tcg/types";
import { formatForDate } from "@/lib/data/cards";
import { isIsoDate } from "@/lib/ingest/text";
import type { EventMetaInput } from "@/lib/ingest/types";

/** Top cut sizes offered in the form; "" (infer from the pairings) is offered separately. */
export const TOP_CUT_OPTIONS = [0, 4, 8, 16, 32] as const;

/** Upper bound for the Swiss rounds field; real events top out well below it. */
export const MAX_SWISS_ROUNDS = 30;

/** The event details form, as the inputs hold it (strings, so blanks mean "not set"). */
export interface EventForm {
  name: string;
  /** YYYY-MM-DD of the final day. */
  date: string;
  tier: EventTier;
  format: string;
  /** True while the format follows the date; typing a format turns it off. */
  formatAuto: boolean;
  online: boolean;
  venue: string;
  city: string;
  region: string;
  country: string;
  organizer: string;
  /** Whole number, or "" to infer from the pairings. */
  swissRounds: string;
  /** "0", "4", "8"…, or "" to infer from the pairings. */
  topCutSize: string;
  bestOf: "1" | "3";
  notes: string;
}

/** Form fields that can carry a validation error. */
export type EventFormErrorKey = "name" | "date" | "location" | "swissRounds";
export type EventFormErrors = Partial<Record<EventFormErrorKey, string>>;

export const EMPTY_EVENT_FORM: EventForm = {
  name: "",
  date: "",
  tier: "store-championship",
  format: "",
  formatAuto: true,
  online: false,
  venue: "",
  city: "",
  region: "",
  country: "",
  organizer: "",
  swissRounds: "",
  topCutSize: "",
  bestOf: "3",
  notes: "",
};

/** Labels for the event fields, as the overrides summary and error summary name them. */
export const EVENT_FIELD_LABELS: Record<keyof EventMetaInput, string> = {
  name: "event name",
  date: "date",
  tier: "tier",
  format: "format",
  location: "location",
  organizer: "organizer",
  swissRounds: "Swiss rounds",
  topCutSize: "top cut",
  bestOf: "best-of",
  notes: "notes",
};

const META_KEYS = Object.keys(EVENT_FIELD_LABELS) as Array<keyof EventMetaInput>;

/** The format legal on `date`, or "" while the date is incomplete. */
export function autoFormat(date: string): string {
  return isIsoDate(date) ? formatForDate(date) : "";
}

/**
 * Applies an edit. The format follows the date until the user types one; passing
 * `formatAuto: true` returns it to the date's default.
 */
export function updateEventForm(form: EventForm, patch: Partial<EventForm>): EventForm {
  const next = { ...form, ...patch };
  if (patch.format !== undefined && patch.formatAuto === undefined) next.formatAuto = false;
  if (next.formatAuto) next.format = autoFormat(next.date);
  return next;
}

/** Overlays the defined fields of `meta` (e.g. from an uploaded file) onto `base`. */
export function formFromMeta(meta: Partial<EventMetaInput>, base: EventForm = EMPTY_EVENT_FORM): EventForm {
  const form = { ...base };
  if (meta.name !== undefined) form.name = meta.name;
  if (meta.date !== undefined) form.date = meta.date;
  if (meta.tier !== undefined) form.tier = meta.tier;
  if (meta.location !== undefined) {
    form.online = Boolean(meta.location.online);
    form.venue = meta.location.venue ?? "";
    form.city = meta.location.city ?? "";
    form.region = meta.location.region ?? "";
    form.country = meta.location.country ?? "";
  }
  if (meta.organizer !== undefined) form.organizer = meta.organizer;
  if (meta.swissRounds !== undefined) form.swissRounds = String(meta.swissRounds);
  if (meta.topCutSize !== undefined) form.topCutSize = String(meta.topCutSize);
  if (meta.bestOf !== undefined) form.bestOf = meta.bestOf === 1 ? "1" : "3";
  if (meta.notes !== undefined) form.notes = meta.notes;
  if (meta.format?.trim()) {
    form.format = meta.format.trim();
    form.formatAuto = false;
  } else if (form.formatAuto) {
    form.format = autoFormat(form.date);
  }
  return form;
}

function locationOf(form: EventForm): EventLocation {
  if (form.online) return { online: true };
  const location: EventLocation = {};
  if (form.city.trim()) location.city = form.city.trim();
  if (form.region.trim()) location.region = form.region.trim();
  if (form.country.trim()) location.country = form.country.trim();
  if (form.venue.trim()) location.venue = form.venue.trim();
  return location;
}

const wholeNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : undefined);

/** The pipeline's event details for a form; blank optional fields are left out. */
export function formToMeta(form: EventForm): EventMetaInput {
  const meta: EventMetaInput = {
    name: form.name.trim(),
    date: form.date.trim(),
    tier: form.tier,
    location: locationOf(form),
    organizer: form.organizer.trim(),
    bestOf: form.bestOf === "1" ? 1 : 3,
  };
  if (form.format.trim()) meta.format = form.format.trim();
  const swissRounds = wholeNumber(form.swissRounds);
  if (swissRounds !== undefined) meta.swissRounds = swissRounds;
  const topCutSize = wholeNumber(form.topCutSize);
  if (topCutSize !== undefined) meta.topCutSize = topCutSize;
  if (form.notes.trim()) meta.notes = form.notes.trim();
  return meta;
}

/** Inline errors for the required and numeric fields; empty when the form can be submitted. */
export function validateEventForm(form: EventForm): EventFormErrors {
  const errors: EventFormErrors = {};
  if (!form.name.trim()) errors.name = "Enter the event name.";
  if (!form.date.trim()) errors.date = "Enter the date of the final day.";
  else if (!isIsoDate(form.date.trim())) errors.date = "Enter a real date as YYYY-MM-DD.";
  const hasPlace = [form.venue, form.city, form.region, form.country].some((part) => part.trim());
  if (!form.online && !hasPlace) errors.location = "Tick Online, or enter at least a city or country.";
  const rounds = form.swissRounds.trim();
  if (rounds && (wholeNumber(rounds) === undefined || wholeNumber(rounds)! > MAX_SWISS_ROUNDS)) {
    errors.swissRounds = `Enter a whole number from 0 to ${MAX_SWISS_ROUNDS}, or leave it blank to infer it from the pairings.`;
  }
  return errors;
}

/**
 * Event fields of `form` that differ from `base` (a JSON file's own details), as the
 * pipeline's `metaOverrides`. A blank optional field keeps the file's value, except notes,
 * which can be cleared.
 */
export function metaOverrides(base: EventForm, form: EventForm): Partial<EventMetaInput> {
  const before = formToMeta(base);
  const after = formToMeta(form);
  const overrides: Partial<EventMetaInput> = {};
  for (const key of META_KEYS) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    if (after[key] !== undefined) Object.assign(overrides, { [key]: after[key] });
    else if (key === "notes") overrides.notes = "";
  }
  return overrides;
}
