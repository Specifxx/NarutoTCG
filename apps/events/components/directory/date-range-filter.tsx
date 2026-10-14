"use client";

import { CalendarRange, X } from "lucide-react";
import { useId } from "react";
import { cx } from "@/lib/format";
import { chip, field } from "@/lib/styles";
import { useNow } from "@/lib/use-now";
import { localTodayKey, rangeLabel } from "./date-keys";
import { DATE_PRESETS, matchPreset, presetRange, type DatePresetId } from "./date-presets";
import { groupLabel, type FilterControlProps } from "./shared";

const VENUE_LOCAL_HINT = "Dates are in each venue's local time.";

/**
 * Date range presets plus custom From/To inputs. Presets are resolved from the
 * viewer's local date when clicked; which preset is "active" is only known after
 * mount (it depends on the viewer's clock), so until then only "Any time" can show
 * as pressed — a class-only change, no layout shift.
 */
export function DateRangeFilter({ filters, setFilters }: FilterControlProps) {
  const baseId = useId();
  const fromId = `${baseId}-from`;
  const toId = `${baseId}-to`;
  const hintId = `${baseId}-hint`;
  const now = useNow(60_000);

  const range = { from: filters.from, to: filters.to };
  const hasRange = Boolean(range.from || range.to);
  const activePreset: DatePresetId | null = now ? matchPreset(range, localTodayKey(now)) : hasRange ? null : "any";

  function choosePreset(id: DatePresetId) {
    // Clearing `month` lets the calendar jump to the first event in the new range.
    setFilters({ ...presetRange(id, localTodayKey(new Date())), month: null });
  }

  function changeFrom(value: string) {
    setFilters((current) => {
      const from = value || null;
      const to = from && current.to && current.to < from ? from : current.to;
      return { from, to, month: null };
    });
  }

  function changeTo(value: string) {
    setFilters((current) => {
      const to = value || null;
      const from = to && current.from && current.from > to ? to : current.from;
      return { from, to, month: null };
    });
  }

  return (
    <fieldset aria-describedby={hintId}>
      <legend className={groupLabel}>Dates</legend>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {DATE_PRESETS.map(({ id, label, hint }) => (
          <button
            key={id}
            type="button"
            title={hint}
            aria-pressed={activePreset === id}
            onClick={() => choosePreset(id)}
            className={chip(activePreset === id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <label htmlFor={fromId} className="block text-xs font-medium text-ash-400">
            From
          </label>
          <input
            id={fromId}
            type="date"
            value={filters.from ?? ""}
            max={filters.to ?? undefined}
            onChange={(e) => changeFrom(e.target.value)}
            title={VENUE_LOCAL_HINT}
            className={cx(field.input, "mt-1 tabular-nums")}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={toId} className="block text-xs font-medium text-ash-400">
            To
          </label>
          <input
            id={toId}
            type="date"
            value={filters.to ?? ""}
            min={filters.from ?? undefined}
            onChange={(e) => changeTo(e.target.value)}
            title={VENUE_LOCAL_HINT}
            className={cx(field.input, "mt-1 tabular-nums")}
          />
        </div>
      </div>

      <p id={hintId} className={field.hint}>
        {VENUE_LOCAL_HINT}
      </p>

      {hasRange && (
        <div className="mt-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-chakra-500/50 bg-chakra-500/10 py-1 pl-2.5 pr-1 text-xs text-chakra-400">
            <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 font-semibold tabular-nums [overflow-wrap:anywhere]">
              {rangeLabel(range.from, range.to)}
            </span>
            <button
              type="button"
              onClick={() => setFilters({ from: null, to: null, month: null })}
              aria-label={`Remove date range: ${rangeLabel(range.from, range.to)}`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-chakra-400 transition-colors hover:bg-chakra-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      )}
    </fieldset>
  );
}
