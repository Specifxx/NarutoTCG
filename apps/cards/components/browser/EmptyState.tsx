"use client";

import { useId } from "react";
import { ShurikenIcon } from "./icons";

/** Shown when nothing matches, with ways out: clear filters or try a suggestion. */
export function EmptyState({
  query,
  facetCount,
  datasetEmpty,
  suggestions,
  onClearAll,
  onClearFacets,
  onSuggest,
}: {
  query: string;
  facetCount: number;
  /** The dataset itself has no cards (as opposed to no matches). */
  datasetEmpty: boolean;
  suggestions: readonly string[];
  onClearAll: () => void;
  onClearFacets: () => void;
  onSuggest: (query: string) => void;
}) {
  const trimmed = query.trim();
  const suggestionsId = useId();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-shadow-700 bg-shadow-900/50 px-6 py-14 text-center">
      <ShurikenIcon className="mx-auto h-12 w-12 text-shadow-500" />
      {datasetEmpty ? (
        <>
          <h3 className="mt-5 text-lg font-bold text-white">No cards in the database yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ash-400">
            Card data is still being added. Check back after the next reveal.
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-5 text-lg font-bold text-white">
            {trimmed !== "" ? (
              <>
                No cards match <span className="text-chakra-400">“{trimmed}”</span>
                {facetCount > 0 && " with these filters"}
              </>
            ) : (
              "No cards match these filters"
            )}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ash-400">
            Check the spelling, search for a character tag like a team or village, or loosen a filter.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {trimmed !== "" && facetCount > 0 && (
              <button
                type="button"
                onClick={onClearFacets}
                className="h-10 rounded-lg border border-shadow-500 px-4 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
              >
                Search all cards for “{trimmed}”
              </button>
            )}
            <button
              type="button"
              onClick={onClearAll}
              className="h-10 rounded-lg bg-chakra-500 px-4 text-sm font-bold text-shadow-950 transition hover:bg-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900"
            >
              Clear all filters
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-8">
              <p id={suggestionsId} className="text-xs font-semibold uppercase tracking-[0.16em] text-ash-400">
                Popular searches
              </p>
              <ul aria-labelledby={suggestionsId} className="mt-3 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => onSuggest(suggestion)}
                      className="rounded-full border border-shadow-700 bg-shadow-950 px-3 py-1.5 text-xs font-medium text-ash-200 transition hover:border-chakra-500/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                    >
                      {suggestion.replaceAll('"', "")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
