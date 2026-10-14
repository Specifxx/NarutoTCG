"use client";

import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import { GeocodeError, geocode, getDeviceLocation, suggestPlaces } from "@/lib/geocode-client";
import type { ResolvedPlace } from "@/lib/places";
import { button, field } from "@/lib/styles";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; message: string; locating: boolean }
  | { kind: "error"; message: string };

const SUGGEST_DELAY_MS = 180;

/**
 * "City, ZIP or postcode" search with gazetteer typeahead (ARIA 1.2 combobox),
 * free-text geocoding on submit and a "Use my location" button.
 */
export function LocationSearch({
  label = "Near",
  currentLabel,
  onSelect,
  onClear,
  className,
}: {
  label?: string;
  /** Label of the active search origin, or null when none is set. */
  currentLabel: string | null;
  onSelect: (place: ResolvedPlace) => void;
  onClear: () => void;
  className?: string;
}) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const statusId = `${baseId}-status`;

  const [query, setQuery] = useState(currentLabel ?? "");
  const [dirty, setDirty] = useState(false);
  const [suggestions, setSuggestions] = useState<ResolvedPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const requestRef = useRef<AbortController | null>(null);
  // Bumped by every lookup, locate, choice and clear, so a late geocode or geolocation result can't undo a newer action.
  const requestSeq = useRef(0);

  // Mirror external changes (selection, reset) into the text box.
  useEffect(() => {
    setQuery(currentLabel ?? "");
    setDirty(false);
  }, [currentLabel]);

  // Typeahead from the bundled gazetteer, debounced and cancellable.
  useEffect(() => {
    if (!dirty || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      suggestPlaces(query, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setActive(-1);
          setOpen(results.length > 0);
        })
        .catch(() => {
          /* Aborted or offline: keep typing usable without suggestions. */
        });
    }, SUGGEST_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, dirty]);

  useEffect(() => () => requestRef.current?.abort(), []);

  function choose(place: ResolvedPlace) {
    requestSeq.current += 1;
    requestRef.current?.abort();
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
    setDirty(false);
    setQuery(place.label);
    setStatus({ kind: "idle" });
    onSelect(place);
  }

  async function lookup(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setStatus({ kind: "error", message: "Enter at least 2 characters — a city, ZIP or postcode." });
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const seq = ++requestSeq.current;
    setOpen(false);
    setStatus({ kind: "busy", message: `Finding “${trimmed}”…`, locating: false });
    try {
      const place = await geocode(trimmed, controller.signal);
      if (seq === requestSeq.current) choose(place);
    } catch (error) {
      if (controller.signal.aborted || seq !== requestSeq.current) return;
      setStatus({
        kind: "error",
        message: error instanceof GeocodeError ? error.message : "Location lookup failed. Check your connection and try again.",
      });
    }
  }

  async function locate() {
    requestRef.current?.abort();
    const seq = ++requestSeq.current;
    setOpen(false);
    setStatus({ kind: "busy", message: "Getting your location…", locating: true });
    try {
      const place = await getDeviceLocation();
      if (seq === requestSeq.current) choose(place);
    } catch (error) {
      // A newer lookup, choice or clear owns the status now.
      if (seq !== requestSeq.current) return;
      setStatus({
        kind: "error",
        message: error instanceof GeocodeError ? error.message : "We couldn't get your location.",
      });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (open && active >= 0 && suggestions[active]) choose(suggestions[active]);
    else if (!dirty && currentLabel && query === currentLabel) setOpen(false);
    else void lookup(query);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActive(-1);
      } else if (query) {
        event.preventDefault();
        setQuery(currentLabel ?? "");
        setDirty(false);
      }
    }
  }

  function clear() {
    requestSeq.current += 1;
    requestRef.current?.abort();
    setQuery("");
    setDirty(false);
    setSuggestions([]);
    setOpen(false);
    setStatus({ kind: "idle" });
    if (currentLabel) onClear();
    document.getElementById(inputId)?.focus();
  }

  const busy = status.kind === "busy";
  const expanded = open && suggestions.length > 0;

  return (
    <div className={className}>
      <form role="search" aria-label="Search by location" onSubmit={submit} noValidate>
        <label htmlFor={inputId} className={field.label}>
          {label}
        </label>
        <div className="mt-1.5 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400"
              aria-hidden="true"
            />
            <input
              id={inputId}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
              aria-describedby={statusId}
              aria-invalid={status.kind === "error" || undefined}
              placeholder="City, ZIP or postcode"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDirty(true);
                if (status.kind === "error") setStatus({ kind: "idle" });
              }}
              onKeyDown={onKeyDown}
              onFocus={() => {
                if (dirty && suggestions.length > 0) setOpen(true);
              }}
              onBlur={() => setOpen(false)}
              className={cx(field.input, "pl-9", query ? "pr-9" : "")}
            />
            {query && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-ash-400 hover:text-ash-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                aria-label={currentLabel ? "Clear location" : "Clear text"}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <ul
              id={listId}
              role="listbox"
              aria-label="Suggested places"
              hidden={!expanded}
              className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-shadow-500 bg-shadow-900 py-1 shadow-xl shadow-black/50"
            >
              {suggestions.map((place, index) => (
                <li
                  key={`${place.label}-${place.lat}-${place.lng}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keep focus in the input so blur doesn't close the list before the click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(place)}
                  onMouseEnter={() => setActive(index)}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                    index === active ? "bg-chakra-500/15 text-white" : "text-ash-200",
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ash-400" aria-hidden="true" />
                  <span className="truncate">{place.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={locate}
            disabled={busy}
            className={cx(button.secondary, "shrink-0")}
            aria-label="Use my location"
            title="Use my location"
          >
            {status.kind === "busy" && status.locating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Use my location</span>
          </button>
        </div>
      </form>
      <p
        id={statusId}
        aria-live="polite"
        className={cx(
          "min-h-5 pt-1 text-xs",
          status.kind === "error" ? "font-medium text-rose-300" : "text-ash-400",
        )}
      >
        {status.kind === "idle" ? "" : status.message}
      </p>
    </div>
  );
}
