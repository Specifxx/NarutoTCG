import "server-only";

import type { EventStatus, EventType, TcgEvent } from "@naruto-tcg/types";
import { eventCalendarEntry } from "@/components/event-detail/calendar";
import { absoluteUrl, eventPath } from "@/components/event-detail/site-url";
import { getEvents, getMilestoneSeeds } from "./data";
import type { MilestoneKind, MilestoneSeed } from "./data/schema";
import { placeLabel } from "./format";
import type { CalendarEntry } from "./ics";
import { formatDate, formatDateSpan, formatTime, zoneAbbreviation, zonedLocalToUtc } from "./time";

/**
 * Countdown milestones: the curated list in `data/milestones.json` plus "next X"
 * milestones derived from the event listings. Everything here is serialisable and
 * pre-formatted in the milestone's own zone so client timers never format dates.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How far ahead of a derived milestone its progress bar starts, absent better data. */
const DERIVED_LEAD_TIME = 30 * DAY;

export interface Milestone {
  id: string;
  title: string;
  /** Compact label for badges, e.g. "BCGF Los Angeles". */
  shortTitle: string;
  subtitle: string;
  kind: MilestoneKind;
  /** Event type a derived milestone was computed from; badges prefer it over `kind`. */
  eventType?: EventType;
  /** Status of the linked event (only ever "scheduled" or "postponed"; cancelled ones are dropped). */
  eventStatus?: Exclude<EventStatus, "cancelled">;
  /** ISO UTC instants. */
  startsAt: string;
  endsAt: string;
  timeZone: string;
  /** Start of the announcement day in the milestone's zone; always before `startsAt`. */
  announcedAt: string;
  location?: string;
  /** Internal path ("/stores") or absolute URL for more information. */
  href?: string;
  eventId?: string;
  highlight: boolean;
  /** True when computed from event listings rather than curated in milestones.json. */
  derived: boolean;
  /** Shared by the .ics download and the Google Calendar link. */
  calendar: CalendarEntry;
  display: {
    /** "Sat, Nov 21, 2026" (start date, milestone-local). */
    date: string;
    /** Start date, or "Sat, Nov 21 – Sun, Nov 22, 2026" for multi-day milestones. */
    dateSpan: string;
    /** "10:00 AM" / "10:00". */
    time: string;
    /** "PST", "GMT", "AEDT" or "GMT+9". */
    zone: string;
    /** Announcement date, "Jun 15, 2026". */
    announced: string;
    /** Static screen-reader description, "Starts Sat, Nov 21, 2026 at 10:00 AM PST". */
    description: string;
  };
}

/** The subset of a milestone the client-side timers need. */
export type MilestoneTiming = Pick<Milestone, "startsAt" | "endsAt" | "announcedAt">;

export interface MilestoneLink {
  href: string;
  label: string;
  external: boolean;
}

/** Display locale by zone: 12-hour clocks for the Americas, AU/NZ conventions for Oceania, en-GB elsewhere. */
export function localeForZone(timeZone: string): string {
  if (timeZone.startsWith("America/")) return "en-US";
  if (timeZone.startsWith("Australia/") || timeZone.startsWith("Pacific/")) return "en-AU";
  return "en-GB";
}

const ABBREVIATIONS: readonly [RegExp, string][] = [
  [/Bandai Card Games Fest/g, "BCGF"],
  [/World Championship/g, "Worlds"],
  [/Regional Championship/g, "Regionals"],
  [/Store Championship/g, "Store Champs"],
];

