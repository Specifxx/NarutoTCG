import { NextResponse, type NextRequest } from "next/server";
import { eventCalendarEntry } from "@/components/event-detail/calendar";
import { getEvent } from "@/lib/data";
import { buildIcs, icsFileName } from "@/lib/ics";

/**
 * GET /events/:id/calendar.ics — single-event iCalendar download (Apple Calendar,
 * Outlook, Google import). Built per request so the event URL uses the origin the
 * visitor actually reached.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) {
    return new NextResponse("Event not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(`/events/${encodeURIComponent(event.id)}`, request.nextUrl.origin).toString();
  const ics = buildIcs([eventCalendarEntry(event, url)], { calendarName: event.title });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFileName(event.title)}"`,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
