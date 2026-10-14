"use client";

import { CalendarRange, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { chip, field } from "@/lib/styles";
import { isLocalDate } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { localTodayKey, rangeLabel } from "./date-keys";
import { DATE_PRESETS, matchPreset, presetRange, type DatePresetId } from "./date-presets";
import { groupLabel, type FilterControlProps } from "./shared";

const VENUE_LOCAL_HINT = "Dates are in each venue's local time.";

/** Typing a year segment by keyboard passes through 0002, 0020, 0202…; don't filter on those. */
const MIN_TYPED_DATE = "1900-01-01";

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

  // Never touch the other bound here: browsers fire change for every segment typed into a
  // date input (month 01, year 0002…), so clamping would overwrite it with transient values.
  // An inverted range is tolerated (filtering and the label treat it as swapped).
  function changeFrom(value: string | null) {
    setFilters({ from: value, month: null });
  }

  function changeTo(value: string | null) {
    setFilters({ to: value, month: null });
  }

  function clearRange() {
    setFilters({ from: null, to: null, month: null });
    // The chip (and this button) unmounts; keep keyboard focus in the date group.
    document.getElementById(fromId)?.focus();
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
          <DateBoundInput id={fromId} value={filters.from} max={filters.to} onCommit={changeFrom} />
        </div>
        <div className="min-w-0">
          <label htmlFor={toId} className="block text-xs font-medium text-ash-400">
            To
          </label>
          <DateBoundInput id={toId} value={filters.to} min={filters.from} onCommit={changeTo} />
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
              onClick={clearRange}
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

/**
 * A date input with a local draft. Browsers fire change for every segment typed by
 * keyboard, and the URL-backed filters re-render in a transition, so binding the input
 * straight to them makes React restore the stale value mid-typing (and a transient
 * year like 0002 is rejected, clearing the field). The draft keeps typing intact; only
 * complete, plausible dates (or an emptied field) are committed.
 */
function DateBoundInput({
  id,
  value,
  min,
  max,
  onCommit,
}: {
  id: string;
  value: string | null;
  min?: string | null;
  max?: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  // Last value written to (or read from) the filters.
  const committed = useRef(value ?? "");

  // Mirror external changes (presets, chip removal, Clear all, back/forward) into the field.
  useEffect(() => {
    const next = value ?? "";
    if (next !== committed.current) {
      committed.current = next;
      setDraft(next);
    }
  }, [value]);

  function onChange(next: string) {
    setDraft(next);
    if (next === "" || (isLocalDate(next) && next >= MIN_TYPED_DATE)) {
      committed.current = next;
      onCommit(next || null);
    }
  }

  return (
    <input
      id={id}
      type="date"
      value={draft}
      min={min ?? undefined}
      max={max ?? undefined}
      onChange={(e) => onChange(e.target.value)}
      // Drop an uncommitted partial year rather than leave it showing a date that isn't applied.
      onBlur={() => setDraft(committed.current)}
      title={VENUE_LOCAL_HINT}
      className={cx(field.input, "mt-1 tabular-nums")}
    />
  );
}
