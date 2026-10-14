"use client";

import { useEffect, useId, type RefObject } from "react";
import { MAX_QUERY_LENGTH } from "@/lib/search";
import { CloseIcon, SearchIcon } from "./icons";

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "image", "range", "color", "file"]);

/** True when "/" should type a character (or drive a control) instead of jumping to search. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/**
 * Instant search input. "/" focuses it from anywhere on the page, Escape
 * clears it (or leaves the field when already empty).
 */
export function SearchBar({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const hintId = `${id}-hint`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditable(event.target)) return;
      // Leave "/" alone while a modal (e.g. the filter drawer) is open.
      if (document.querySelector("dialog[open]")) return;
      const input = inputRef.current;
      if (!input) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inputRef]);

  return (
    <div role="search" aria-label="Cards" className="relative">
      <label htmlFor={id} className="sr-only">
        Search cards
      </label>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 sm:left-4 -translate-y-1/2 text-ash-400" />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          if (value !== "") onChange("");
          else event.currentTarget.blur();
        }}
        maxLength={MAX_QUERY_LENGTH}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Search name, tag, or rules text…"
        aria-describedby={hintId}
        className="h-12 w-full rounded-xl border border-shadow-700 bg-shadow-900/80 pl-11 pr-12 sm:pl-12 sm:pr-14 text-base text-white shadow-inner shadow-black/40 transition placeholder:text-ash-400 hover:border-shadow-500 focus:border-chakra-500/70 focus:bg-shadow-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400/70 sm:text-[0.95rem] [&::-webkit-search-cancel-button]:appearance-none"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
        {value !== "" ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-ash-400 transition hover:bg-shadow-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            title="Press / to search"
            className="mr-1.5 hidden h-6 min-w-6 items-center justify-center rounded-md border border-shadow-500 bg-shadow-800 px-1.5 font-mono text-xs text-ash-400 shadow-[0_2px_0_0_rgb(0_0_0/0.5)] sm:inline-flex"
          >
            /
          </kbd>
        )}
      </div>
      <p id={hintId} className="sr-only">
        Results update as you type. Wrap words in quotes to match an exact phrase. Press slash to jump here and Escape
        to clear.
      </p>
    </div>
  );
}
