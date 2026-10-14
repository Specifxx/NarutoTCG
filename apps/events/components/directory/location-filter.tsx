"use client";

import { Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { RADIUS_OPTIONS, hasLocation } from "@/lib/filters";
import { cx } from "@/lib/format";
import { GeocodeError, geocode, getDeviceLocation, suggestPlaces } from "@/lib/geocode-client";
import type { DistanceUnit } from "@/lib/geo";
import type { ResolvedPlace } from "@/lib/places";
import { field } from "@/lib/styles";
import { focusRing, groupLabel, type FilterControlProps } from "./shared";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; task: "lookup" | "locate"; message: string }
  | { kind: "error"; message: string };

const SUGGEST_DELAY_MS = 200;
const UNITS: readonly { unit: DistanceUnit; title: string }[] = [
  { unit: "mi", title: "Miles" },
  { unit: "km", title: "Kilometres" },
];

/** "Within 50 mi of Chicago, IL, US" — lower-cases the device-location label so it reads naturally. */
export function originLabel(near: string | null): string {
  return near === "Your location" ? "your location" : (near ?? "selected location");
}

/**
 * Radius search: a "ZIP, postcode or city" combobox with gazetteer typeahead
 * (ARIA 1.2 combobox + listbox), free-text geocoding, device location, radius
 * and unit controls, and a removable chip for the active origin.
 */
