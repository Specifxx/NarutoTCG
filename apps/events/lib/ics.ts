/**
 * Calendar export helpers: RFC 5545 iCalendar files and Google Calendar links.
 * Pure functions, safe on server and client.
 */

export interface CalendarEntry {
  /** Stable unique id, e.g. the event id. */
  uid: string;
  title: string;
  description?: string;
  location?: string;
  /** ISO UTC instants. */
  startsAt: string;
  endsAt: string;
  url?: string;
  status?: "scheduled" | "postponed" | "cancelled";
}

/** 20261024T180000Z */
export function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** Fold lines longer than 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentBytes + size > limit) {
      out.push(current);
      current = "";
      currentBytes = 0;
    }
    current += ch;
    currentBytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(entries: CalendarEntry[], options: { now?: Date; calendarName?: string } = {}): string {
  const stamp = toIcsUtc((options.now ?? new Date()).toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Naruto TCG//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(options.calendarName ? [`X-WR-CALNAME:${escapeText(options.calendarName)}`] : []),
  ];
  for (const e of entries) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(e.uid)}@events.naruto-tcg`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsUtc(e.startsAt)}`,
      `DTEND:${toIcsUtc(e.endsAt)}`,
      `SUMMARY:${escapeText(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
      ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      `STATUS:${e.status === "cancelled" ? "CANCELLED" : e.status === "postponed" ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** "Add to Google Calendar" template link. */
export function googleCalendarUrl(entry: CalendarEntry): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${toIcsUtc(entry.startsAt)}/${toIcsUtc(entry.endsAt)}`,
  });
  const details = [entry.description, entry.url].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  if (entry.location) params.set("location", entry.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Safe file name for a downloaded .ics, e.g. "store-championship-season-1.ics". */
export function icsFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "event"}.ics`;
}
