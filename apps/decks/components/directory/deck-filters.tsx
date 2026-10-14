"use client";

import { cx } from "@naruto-tcg/ui";
import { useId, useState } from "react";
import { ArchetypeDot } from "@/components/ui/badges";
import { ARCHETYPES } from "@/lib/data/archetypes";
import { PLACEMENT_FILTER_LABELS, type PlacementFilter } from "@/lib/decks/catalog";
import { EVENT_TIER_LABEL, EVENT_TIER_ORDER, EVENT_TIER_SHORT } from "@/lib/format";
import { CardCombobox } from "./card-combobox";
import type { CardOption } from "./decks";
import {
  DECK_SOURCES,
  DECK_SOURCE_LABELS,
  activeFilterCount,
  normalizeArchetypeIds,
  normalizeTiers,
  toggleValue,
  type DeckParams,
} from "./params";
import { FIELD, FIELD_LABEL, FOCUS_RING, chipClass } from "./styles";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65-1.06 1.06-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
      />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M3 5h14M6 10h8M8.5 15h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={className}>
      <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The directory's single filter row. On small screens everything but the search sits behind a
 * "Filters" disclosure; from `lg` up the panel flattens into the row. Fully controlled; the
 * controls render disabled until `onChange` is provided.
 */
export function DeckFilters({
  state,
  text,
  cards,
  onTextChange,
  onTextSubmit,
  onChange,
}: {
  state: DeckParams;
  /** The live (undebounced) search text. */
  text: string;
  cards: CardOption[];
  onTextChange?: (text: string) => void;
  onTextSubmit?: () => void;
  onChange?: (patch: Partial<DeckParams>) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const disabled = !onChange;
  const count = activeFilterCount(state);
  const panelId = `${id}-panel`;

  return (
    <form
      role="search"
      aria-label="Filter decks"
      onSubmit={(event) => {
        event.preventDefault();
        onTextSubmit?.();
      }}
      className="flex flex-col gap-4 rounded-lg border border-shadow-700 bg-shadow-900 p-3 sm:p-4 lg:flex-row lg:flex-wrap lg:items-start lg:gap-x-5"
    >
      <div className="flex min-w-0 items-end gap-2 lg:w-64">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`${id}-q`} className={FIELD_LABEL}>
            Search
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ash-500" />
            <input
              id={`${id}-q`}
              type="search"
              value={text}
              disabled={disabled}
              onChange={(event) => onTextChange?.(event.target.value)}
              placeholder="Deck, player, event or card"
              autoComplete="off"
              enterKeyHint="search"
              className={cx(FIELD, "w-full pl-8")}
            />
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cx(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition lg:hidden",
            FOCUS_RING,
            open ? "border-chakra-500 text-white" : "border-shadow-500 text-ash-200 hover:border-chakra-400 hover:text-white",
          )}
        >
          <FilterIcon className="h-4 w-4" />
          Filters
          {count > 0 && (
            <span className="rounded-full bg-chakra-500 px-1.5 text-[11px] font-bold tabular-nums text-shadow-950">
              {count}
              <span className="sr-only"> active</span>
            </span>
          )}
        </button>
      </div>

      <div
        id={panelId}
        className={cx(open ? "flex" : "hidden", "flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-5 lg:contents")}
      >
        <div className="flex flex-col gap-1">
          <span id={`${id}-source`} className={FIELD_LABEL}>
            Source
          </span>
          <div
            role="group"
            aria-labelledby={`${id}-source`}
            className="inline-flex h-9 w-full rounded-md border border-shadow-600 bg-shadow-800 p-0.5 sm:w-auto"
          >
            {DECK_SOURCES.map((source) => {
              const pressed = state.source === source;
              return (
                <button
                  key={source}
                  type="button"
                  aria-pressed={pressed}
                  disabled={disabled}
                  onClick={() => onChange?.({ source })}
                  className={cx(
                    "flex-1 rounded px-3 text-sm font-medium transition disabled:opacity-60 sm:flex-none",
                    FOCUS_RING,
                    pressed ? "bg-shadow-600 text-white shadow-sm" : "text-ash-300 hover:text-white",
                  )}
                >
                  {DECK_SOURCE_LABELS[source]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span id={`${id}-tier`} className={FIELD_LABEL}>
            Event tier {state.tiers.length === 0 && <span className="text-ash-500">(any)</span>}
          </span>
          <div role="group" aria-labelledby={`${id}-tier`} className="flex min-h-9 flex-wrap items-center gap-1.5">
            {EVENT_TIER_ORDER.map((tier) => {
              const pressed = state.tiers.includes(tier);
              return (
                <button
                  key={tier}
                  type="button"
                  aria-pressed={pressed}
                  disabled={disabled}
                  title={EVENT_TIER_LABEL[tier]}
                  onClick={() => onChange?.({ tiers: normalizeTiers(toggleValue(state.tiers, tier)) })}
                  className={chipClass(pressed)}
                >
                  {pressed && <CheckIcon className="h-3 w-3 text-chakra-300" />}
                  {EVENT_TIER_SHORT[tier]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-placement`} className={FIELD_LABEL}>
            Finish
          </label>
          <select
            id={`${id}-placement`}
            value={state.placement}
            disabled={disabled}
            onChange={(event) => onChange?.({ placement: event.target.value as PlacementFilter })}
            className={cx(FIELD, "w-full pr-8 sm:w-36")}
          >
            {Object.entries(PLACEMENT_FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <CardCombobox options={cards} selected={state.cardIds} onChange={onChange && ((cardIds) => onChange({ cardIds }))} />

        <div className="flex min-w-0 basis-full flex-col gap-1">
          <span id={`${id}-archetype`} className={FIELD_LABEL}>
            Archetype {state.archetypeIds.length === 0 && <span className="text-ash-500">(any)</span>}
          </span>
          <div role="group" aria-labelledby={`${id}-archetype`} className="flex flex-wrap gap-1.5">
            {ARCHETYPES.map((archetype) => {
              const pressed = state.archetypeIds.includes(archetype.id);
              return (
                <button
                  key={archetype.id}
                  type="button"
                  aria-pressed={pressed}
                  disabled={disabled}
                  title={archetype.name}
                  onClick={() => onChange?.({ archetypeIds: normalizeArchetypeIds(toggleValue(state.archetypeIds, archetype.id)) })}
                  className={chipClass(pressed)}
                >
                  <ArchetypeDot archetypeId={archetype.id} />
                  {archetype.shortName}
                  {pressed && <CheckIcon className="h-3 w-3 text-chakra-300" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </form>
  );
}