export function LocationFilter({ filters, setFilters }: FilterControlProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const statusId = `${baseId}-status`;
  const radiusId = `${baseId}-radius`;

  const located = hasLocation(filters);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [suggestions, setSuggestions] = useState<ResolvedPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Radius is only serialised alongside an origin, so remember the choice made before one is set.
  const [pendingRadius, setPendingRadius] = useState(filters.radius);
  const requestRef = useRef<AbortController | null>(null);
  // Bumped per lookup/locate so a slow, superseded result can't overwrite a newer one.
  const requestSeq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the last active radius so it survives the origin being removed (chip, Clear all…).
  useEffect(() => {
    if (located) setPendingRadius(filters.radius);
  }, [located, filters.radius]);

  // Debounced, cancellable typeahead from the bundled gazetteer.
  useEffect(() => {
    if (!dirty || query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
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
          /* Aborted or offline — typing still works, just without suggestions. */
        });
    }, SUGGEST_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, dirty]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const radius = located ? filters.radius : pendingRadius;
  const radiusOptions = (RADIUS_OPTIONS as readonly number[]).includes(radius)
    ? RADIUS_OPTIONS
    : [...RADIUS_OPTIONS, radius].sort((a, b) => a - b);

  function apply(place: ResolvedPlace) {
    requestSeq.current += 1;
    requestRef.current?.abort();
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
    setDirty(false);
    setQuery("");
    setStatus({ kind: "idle" });
    setFilters((current) => ({
      near: place.label,
      lat: place.lat,
      lng: place.lng,
      // First origin: adopt the pre-chosen radius and switch to nearest-first.
      ...(hasLocation(current) ? {} : { radius: pendingRadius, sort: "distance" as const }),
    }));
  }

  async function lookup() {
    const text = query.trim();
    if (text.length < 2) {
      setStatus({ kind: "error", message: "Enter at least 2 characters — a city, ZIP or postcode." });
      inputRef.current?.focus();
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const seq = ++requestSeq.current;
    setOpen(false);
    setStatus({ kind: "busy", task: "lookup", message: `Finding “${text}”…` });
    try {
      const place = await geocode(text, controller.signal);
      if (seq === requestSeq.current) apply(place);
    } catch (error) {
      if (controller.signal.aborted || seq !== requestSeq.current) return;
      setStatus({
        kind: "error",
        message:
          error instanceof GeocodeError
            ? error.message
            : "Location lookup failed. Check your connection and try again.",
      });
    }
  }

  async function locate() {
    requestRef.current?.abort();
    const seq = ++requestSeq.current;
    setOpen(false);
    setStatus({ kind: "busy", task: "locate", message: "Getting your location…" });
    try {
      const place = await getDeviceLocation();
      if (seq === requestSeq.current) apply(place);
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setStatus({
        kind: "error",
        message: error instanceof GeocodeError ? error.message : "We couldn't get your location.",
      });
    }
  }

  function clearOrigin() {
    requestSeq.current += 1;
    setFilters({ near: null, lat: null, lng: null, sort: "date" });
    setStatus({ kind: "idle" });
    inputRef.current?.focus();
  }

  function changeRadius(value: number) {
    if (located) setFilters({ radius: value });
    else setPendingRadius(value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = suggestions.length;
    switch (event.key) {
      case "ArrowDown": {
        if (!count) return;
        event.preventDefault();
        const openOnly = event.altKey;
        setOpen(true);
        setActive((i) => (openOnly ? i : (i + 1) % count));
        break;
      }
      case "ArrowUp":
        if (!count) return;
        event.preventDefault();
        setOpen(true);
        setActive((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case "Enter":
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        if (open && active >= 0 && suggestions[active]) apply(suggestions[active]);
        else void lookup();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (query) {
          event.preventDefault();
          setQuery("");
          setDirty(false);
          setStatus({ kind: "idle" });
        }
        break;
    }
  }

  const expanded = open && suggestions.length > 0;
  const busy = status.kind === "busy";

  return (
    <fieldset>
      <legend className={groupLabel}>Location</legend>

      <div className="mt-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            Find events near a ZIP, postcode or city
          </label>
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
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
            placeholder={located ? "Change location…" : "ZIP, postcode or city"}
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
            className={cx(field.input, "pl-9", query ? "pr-9" : "pr-3")}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDirty(false);
                setStatus({ kind: "idle" });
                inputRef.current?.focus();
              }}
              aria-label="Clear location text"
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-ash-400 transition-colors hover:text-ash-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <ul
            id={listId}
            role="listbox"
            aria-label="Suggested places"
            hidden={!expanded}
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-shadow-500 bg-shadow-900 py-1 shadow-xl shadow-black/50"
          >
            {suggestions.map((place, index) => (
              <li
                key={`${place.label}-${place.lat}-${place.lng}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // Keep focus in the input so its blur doesn't close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(place)}
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
          onClick={() => void lookup()}
          disabled={busy}
          aria-label="Search this location"
          title="Search this location"
          className={cx(
            "inline-flex w-[38px] shrink-0 items-center justify-center rounded-md border border-shadow-700 bg-shadow-900 text-ash-400 transition-colors hover:border-chakra-500 hover:text-chakra-400 disabled:cursor-not-allowed disabled:opacity-50",
            focusRing,
          )}
        >
          {status.kind === "busy" && status.task === "lookup" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={radiusId} className="sr-only">
          Search radius
        </label>
        <select
          id={radiusId}
          value={radius}
          onChange={(e) => changeRadius(Number(e.target.value))}
          className={cx(field.select, "min-w-0 flex-1 tabular-nums")}
        >
          {radiusOptions.map((value) => (
            <option key={value} value={value}>
              Within {value.toLocaleString("en-US")} {filters.unit}
            </option>
          ))}
        </select>
        <div
          role="group"
          aria-label="Distance unit"
          className="flex shrink-0 rounded-md border border-shadow-700 bg-shadow-900 p-0.5"
        >
          {UNITS.map(({ unit, title }) => (
            <button
              key={unit}
              type="button"
              aria-pressed={filters.unit === unit}
              title={title}
              onClick={() => setFilters({ unit })}
              className={cx(
                "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                focusRing,
                filters.unit === unit ? "bg-shadow-700 text-white" : "text-ash-400 hover:text-ash-200",
              )}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void locate()}
        disabled={busy}
        className={cx(
          "-ml-2 mt-1 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-chakra-400 transition-colors hover:bg-shadow-800 hover:text-chakra-400 disabled:cursor-not-allowed disabled:opacity-50",
          focusRing,
        )}
      >
        {status.kind === "busy" && status.task === "locate" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
        )}
        Use my location
      </button>

      <p
        id={statusId}
        aria-live="polite"
        className={cx(
          "text-xs",
          status.kind === "error" ? "font-medium text-rose-300" : "text-ash-400",
          status.kind !== "idle" && "mt-1",
        )}
      >
        {status.kind === "idle" ? "" : status.message}
      </p>

      {located && (
        <div className="mt-2">
          <span className="inline-flex max-w-full items-start gap-1.5 rounded-lg border border-chakra-500/50 bg-chakra-500/10 py-1 pl-2.5 pr-1 text-xs text-chakra-400">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 py-0.5 [overflow-wrap:anywhere]">
              Within <span className="tabular-nums">{filters.radius.toLocaleString("en-US")}</span> {filters.unit} of{" "}
              <span className="font-semibold">{originLabel(filters.near)}</span>
            </span>
            <button
              type="button"
              onClick={clearOrigin}
              aria-label={`Remove location: ${originLabel(filters.near)}`}
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
