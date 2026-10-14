import { NextResponse, type NextRequest } from "next/server";
import { eventCalendarEntry } from "@/lib/event-calendar";
import { getEvent } from "@/lib/data";
import { buildIcs, icsFileName } from "@/lib/ics";
import { absoluteUrl, eventPath } from "@/lib/site";

/**
 * GET /events/:id/calendar.ics — single-event iCalendar download (Apple Calendar,
 * Outlook, Google import). The event URL uses the canonical origin (lib/site.ts),
 * never the internal origin the request reached the server on.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) {
    return new NextResponse("Event not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const url = absoluteUrl(eventPath(event.id));
  const ics = buildIcs([eventCalendarEntry(event, url)], { calendarName: event.title });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFileName(event.title)}"`,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
