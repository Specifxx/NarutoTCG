"use client";

import type { CardSet, CardType } from "@naruto-tcg/types";
import { useId, useRef, useState, type ReactNode } from "react";
import { ElementIcon } from "@/components/ElementIcon";
import { CARD_TYPES, CHAKRA_ELEMENTS, ELEMENT_META, RARITIES, RARITY_META, TYPE_META } from "@/lib/meta";
import type { CardFilters, FacetCounts, FacetKey, FacetValueMap } from "@/lib/search";
import { CheckIcon, ChevronIcon } from "./icons";

export type BrowserSet = Pick<CardSet, "id" | "name" | "shortName" | "kind" | "releaseDate">;

export type ToggleFacet = <K extends FacetKey>(key: K, value: FacetValueMap[K]) => void;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900";

const TYPE_GLYPH: Record<CardType, string> = {
  leader: "★",
  character: "◆",
  mission: "◎",
  jutsu: "✦",
};

/**
 * Collapsible facet section. The heading wraps a disclosure button; the
 * options live in a fieldset so the group has an accessible name.
 */
function FacetSection({
  title,
  selected,
  onReset,
  children,
}: {
  title: string;
  selected: number;
  onReset: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  return (
    <section className="border-b border-shadow-800 py-3 last:border-b-0">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1">
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className={`flex w-full items-center gap-2 rounded-md py-1.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-ash-200 transition hover:text-white ${FOCUS_RING}`}
          >
            <span>{title}</span>
            {selected > 0 && (
              <span className="rounded-full bg-chakra-500/15 px-1.5 py-px text-[10px] font-bold tracking-normal text-chakra-400">
                {selected}
                <span className="sr-only"> selected</span>
              </span>
            )}
            <ChevronIcon
              className={`ml-auto h-4 w-4 text-ash-400 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          </button>
        </h3>
        {selected > 0 && (
          <button
            type="button"
            onClick={() => {
              onReset();
              // This button disappears with the selection; keep focus in the section.
              toggleRef.current?.focus();
            }}
            className={`rounded px-1.5 py-1 text-xs text-ash-400 transition hover:text-chakra-400 ${FOCUS_RING}`}
          >
            Reset<span className="sr-only"> {title}</span>
          </button>
        )}
      </div>
      <div id={panelId} hidden={!open} className="pt-2">
        <fieldset>
          <legend className="sr-only">{title}</legend>
          {children}
        </fieldset>
      </div>
    </section>
  );
}

function CountText({ count }: { count: number }) {
  return (
    <span className="ml-auto pl-2 text-xs tabular-nums text-ash-400">
      <span className="sr-only">, </span>
      {count.toLocaleString("en-US")}
      <span className="sr-only">{count === 1 ? " card" : " cards"}</span>
    </span>
  );
}

/** Checkbox row: a visually hidden native checkbox with a styled box. */
function CheckOption({
  checked,
  count,
  onChange,
  children,
}: {
  checked: boolean;
  count: number;
  onChange: () => void;
  children: ReactNode;
}) {
  const empty = count === 0;
  const disabled = empty && !checked;
  return (
    <li>
      <label
        className={`relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition ${
          disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-shadow-800"
        } ${empty && checked ? "opacity-70" : ""}`}
      >
        <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={onChange} />
        <span
          aria-hidden="true"
          className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-chakra-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-shadow-900 ${
            checked ? "border-chakra-500 bg-chakra-500 text-shadow-950" : "border-ash-400 bg-shadow-950"
          }`}
        >
          {checked && <CheckIcon className="h-3 w-3 [stroke-width:3]" />}
        </span>
        <span className={`flex min-w-0 flex-1 items-center gap-2 ${checked ? "text-white" : "text-ash-200"}`}>{children}</span>
        <CountText count={count} />
      </label>
    </li>
  );
}

export interface FilterPanelProps {
  filters: CardFilters;
  counts: FacetCounts;
  /** Cost options to show (costs present in the data plus any selected). */
  costs: readonly number[];
  sets: readonly BrowserSet[];
  onToggle: ToggleFacet;
  onReset: (key: FacetKey) => void;
}

/** Every facet section; rendered in the desktop sidebar and the mobile drawer. */
export function FilterPanel({ filters, counts, costs, sets, onToggle, onReset }: FilterPanelProps) {
  return (
    <div>
      <FacetSection title="Card Type" selected={filters.types.length} onReset={() => onReset("types")}>
        <ul className="space-y-0.5">
          {CARD_TYPES.map((type) => (
            <CheckOption
              key={type}
              checked={filters.types.includes(type)}
              count={counts.types.get(type) ?? 0}
              onChange={() => onToggle("types", type)}
            >
              <span aria-hidden="true" className="w-4 text-center text-xs text-chakra-400">
                {TYPE_GLYPH[type]}
              </span>
              <span className="truncate">{TYPE_META[type].label}</span>
            </CheckOption>
          ))}
        </ul>
      </FacetSection>

      <FacetSection title="Chakra Element" selected={filters.elements.length} onReset={() => onReset("elements")}>
        <ul className="space-y-0.5">
          {CHAKRA_ELEMENTS.map((element) => (
            <CheckOption
              key={element}
              checked={filters.elements.includes(element)}
              count={counts.elements.get(element) ?? 0}
              onChange={() => onToggle("elements", element)}
            >
              <ElementIcon element={element} className="h-4 w-4 shrink-0" />
              <span className="truncate">{ELEMENT_META[element].label}</span>
              <span aria-hidden="true" className={`text-xs opacity-60 ${ELEMENT_META[element].text}`}>
                {ELEMENT_META[element].kanji}
              </span>
            </CheckOption>
          ))}
        </ul>
      </FacetSection>

      <FacetSection title="Cost" selected={filters.costs.length} onReset={() => onReset("costs")}>
        {costs.length === 0 ? (
          <p className="px-2 text-xs text-ash-400">No costed cards yet.</p>
        ) : (
          <ul className="grid grid-cols-5 gap-1.5">
            {costs.map((cost) => {
              const checked = filters.costs.includes(cost);
              const count = counts.costs.get(cost) ?? 0;
              const disabled = count === 0 && !checked;
              return (
                <li key={cost}>
                  <label className={`relative block ${disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggle("costs", cost)}
                    />
                    <span
                      className={`flex h-12 flex-col items-center justify-center rounded-lg border transition peer-focus-visible:ring-2 peer-focus-visible:ring-chakra-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-shadow-900 ${
                        checked
                          ? "border-chakra-500 bg-chakra-500/15 text-white shadow-[0_0_18px_-6px_rgb(242_92_0/0.8)]"
                          : `border-shadow-700 bg-shadow-950 text-ash-200 ${disabled ? "" : "hover:border-shadow-500 hover:bg-shadow-800"}`
                      }`}
                    >
                      <span className="text-base font-bold leading-none tabular-nums">
                        <span className="sr-only">Cost </span>
                        {cost}
                      </span>
                      <span className="mt-1 text-[10px] leading-none tabular-nums text-ash-400">
                        <span className="sr-only">, </span>
                        {count}
                        <span className="sr-only">{count === 1 ? " card" : " cards"}</span>
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </FacetSection>

      <FacetSection title="Rarity" selected={filters.rarities.length} onReset={() => onReset("rarities")}>
        <ul className="space-y-0.5">
          {RARITIES.map((rarity) => (
            <CheckOption
              key={rarity}
              checked={filters.rarities.includes(rarity)}
              count={counts.rarities.get(rarity) ?? 0}
              onChange={() => onToggle("rarities", rarity)}
            >
              <span
                aria-hidden="true"
                className={`inline-flex min-w-9 shrink-0 justify-center rounded-full border px-1.5 py-px text-[10px] font-bold ${RARITY_META[rarity].badge}`}
              >
                {RARITY_META[rarity].code}
              </span>
              <span className="truncate">{RARITY_META[rarity].label}</span>
            </CheckOption>
          ))}
        </ul>
      </FacetSection>

      <FacetSection title="Set" selected={filters.sets.length} onReset={() => onReset("sets")}>
        {sets.length === 0 ? (
          <p className="px-2 text-xs text-ash-400">No sets yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {sets.map((set) => (
              <CheckOption
                key={set.id}
                checked={filters.sets.includes(set.id)}
                count={counts.sets.get(set.id) ?? 0}
                onChange={() => onToggle("sets", set.id)}
              >
                <span className="w-11 shrink-0 font-mono text-[11px] font-semibold text-chakra-400">{set.id}</span>
                <span className="min-w-0 leading-snug" title={set.name}>
                  {set.shortName}
                </span>
              </CheckOption>
            ))}
          </ul>
        )}
      </FacetSection>
    </div>
  );
}
