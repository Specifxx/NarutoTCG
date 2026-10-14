"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import { field } from "@/lib/styles";
import { groupLabel, type FilterControlProps } from "./shared";

const DEBOUNCE_MS = 250;
const MAX_LENGTH = 100;

/** Normalise the way the URL serialiser does, so we can tell our own writes apart from external changes. */
const canonical = (value: string) => value.trim().slice(0, MAX_LENGTH);

/** Free-text search over title, venue, city and organiser. Debounced into the URL; Escape clears. */
export function SearchField({ filters, setFilters }: FilterControlProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(filters.q);
  // Last value written to (or read from) the URL.
  const committed = useRef(canonical(filters.q));

  // Mirror external changes (Clear all, chip removal, back/forward) into the box.
  useEffect(() => {
    if (filters.q !== committed.current) {
      committed.current = filters.q;
      setText(filters.q);
    }
  }, [filters.q]);

  useEffect(() => {
    const next = canonical(text);
    if (next === committed.current) return;
    const timer = window.setTimeout(() => {
      committed.current = next;
      setFilters({ q: next });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, setFilters]);

  function commitNow(value: string) {
    setText(value);
    const next = canonical(value);
    if (next !== committed.current) {
      committed.current = next;
      setFilters({ q: next });
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    commitNow(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && text) {
      event.preventDefault();
      commitNow("");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor={inputId} className={cx(groupLabel, "mb-2 block")}>
        Search events
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_LENGTH}
          placeholder="Search events, stores, cities…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          className={cx(field.input, "pl-9 [&::-webkit-search-cancel-button]:appearance-none", text ? "pr-9" : "pr-3")}
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              commitNow("");
              // This button unmounts once the box is empty; keep focus in the field.
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-ash-400 transition-colors hover:text-ash-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
