"use client";

import { CalendarPlus, ChevronDown, Download, ExternalLink } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { buildIcs, googleCalendarUrl, icsFileName, type CalendarEntry } from "@/lib/ics";
import { button } from "@/lib/styles";

const item =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ash-200 transition-colors hover:bg-shadow-800 hover:text-white focus-visible:bg-shadow-800 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-chakra-400";

/**
 * "Add to calendar" disclosure offering an .ics download (Apple Calendar, Outlook)
 * and a Google Calendar link. Event-linked milestones download from the event's
 * own `calendar.ics` route; the rest are generated in the browser.
 */
export function AddToCalendar({
  entry,
  icsHref,
  compact = false,
  align = "end",
  className,
  buttonClassName,
}: {
  entry: CalendarEntry;
  /** Server route serving the .ics, e.g. "/events/<id>/calendar.ics". */
  icsHref?: string;
  /** Smaller ghost trigger for cards. */
  compact?: boolean;
  /** Which edge of the trigger the menu lines up with. */
  align?: "start" | "end";
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const statusTimer = useRef<number | undefined>(undefined);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(statusTimer.current), []);

  const announce = (message: string) => {
    setStatus(message);
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(""), 4000);
  };

  const downloadIcs = () => {
    const ics = buildIcs([entry], { calendarName: entry.title });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = icsFileName(entry.title);
    document.body.append(link);
    link.click();
    link.remove();
    // Revoke on the next tick; some browsers start the download asynchronously.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
    announce(`Calendar file for ${entry.title} downloaded.`);
  };

  const icsLabel = (
    <>
      <Download className="h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
      <span>
        Apple / Outlook <span className="text-ash-400">(.ics)</span>
      </span>
    </>
  );

  return (
    <div
      ref={rootRef}
      className={cx("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cx(compact ? cx(button.ghost, "px-2.5") : button.secondary, buttonClassName)}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        {compact ? (
          <span>
            <span className="sr-only">Add to </span>Calendar
          </span>
        ) : (
          "Add to calendar"
        )}
        {/* Several of these share a page; name the milestone for screen-reader button lists. */}
        <span className="sr-only">: {entry.title}</span>
        <ChevronDown className={cx("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      <ul
        id={menuId}
        hidden={!open}
        className={cx(
          "absolute top-full z-30 mt-2 w-[min(15rem,calc(100vw-2rem))] rounded-lg border border-shadow-700 bg-shadow-900 p-1 shadow-xl shadow-black/60",
          align === "start" ? "left-0" : "right-0",
        )}
      >
        <li>
          {icsHref ? (
            <a
              href={icsHref}
              download
              className={item}
              onClick={() => {
                setOpen(false);
                announce(`Downloading calendar file for ${entry.title}.`);
              }}
            >
              {icsLabel}
            </a>
          ) : (
            <button type="button" className={item} onClick={downloadIcs}>
              {icsLabel}
            </button>
          )}
        </li>
        <li>
          <a
            href={googleCalendarUrl(entry)}
            target="_blank"
            rel="noopener noreferrer"
            className={item}
            onClick={() => setOpen(false)}
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
            <span>
              Google Calendar<span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
        </li>
      </ul>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