function shortTitle(title: string): string {
  let short = title;
  for (const [pattern, replacement] of ABBREVIATIONS) short = short.replace(pattern, replacement);
  return short.replace(/\s+[—–]\s+/g, " ").trim();
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Primary destination for a milestone: its event page, else its `href`. */
export function milestoneLink(milestone: Pick<Milestone, "eventId" | "href">): MilestoneLink | undefined {
  if (milestone.eventId) return { href: eventPath(milestone.eventId), label: "Event details", external: false };
  return milestoneInfoLink(milestone.href);
}

/** Secondary "more info" link, shown when a milestone has both an event and an `href`. */
export function milestoneInfoLink(href: string | undefined): MilestoneLink | undefined {
  if (!href) return undefined;
  return isExternal(href)
    ? { href, label: "Official page", external: true }
    : { href, label: "Learn more", external: false };
}

/** Featured milestone: the soonest highlighted one, else the soonest overall. */
export function pickFeaturedMilestone(milestones: readonly Milestone[]): Milestone | undefined {
  return milestones.find((m) => m.highlight) ?? milestones[0];
}

function buildDisplay(startsAt: string, endsAt: string, announcedAt: string, timeZone: string): Milestone["display"] {
  const locale = localeForZone(timeZone);
  const date = formatDate(startsAt, timeZone, locale);
  // en-GB "numeric" hours render midnight as "0:00"; 24-hour clocks read better zero-padded.
  const time =
    locale === "en-GB"
      ? formatDate(startsAt, timeZone, locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      : formatTime(startsAt, timeZone, locale);
  const zone = zoneAbbreviation(startsAt, timeZone, locale);
  return {
    date,
    dateSpan: formatDateSpan(startsAt, endsAt, timeZone, locale),
    time,
    zone,
    announced: formatDate(announcedAt, timeZone, locale, { month: "short", day: "numeric", year: "numeric" }),
    description: `Starts ${date} at ${time} ${zone}`,
  };
}

function venueLabel(event: TcgEvent): string {
  return `${event.venue.name}, ${placeLabel(event.venue.address)}`;
}

function eventEntry(event: TcgEvent): CalendarEntry {
  return eventCalendarEntry(event, absoluteUrl(eventPath(event.id)));
}

function fromSeed(seed: MilestoneSeed, event: TcgEvent | undefined): Milestone {
  const startsAt = zonedLocalToUtc(seed.start, seed.timeZone).toISOString();
  const start = Date.parse(startsAt);
  const endsAt = seed.end
    ? zonedLocalToUtc(seed.end, seed.timeZone).toISOString()
    : new Date(start + HOUR).toISOString();
  const announced = zonedLocalToUtc(`${seed.announced}T00:00`, seed.timeZone).getTime();
  // The progress bar needs a non-empty window even if a seed was announced on the day itself.
  const announcedAt = new Date(announced < start ? announced : start - DAY).toISOString();

  const calendar: CalendarEntry = event
    ? eventEntry(event)
    : {
        uid: `milestone-${seed.id}`,
        title: seed.title,
        description: seed.subtitle,
        ...(seed.location ? { location: seed.location } : {}),
        startsAt,
        endsAt,
        url: seed.href ? (isExternal(seed.href) ? seed.href : absoluteUrl(seed.href)) : absoluteUrl("/countdowns"),
      };

  return {
    id: seed.id,
    title: seed.title,
    shortTitle: shortTitle(seed.title),
    subtitle: seed.subtitle,
    kind: seed.kind,
    ...(event && event.status !== "cancelled" ? { eventStatus: event.status } : {}),
    startsAt,
    endsAt,
    timeZone: seed.timeZone,
    announcedAt,
    ...(seed.location ? { location: seed.location } : {}),
    ...(seed.href ? { href: seed.href } : {}),
    ...(seed.eventId ? { eventId: seed.eventId } : {}),
    highlight: seed.highlight ?? false,
    derived: false,
    calendar,
    display: buildDisplay(startsAt, endsAt, announcedAt, seed.timeZone),
  };
}

const DERIVED: readonly { id: string; type: EventType; title: string; kind: MilestoneKind }[] = [
  { id: "next-regional-championship", type: "regional", title: "Next Regional Championship", kind: "championship" },
  { id: "next-store-championship", type: "store-championship", title: "Next Store Championship", kind: "championship" },
  // No seed kind covers demo days; the card shows the event-type badge instead.
  { id: "next-premier-demo", type: "premier-demo", title: "Next Premier Demo Event", kind: "convention" },
];

function startOfUtcDay(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function fromEvent(rule: (typeof DERIVED)[number], event: TcgEvent, now: Date): Milestone {
  const start = Date.parse(event.startsAt);
  // No publish date is stored, so the wait starts at the earliest of: registration
  // opening, a fixed lead time, or today (so a far-off event starts near 0%).
  const candidates = [start - DERIVED_LEAD_TIME, startOfUtcDay(now)];
  if (event.registration.opensAt) candidates.push(Date.parse(event.registration.opensAt));
  const announcedAt = new Date(Math.min(...candidates)).toISOString();

  return {
    id: rule.id,
    title: rule.title,
    shortTitle: shortTitle(rule.title),
    subtitle: event.title,
    kind: rule.kind,
    eventType: rule.type,
    eventStatus: "scheduled",
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeZone: event.timeZone,
    announcedAt,
    location: venueLabel(event),
    href: eventPath(event.id),
    eventId: event.id,
    highlight: false,
    derived: true,
    calendar: eventEntry(event),
    display: buildDisplay(event.startsAt, event.endsAt, announcedAt, event.timeZone),
  };
}

/**
 * Milestones that have not yet ended at `now`, soonest first. Curated milestones
 * linked to a cancelled event are dropped, and a derived "next X" milestone is
 * skipped when a curated one already counts down to the same event.
 */
export async function getMilestones(now: Date = new Date()): Promise<Milestone[]> {
  const [seeds, events] = await Promise.all([getMilestoneSeeds(), getEvents()]);
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const t = now.getTime();

  const curated = seeds
    .filter((seed) => !seed.eventId || eventsById.get(seed.eventId)?.status !== "cancelled")
    .map((seed) => fromSeed(seed, seed.eventId ? eventsById.get(seed.eventId) : undefined));

  const linkedEventIds = new Set(seeds.flatMap((s) => (s.eventId ? [s.eventId] : [])));
  const derived: Milestone[] = [];
  for (const rule of DERIVED) {
    // `getEvents()` is sorted by start time, so the first match is the soonest.
    const next = events.find((e) => e.type === rule.type && e.status === "scheduled" && Date.parse(e.startsAt) > t);
    if (next && !linkedEventIds.has(next.id)) derived.push(fromEvent(rule, next, now));
  }

  return [...curated, ...derived]
    .filter((m) => Date.parse(m.endsAt) > t)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.title.localeCompare(b.title));
}
