import type { TcgEvent } from "@naruto-tcg/types";
import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { cx } from "@/lib/format";
import { googleCalendarUrl, icsFileName, type CalendarEntry } from "@/lib/ics";
import { button, surface } from "@/lib/styles";
import { EventCountdown } from "./event-countdown";
import { ShareActions } from "./share-actions";
import { ViewerLocalTime } from "./viewer-local-time";

/** Sidebar card: countdown, the viewer's local time, calendar export and sharing. */
export function ScheduleCard({
  event,
  entry,
  path,
  shareText,
}: {
  event: TcgEvent;
  /** Calendar entry with an absolute URL (see lib/event-calendar.ts). */
  entry: CalendarEntry;
  /** Canonical page path, e.g. "/events/abc". */
  path: string;
  shareText: string;
}) {
  const cancelled = event.status === "cancelled";

  return (
    <section aria-labelledby="schedule-heading" className={cx(surface.panel, "space-y-5")}>
      <h2 id="schedule-heading" className="sr-only">
        Countdown, calendar and sharing
      </h2>
      <EventCountdown startsAt={event.startsAt} endsAt={event.endsAt} status={event.status} />

      {!cancelled && (
        <ViewerLocalTime startsAt={event.startsAt} endsAt={event.endsAt} venueTimeZone={event.timeZone} />
      )}

      {!cancelled && (
        <div className="border-t border-shadow-700 pt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ash-400">
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Add to calendar
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a href={`${path}/calendar.ics`} download={icsFileName(event.title)} className={button.secondarySm}>
              <Download className="h-4 w-4" aria-hidden="true" />
              .ics file
              <span className="sr-only"> for Apple Calendar or Outlook</span>
            </a>
            <a
              href={googleCalendarUrl(entry)}
              target="_blank"
              rel="noopener noreferrer"
              className={button.secondarySm}
            >
              Google
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only"> Calendar (opens in a new tab)</span>
            </a>
          </div>
        </div>
      )}

      <div className="border-t border-shadow-700 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ash-400">Share</h3>
        <div className="mt-2">
          <ShareActions path={path} title={event.title} text={shareText} />
        </div>
      </div>
    </section>
  );
}
