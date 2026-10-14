"use client";

import type { EventFormat } from "@naruto-tcg/types";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { EVENT_FORMATS, REGIONS, isRegion } from "@/lib/event-meta";
import { cx } from "@/lib/format";
import { chip, field } from "@/lib/styles";
import { focusRing, groupLabel, type FilterControlProps } from "./shared";

/** Number of filters tucked inside the disclosure, for its badge. */
function hiddenFilterCount(filters: FilterControlProps["filters"]): number {
  return filters.formats.length + (filters.region ? 1 : 0) + (filters.freeOnly ? 1 : 0) + (filters.includePast ? 1 : 0);
}

/** Disclosure with format, region, free-entry and past-event filters. Opens by default when any are active. */
export function MoreFilters({ filters, setFilters }: FilterControlProps) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const regionId = `${baseId}-region`;
  const freeId = `${baseId}-free`;
  const pastId = `${baseId}-past`;
  const count = hiddenFilterCount(filters);
  // Derived from the URL, so server and client agree on the initial state.
  const [open, setOpen] = useState(count > 0);

  function toggleFormat(format: EventFormat) {
    setFilters((current) => ({
      formats: current.formats.includes(format)
        ? current.formats.filter((f) => f !== format)
        : [...current.formats, format],
    }));
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-ash-200 transition-colors hover:bg-shadow-800",
          focusRing,
        )}
      >
        <span className="flex-1">More filters</span>
        {count > 0 && (
          <span className="rounded-full bg-chakra-500 px-1.5 py-px text-[11px] font-bold text-shadow-950 tabular-nums">
            {count}
            <span className="sr-only"> active</span>
          </span>
        )}
        <ChevronDown
          className={cx("h-4 w-4 text-ash-400 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div id={panelId} hidden={!open} className="mt-3 space-y-5">
        <fieldset>
          <legend className={groupLabel}>Format</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EVENT_FORMATS.map((meta) => {
              const active = filters.formats.includes(meta.format);
              const Icon = meta.icon;
              return (
                <button
                  key={meta.format}
                  type="button"
                  aria-pressed={active}
                  title={meta.description}
                  onClick={() => toggleFormat(meta.format)}
                  className={chip(active)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor={regionId} className={cx("block", groupLabel)}>
            Region
          </label>
          <select
            id={regionId}
            value={filters.region ?? ""}
            onChange={(e) => setFilters({ region: isRegion(e.target.value) ? e.target.value : null })}
            className={cx(field.select, "mt-2")}
          >
            <option value="">All regions</option>
            {REGIONS.map(({ region, label }) => (
              <option key={region} value={region}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <input
              id={freeId}
              type="checkbox"
              checked={filters.freeOnly}
              onChange={(e) => setFilters({ freeOnly: e.target.checked })}
              className={field.checkbox}
            />
            <label htmlFor={freeId} className="text-sm text-ash-200">
              Free entry only
            </label>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              id={pastId}
              type="checkbox"
              checked={filters.includePast}
              onChange={(e) => setFilters({ includePast: e.target.checked })}
              className={field.checkbox}
            />
            <label htmlFor={pastId} className="text-sm text-ash-200">
              Include past events
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
