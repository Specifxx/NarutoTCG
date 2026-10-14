"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { ElementIcon } from "@/components/ElementIcon";
import { ELEMENT_META, RARITY_META, TYPE_META } from "@/lib/meta";
import type { CardFilters } from "@/lib/search";
import type { BrowserSet, ToggleFacet } from "./FilterPanel";
import { CloseIcon } from "./icons";

interface Chip {
  key: string;
  label: string;
  value: string;
  icon?: ReactNode;
  remove: () => void;
}

/**
 * Removable chips for the query and every selected facet value. Removing a
 * chip moves focus to the chip that takes its place so keyboard users never
 * lose their position.
 */
export function ActiveFilters({
  filters,
  sets,
  onToggle,
  onClearQuery,
  onClearAll,
  fallbackFocusRef,
}: {
  filters: CardFilters;
  sets: readonly BrowserSet[];
  onToggle: ToggleFacet;
  onClearQuery: () => void;
  onClearAll: () => void;
  /** Focus target once the last chip is gone. */
  fallbackFocusRef: RefObject<HTMLElement | null>;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const chips: Chip[] = [];
  const query = filters.query.trim();
  if (query !== "") chips.push({ key: "q", label: "Search", value: `“${query}”`, remove: onClearQuery });
  for (const type of filters.types) {
    chips.push({ key: `type:${type}`, label: "Type", value: TYPE_META[type].label, remove: () => onToggle("types", type) });
  }
  for (const element of filters.elements) {
    chips.push({
      key: `element:${element}`,
      label: "Element",
      value: ELEMENT_META[element].label,
      icon: <ElementIcon element={element} className="h-3.5 w-3.5" />,
      remove: () => onToggle("elements", element),
    });
  }
  for (const cost of filters.costs) {
    chips.push({ key: `cost:${cost}`, label: "Cost", value: String(cost), remove: () => onToggle("costs", cost) });
  }
  for (const rarity of filters.rarities) {
    chips.push({
      key: `rarity:${rarity}`,
      label: "Rarity",
      value: RARITY_META[rarity].label,
      remove: () => onToggle("rarities", rarity),
    });
  }
  for (const id of filters.sets) {
    const name = sets.find((set) => set.id === id)?.shortName;
    chips.push({ key: `set:${id}`, label: "Set", value: name ? `${id} · ${name}` : id, remove: () => onToggle("sets", id) });
  }

  const count = chips.length;
  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-chip]");
    const target = buttons && buttons.length > 0 ? buttons[Math.min(index, buttons.length - 1)] : undefined;
    (target ?? fallbackFocusRef.current)?.focus();
  }, [count, fallbackFocusRef]);

  if (count === 0) return null;

  return (
    <ul ref={listRef} aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip, i) => (
        <li key={chip.key}>
          <button
            type="button"
            data-chip=""
            onClick={() => {
              pendingFocus.current = i;
              chip.remove();
            }}
            // Starts with the visible text so voice users can say what they see.
            aria-label={`${chip.label} ${chip.value}, remove filter`}
            className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-shadow-700 bg-shadow-900 py-1 pl-3 pr-1.5 text-xs transition hover:border-chakra-500/60 hover:bg-shadow-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <span className="text-ash-400">{chip.label}</span>
            {chip.icon}
            <span className="max-w-[14rem] truncate font-semibold text-white">{chip.value}</span>
            <span className="grid h-5 w-5 place-items-center rounded-full text-ash-400 transition group-hover:bg-chakra-500/20 group-hover:text-chakra-400">
              <CloseIcon className="h-3 w-3" />
            </span>
          </button>
        </li>
      ))}
      {count > 1 && (
        <li>
          <button
            type="button"
            data-chip=""
            onClick={() => {
              pendingFocus.current = Number.MAX_SAFE_INTEGER;
              onClearAll();
            }}
            className="rounded-full px-2 py-1 text-xs font-semibold text-chakra-400 underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            Clear all
          </button>
        </li>
      )}
    </ul>
  );
}
