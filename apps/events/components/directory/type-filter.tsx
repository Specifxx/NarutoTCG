"use client";

import type { EventType } from "@naruto-tcg/types";
import { Check } from "lucide-react";
import { EVENT_TYPES } from "@/lib/event-meta";
import { cx } from "@/lib/format";
import { chip } from "@/lib/styles";
import { focusRing, groupLabel, type FilterControlProps } from "./shared";

/** Multi-select chips for the five event types, tinted with each type's colour when active. */
export function TypeFilter({ filters, setFilters }: FilterControlProps) {
  const selected = new Set(filters.types);

  function toggle(type: EventType) {
    setFilters((current) => ({
      types: current.types.includes(type) ? current.types.filter((t) => t !== type) : [...current.types, type],
    }));
  }

  return (
    <fieldset>
      <legend className={groupLabel}>Event type</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EVENT_TYPES.map((meta) => {
          const active = selected.has(meta.type);
          const Icon = meta.icon;
          return (
            <button
              key={meta.type}
              type="button"
              aria-pressed={active}
              aria-label={meta.label}
              title={meta.description}
              onClick={() => toggle(meta.type)}
              className={
                active
                  ? cx(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      focusRing,
                      meta.classes.border,
                      meta.classes.bg,
                      meta.classes.text,
                    )
                  : chip(false)
              }
            >
              {active ? (
                <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : (
                <span className={cx("h-2 w-2 shrink-0 rounded-full", meta.classes.dot)} aria-hidden="true" />
              )}
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {meta.shortLabel}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
