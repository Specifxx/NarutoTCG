import type { Organizer, Store, TcgEvent, Venue } from "@naruto-tcg/types";
import { regionForCountry } from "../event-meta";
import { addDaysToKey, zonedLocalToUtc } from "../time";
import type { EventSeed, StoreSeed } from "./schema";

export function normalizeStore(seed: StoreSeed): Store {
  return { ...seed, region: regionForCountry(seed.address.country) };
}

function dayDiff(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}

function shiftLocal(local: string, days: number): string {
  return `${addDaysToKey(local.slice(0, 10), days)}T${local.slice(11)}`;
}

/**
 * Expand seeds into concrete events. Store-hosted events inherit the store's
 * venue, zone and (by default) organiser; weekly series become one event per
 * occurrence with ids like `${seed.id}-2026-10-21`.
 */
export function normalizeEvents(seeds: EventSeed[], storesBySlug: Map<string, Store>): TcgEvent[] {
  const events: TcgEvent[] = [];

  for (const seed of seeds) {
    const store = seed.storeSlug ? storesBySlug.get(seed.storeSlug) : undefined;
    if (seed.storeSlug && !store) throw new Error(`Event ${seed.id} references unknown store ${seed.storeSlug}`);
    const timeZone = seed.timeZone ?? store?.timeZone;
    if (!timeZone) throw new Error(`Event ${seed.id} has no time zone`);

    const venue: Venue = store
      ? { name: store.name, address: store.address, location: store.location, storeSlug: store.slug }
      : { ...seed.venue! };
    const organizer: Organizer = seed.organizer
      ? { ...seed.organizer, storeSlug: seed.organizer.storeSlug ?? (seed.organizer.kind === "store" ? store?.slug : undefined) }
      : {
          name: store!.name,
          kind: "store",
          verified: store!.verified,
          email: store!.contact.email,
          phone: store!.contact.phone,
          website: store!.contact.website,
          storeSlug: store!.slug,
        };

    const build = (id: string, startLocal: string, endLocal: string, registeredCount: number, shiftDays: number): TcgEvent => {
      const startsAt = zonedLocalToUtc(startLocal, timeZone).toISOString();
      const participants = seed.participants?.slice(0, registeredCount);
      return {
        id,
        ...(seed.recurrence ? { seriesId: seed.id } : {}),
        title: seed.title,
        type: seed.type,
        format: seed.format,
        status: seed.status ?? "scheduled",
        description: seed.description,
        startsAt,
        endsAt: zonedLocalToUtc(endLocal, timeZone).toISOString(),
        timeZone,
        venue,
        region: regionForCountry(venue.address.country),
        entryFee: seed.entryFee,
        capacity: seed.capacity,
        registeredCount,
        registration: {
          method: seed.registration.method,
          ...(seed.registration.url ? { url: seed.registration.url } : {}),
          ...(seed.registration.opens
            ? { opensAt: zonedLocalToUtc(shiftLocal(seed.registration.opens, shiftDays), timeZone).toISOString() }
            : {}),
          closesAt: seed.registration.closes
            ? zonedLocalToUtc(shiftLocal(seed.registration.closes, shiftDays), timeZone).toISOString()
            : startsAt,
        },
        organizer,
        ...(participants && participants.length ? { participants } : {}),
        prizes: seed.prizes ?? [],
        tags: seed.tags ?? [],
        ...(seed.source ? { source: seed.source } : {}),
      };
    };

    if (!seed.recurrence) {
      events.push(build(seed.id, seed.start, seed.end, seed.registeredCount, 0));
      continue;
    }

    const firstDate = seed.start.slice(0, 10);
    const spanDays = dayDiff(firstDate, seed.end.slice(0, 10));
    const except = new Set(seed.recurrence.except ?? []);
    for (let date = firstDate, week = 0; date <= seed.recurrence.until; date = addDaysToKey(date, 7), week++) {
      if (except.has(date)) continue;
      // Pre-registrations thin out for occurrences further in the future.
      const registered = Math.max(0, Math.round(seed.registeredCount * Math.max(0.25, 1 - week * 0.12)));
      events.push(
        build(
          `${seed.id}-${date}`,
          `${date}T${seed.start.slice(11)}`,
          `${addDaysToKey(date, spanDays)}T${seed.end.slice(11)}`,
          registered,
          week * 7,
        ),
      );
    }
  }

  const seen = new Set<string>();
  for (const e of events) {
    if (seen.has(e.id)) throw new Error(`Duplicate event id after recurrence expansion: ${e.id}`);
    seen.add(e.id);
  }

  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}
