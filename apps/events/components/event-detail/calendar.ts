import type { TcgEvent } from "@naruto-tcg/types";
import { eventFormatMeta } from "@/lib/event-meta";
import { addressLines, formatMoney } from "@/lib/format";
import type { CalendarEntry } from "@/lib/ics";

/** Single-line venue for calendar LOCATION fields: "Venue, Hall, 1 Main St, City, ST 90012, United States". */
export function venueLocationLine(event: Pick<TcgEvent, "venue">): string {
  const { venue } = event;
  return [venue.name, venue.hall, ...addressLines(venue.address)].filter(Boolean).join(", ");
}

/**
 * Calendar entry for an event, shared by the .ics download and the Google Calendar
 * link so both carry the same details. `url` must be absolute (RFC 5545 has no
 * relative URLs).
 */
export function eventCalendarEntry(event: TcgEvent, url: string | undefined): CalendarEntry {
  const details = [
    event.description,
    `Format: ${eventFormatMeta(event.format).label} · Entry: ${formatMoney(event.entryFee)}`,
    `Organiser: ${event.organizer.name}`,
  ].join("\n\n");
  return {
    uid: event.id,
    title: event.title,
    description: details,
    location: venueLocationLine(event),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status: event.status,
    ...(url ? { url } : {}),
  };
}
