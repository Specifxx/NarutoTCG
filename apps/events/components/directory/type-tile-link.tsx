"use client";

import type { EventType } from "@naruto-tcg/types";
import type { MouseEvent, ReactNode } from "react";
import { eventTypeMeta } from "@/lib/event-meta";
import { cx } from "@/lib/format";
import { useEventFilters } from "@/lib/use-event-filters";
import { DIRECTORY_ANCHOR_ID, DIRECTORY_RESULTS_ID, prefersReducedMotion } from "./shared";

/**
 * Quick filter link for one event type. Without JS it's a normal link; with JS
 * it narrows the directory in place (keeping other filters) instead of a server
 * round-trip, then scrolls to the results and moves focus there.
 */
export function TypeTileLink({
  type,
  className,
  children,
}: {
  type: EventType;
  className?: string;
  children: ReactNode;
}) {
  const { filters, setFilters, hrefWithFilters } = useEventFilters();
  const active = filters.types.length === 1 && filters.types[0] === type;
  const href = `${hrefWithFilters("/events", { types: [type], month: null })}#${DIRECTORY_ANCHOR_ID}`;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // Let modified clicks open a new tab/window as usual.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    setFilters({ types: [type], month: null });
    document
      .getElementById(DIRECTORY_ANCHOR_ID)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    document.getElementById(DIRECTORY_RESULTS_ID)?.focus({ preventScroll: true });
  }

  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cx(className, active && cx("ring-2", eventTypeMeta(type).classes.ring))}
    >
      {children}
    </a>
  );
}
