"use client";

import type { EventTier } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useId } from "react";
import { EVENT_TIER_ORDER, EVENT_TIER_SHORT, pluralize } from "@/lib/format";
import { DATE_PRESETS, formatSlug, hasActiveFilters, normalizeTiers, resetFilters, type MetaParams } from "./params";

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";
const SELECT =
  "rounded-md border border-shadow-600 bg-shadow-800 py-1.5 pr-8 pl-2.5 text-sm text-ash-100 hover:border-shadow-500 disabled:opacity-60";

/** The one filter row above everything it scopes. Fully controlled; `onChange` is absent until hydrated. */
export function MetaFilters({
  state,
  formats,
  activeFormat,
  importedCount,
  onChange,
}: {
  state: MetaParams;
  formats: string[];
  /** The resolved format label, or undefined for "All formats". */
  activeFormat: string | undefined;
  /** Imported events in this browser; the toggle only shows when there are some. */
  importedCount: number;
  onChange?: (next: MetaParams) => void;
}) {
  const id = useId();
  const disabled = !onChange;
  const set = (patch: Partial<MetaParams>) => onChange?.({ ...state, ...patch });
  const toggleTier = (tier: EventTier) =>
    set({ tiers: normalizeTiers(state.tiers.includes(tier) ? state.tiers.filter((t) => t !== tier) : [...state.tiers, tier]) });

  return (
    <div
      role="group"
      aria-label="Meta filters"
      className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-lg border border-shadow-700 bg-shadow-900 p-3 sm:p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-range`} className="text-xs font-medium text-ash-400">
          Date range
        </label>
        <select
          id={`${id}-range`}
          value={state.range}
          disabled={disabled}
          onChange={(e) => set({ range: e.target.value })}
          className={cx(SELECT, FOCUS)}
        >
          {DATE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.from ? `${preset.label} (${preset.from})` : preset.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-1">
        <legend className="mb-1 text-xs font-medium text-ash-400">
          Event tier <span className="text-ash-500">{state.tiers.length === 0 ? "(all)" : ""}</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_TIER_ORDER.map((tier) => {
            const on = state.tiers.includes(tier);
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                onClick={() => toggleTier(tier)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  FOCUS,
                  on
                    ? "border-chakra-500 bg-chakra-500/15 text-white"
                    : "border-shadow-600 bg-shadow-800 text-ash-300 hover:border-shadow-500 hover:text-white",
                )}
              >
                {on && (
                  <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3 text-chakra-300">
                    <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                {EVENT_TIER_SHORT[tier]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-format`} className="text-xs font-medium text-ash-400">
          Format
        </label>
        <select
          id={`${id}-format`}
          value={activeFormat ? formatSlug(activeFormat) : ""}
          disabled={disabled}
          onChange={(e) => set({ format: e.target.value || null })}
          className={cx(SELECT, FOCUS, "max-w-full")}
        >
          <option value="">All formats</option>
          {formats.map((format) => (
            <option key={format} value={formatSlug(format)}>
              {format}
            </option>
          ))}
        </select>
      </div>

      {importedCount > 0 && (
        <label className="flex cursor-pointer items-center gap-2 self-center pt-4 text-sm text-ash-200 sm:self-end sm:pb-1.5">
          <input
            type="checkbox"
            checked={state.imports}
            disabled={disabled}
            onChange={(e) => set({ imports: e.target.checked })}
            className={cx("h-4 w-4 rounded border-shadow-500 bg-shadow-800 accent-chakra-500", FOCUS)}
          />
          Include my imported events <span className="text-ash-500">({pluralize(importedCount, "event")})</span>
        </label>
      )}

      {hasActiveFilters(state) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(resetFilters(state))}
          className={cx("rounded-md px-2 py-1.5 text-sm font-medium text-chakra-300 hover:text-chakra-400 sm:ml-auto", FOCUS)}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
