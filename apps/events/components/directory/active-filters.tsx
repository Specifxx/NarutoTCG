"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { eventFormatMeta, eventTypeMeta, regionLabel } from "@/lib/event-meta";
import { hasLocation, type EventFilters } from "@/lib/filters";
import { cx } from "@/lib/format";
import { rangeLabel } from "./date-keys";
import { originLabel } from "./location-filter";
import { focusRing, type FilterControlProps } from "./shared";

interface ActiveChip {
  key: string;
  label: string;
  /** Tailwind class for a leading colour dot (event types). */
  dot?: string;
  remove: (current: EventFilters) => Partial<EventFilters>;
}

function activeChips(filters: EventFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `“${filters.q.trim()}”`, remove: () => ({ q: "" }) });
  for (const type of filters.types) {
    const meta = eventTypeMeta(type);
    chips.push({
      key: `type-${type}`,
      label: meta.label,
      dot: meta.classes.dot,
      remove: (c) => ({ types: c.types.filter((t) => t !== type) }),
    });
  }
  for (const format of filters.formats) {
    chips.push({
      key: `format-${format}`,
      label: eventFormatMeta(format).label,
      remove: (c) => ({ formats: c.formats.filter((f) => f !== format) }),
    });
  }
  if (filters.region)
    chips.push({ key: "region", label: regionLabel(filters.region), remove: () => ({ region: null }) });
  if (filters.from || filters.to) {
    chips.push({
      key: "dates",
      label: rangeLabel(filters.from, filters.to),
      remove: () => ({ from: null, to: null, month: null }),
    });
  }
  if (hasLocation(filters)) {
    chips.push({
      key: "near",
      label: `Within ${filters.radius.toLocaleString("en-US")} ${filters.unit} of ${originLabel(filters.near)}`,
      remove: () => ({ near: null, lat: null, lng: null, sort: "date" }),
    });
  }
  if (filters.freeOnly) chips.push({ key: "free", label: "Free entry", remove: () => ({ freeOnly: false }) });
  if (filters.includePast)
    chips.push({ key: "past", label: "Including past events", remove: () => ({ includePast: false }) });
  return chips;
}

/**
 * Removable chips for every applied filter. After a removal, focus moves to the
 * chip that took its place (or the previous one) so keyboard users don't land on
 * <body>; `onEmpty` handles the last one.
 */
export function ActiveFilters({
  filters,
  setFilters,
  onEmpty,
}: FilterControlProps & {
  /** Called after the last chip is removed, to move focus somewhere sensible. */
  onEmpty: () => void;
}) {
  const chips = activeChips(filters);
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-chip]");
    if (buttons && buttons.length > 0) buttons[Math.min(index, buttons.length - 1)].focus();
    else onEmpty();
  });

  if (chips.length === 0) return null;

  return (
    <ul ref={listRef} aria-label="Active filters" className="flex flex-wrap gap-1.5">
      {chips.map((chip, index) => (
        <li key={chip.key} className="max-w-full">
          <button
            type="button"
            data-chip=""
            onClick={() => {
              pendingFocus.current = index;
              setFilters(chip.remove);
            }}
            aria-label={`Remove filter: ${chip.label}`}
            className={cx(
              "group inline-flex max-w-full items-center gap-1.5 rounded-full border border-shadow-500 bg-shadow-800 py-1 pl-2.5 pr-1.5 text-left text-xs text-ash-200 transition-colors hover:border-rose-400/60 hover:text-white",
              focusRing,
            )}
          >
            {chip.dot && <span className={cx("h-2 w-2 shrink-0 rounded-full", chip.dot)} aria-hidden="true" />}
            <span className="min-w-0 [overflow-wrap:anywhere]">{chip.label}</span>
            <X className="h-3.5 w-3.5 shrink-0 text-ash-400 group-hover:text-rose-300" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
