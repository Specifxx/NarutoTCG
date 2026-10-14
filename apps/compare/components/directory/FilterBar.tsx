"use client";

import Form from "next/form";
import { useEffect, useId, useRef, useState } from "react";
import { MAX_QUERY_LENGTH } from "@/lib/market/constants";
import {
  DEFAULT_SORT,
  FINISH_LABEL,
  isFinish,
  isRarity,
  isSortKey,
  RARITY_LABEL,
  SORT_OPTIONS,
} from "@/lib/market/labels";
import { toSearchParams } from "@/lib/market/query";
import type { MarketFacets, MarketQuery } from "@/lib/market/types";
import { useDirectory } from "./DirectoryProvider";
import { CLEAR_FILTERS, hasActiveFilters, moversParam } from "./href";
import { ChevronDownIcon, CloseIcon, SearchIcon } from "./icons";
import { MultiSelect } from "./MultiSelect";

const SEARCH_DEBOUNCE_MS = 300;

interface Chip {
  key: string;
  label: string;
  remove: Partial<MarketQuery>;
}

function activeChips(query: MarketQuery, facets: MarketFacets): Chip[] {
  const setName = (code: string) => facets.sets.find((s) => s.value === code)?.label ?? code;
  return [
    ...(query.q ? [{ key: "q", label: `“${query.q}”`, remove: { q: undefined } }] : []),
    ...(query.sets ?? []).map((code) => ({
      key: `set:${code}`,
      label: setName(code),
      remove: { sets: query.sets?.filter((s) => s !== code) },
    })),
    ...(query.rarities ?? []).map((rarity) => ({
      key: `rarity:${rarity}`,
      label: RARITY_LABEL[rarity],
      remove: { rarities: query.rarities?.filter((r) => r !== rarity) },
    })),
    ...(query.finishes ?? []).map((finish) => ({
      key: `finish:${finish}`,
      label: FINISH_LABEL[finish],
      remove: { finishes: query.finishes?.filter((f) => f !== finish) },
    })),
  ];
}

/**
 * Search, facet filters, sort and active-filter chips. Every change navigates to a
 * new URL (page reset to 1); results re-render on the server.
 */
export function FilterBar({ facets }: { facets: MarketFacets }) {
  const { query, movers, navigate } = useDirectory();
  const [text, setText] = useState(query.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchId = useId();
  const sortId = useId();
  const chipsLabelId = useId();

  // Adopt search text that changed elsewhere (chip removal, back/forward) unless the user is mid-typing.
  useEffect(() => {
    if (timer.current !== undefined) return;
    const q = query.q ?? "";
    setText((current) => (current.trim() === q ? current : q));
  }, [query.q]);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Cancels a pending debounced search and returns it as a patch, so other changes include what was typed (a patch's own `q` wins). */
  const flushSearch = (): Partial<MarketQuery> => {
    if (timer.current === undefined) return {};
    clearTimeout(timer.current);
    timer.current = undefined;
    return { q: text.trim() || undefined };
  };

  const apply = (patch: Partial<MarketQuery>) =>
    navigate({ query: { ...flushSearch(), ...patch, page: 1 } }, { region: "results" });

  const onSearchChange = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      const q = value.trim() || undefined;
      if (q !== query.q) navigate({ query: { q, page: 1 } }, { region: "results" });
    }, SEARCH_DEBOUNCE_MS);
  };

  const clearSearch = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setText("");
    if (query.q) navigate({ query: { q: undefined, page: 1 } }, { region: "results" });
  };

  const chips = activeChips(query, facets);
  // Lets the search form work as a plain GET before hydration / without JavaScript.
  const hiddenFields = [...toSearchParams({ ...query, q: undefined, page: 1 }, moversParam(movers))];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Form
          role="search"
          action="/"
          prefetch={false}
          className="relative lg:max-w-md lg:flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ q: text.trim() || undefined });
          }}
        >
          <label htmlFor={searchId} className="sr-only">
            Search cards
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ash-400" />
          <input
            id={searchId}
            name="q"
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Search by card, character, set or number"
            value={text}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-shadow-700 bg-shadow-900 pr-10 pl-9 text-sm text-ash-200 placeholder:text-ash-400 transition-colors hover:border-shadow-500 focus:border-chakra-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {text && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ash-400 hover:bg-shadow-800 hover:text-ash-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              <CloseIcon className="size-4" />
            </button>
          )}
          {hiddenFields.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </Form>

        <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
          {/* Positioned so phone-width popovers span this row and drop directly beneath it. */}
          <div className="relative grid grid-cols-3 gap-2 sm:flex">
            <MultiSelect
              label="Set"
              options={facets.sets.map((s) => ({ ...s, hint: s.value }))}
              selected={query.sets ?? []}
              onChange={(sets) => apply({ sets })}
            />
            <MultiSelect
              label="Rarity"
              options={facets.rarities}
              selected={query.rarities ?? []}
              onChange={(values) => apply({ rarities: values.filter(isRarity) })}
            />
            <MultiSelect
              label="Finish"
              options={facets.finishes}
              selected={query.finishes ?? []}
              onChange={(values) => apply({ finishes: values.filter(isFinish) })}
            />
          </div>
          <div className="relative sm:ml-auto">
            <label
              htmlFor={sortId}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-medium text-ash-400"
            >
              Sort
            </label>
            <select
              id={sortId}
              value={query.sort ?? DEFAULT_SORT}
              onChange={(event) => {
                const sort = event.target.value;
                if (isSortKey(sort)) apply({ sort });
              }}
              className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-shadow-700 bg-shadow-900 pr-9 pl-12 text-sm font-medium text-ash-200 transition-colors hover:border-shadow-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 sm:w-auto"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ash-400" />
          </div>
        </div>
      </div>

      {hasActiveFilters(query) && (
        <div className="flex flex-wrap items-center gap-2">
          <span id={chipsLabelId} className="text-xs font-medium text-ash-400">
            Filtered by
          </span>
          <ul aria-labelledby={chipsLabelId} className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={() => {
                    if (chip.key === "q") setText("");
                    apply(chip.remove);
                  }}
                  aria-label={`Remove filter ${chip.label}`}
                  className="inline-flex h-8 max-w-[16rem] items-center gap-1.5 rounded-full border border-shadow-500 bg-shadow-800 pr-2 pl-3 text-xs font-medium text-ash-200 transition-colors hover:border-chakra-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 pointer-coarse:h-10"
                >
                  <span className="truncate">{chip.label}</span>
                  <CloseIcon className="size-3.5 shrink-0 text-ash-400" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              clearTimeout(timer.current);
              timer.current = undefined;
              setText("");
              navigate({ query: CLEAR_FILTERS }, { region: "results" });
            }}
            className="h-8 rounded-md px-2 text-xs font-semibold text-chakra-400 hover:bg-shadow-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 pointer-coarse:h-10"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
