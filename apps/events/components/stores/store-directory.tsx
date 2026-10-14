"use client";

import type { Region, StoreFeature } from "@naruto-tcg/types";
import { ArrowRight, CalendarDays, RotateCcw, Search, SlidersHorizontal, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { REGIONS, STORE_FEATURES } from "@/lib/event-meta";
import { DEFAULT_FILTERS, serializeEventFilters } from "@/lib/filters";
import { cx, pluralize } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import type { ResolvedPlace } from "@/lib/places";
import type { StoreSummary } from "@/lib/store-summary";
import { button, chip, field, surface } from "@/lib/styles";
import { LocationSearch } from "./location-search";
import { StoreCard } from "./store-card";
import {
  STORE_RADIUS_OPTIONS,
  STORE_SORT_LABEL,
  applyStoreFilters,
  countStoreFilters,
  hasStoreLocation,
  nearestStore,
  storeSearchText,
  type StoreFilters,
  type StoreSort,
} from "./store-filters";
import { useStoreFilters } from "./use-store-filters";

/**
 * Interactive store locator: text, region, country, feature, verification and
 * distance filters, all mirrored in the URL. Must render inside `<Suspense>`.
 */
export function StoreDirectory({ stores }: { stores: StoreSummary[] }) {
  const { filters: urlFilters, setFilters, resetFilters } = useStoreFilters();
  // The text box keeps its own state so typing never waits on the URL round-trip.
  const [text, setText] = useState(urlFilters.q);
  const [panelOpen, setPanelOpen] = useState(false);

  const filters = useMemo<StoreFilters>(() => ({ ...urlFilters, q: text }), [urlFilters, text]);
  const searchIndex = useMemo(() => new Map(stores.map((s) => [s.slug, storeSearchText(s)])), [stores]);
  const results = useMemo(() => applyStoreFilters(stores, filters, searchIndex), [stores, filters, searchIndex]);

  // Facet counts ignore the facet's own selection so every option shows what it would yield.
  const facetBase = useMemo(
    () => applyStoreFilters(stores, { ...filters, region: null, country: null }, searchIndex),
    [stores, filters, searchIndex],
  );
  const regionCounts = useMemo(() => countBy(facetBase, (r) => r.store.region), [facetBase]);
  const countryCounts = useMemo(() => countBy(facetBase, (r) => r.store.country), [facetBase]);
  const regionsInData = useMemo(() => REGIONS.filter((r) => stores.some((s) => s.region === r.region)), [stores]);
  const countryRegion = useMemo(() => new Map(stores.map((s) => [s.country, s.region])), [stores]);
  const countryOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const s of stores) if (!filters.region || s.region === filters.region) names.set(s.country, s.countryName);
    return [...names].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, "en"));
  }, [stores, filters.region]);

  const pendingHidden = useMemo(
    () => (filters.verifiedOnly ? applyStoreFilters(stores, { ...filters, verifiedOnly: false }, searchIndex).length - results.length : 0),
    [stores, filters, searchIndex, results.length],
  );
  const nearest = useMemo(
    () => (results.length === 0 ? nearestStore(stores, filters, searchIndex) : null),
    [results.length, stores, filters, searchIndex],
  );

  const located = hasStoreLocation(filters);
  const activeCount = countStoreFilters(filters);
  const panelCount = (filters.region ? 1 : 0) + (filters.country ? 1 : 0) + filters.features.length + (filters.verifiedOnly ? 0 : 1);
  const totalInScope = filters.verifiedOnly ? stores.filter((s) => s.verified).length : stores.length;

  function reset() {
    setText("");
    resetFilters();
  }

  function selectRegion(region: Region | null) {
    setFilters((current) => ({
      region: current.region === region ? null : region,
      country: current.country && region && countryRegion.get(current.country) !== region ? null : current.country,
    }));
  }

  function toggleFeature(feature: StoreFeature) {
    setFilters((current) => ({
      features: current.features.includes(feature)
        ? current.features.filter((f) => f !== feature)
        : [...current.features, feature],
    }));
  }

  function selectPlace(place: ResolvedPlace) {
    setFilters({ near: place.label, lat: place.lat, lng: place.lng, sort: "distance" });
  }

  function clearPlace() {
    setFilters((current) => ({
      near: null,
      lat: null,
      lng: null,
      sort: current.sort === "distance" ? "name" : current.sort,
    }));
  }

  const eventsNearHref = located
    ? `/events?${serializeEventFilters({
        ...DEFAULT_FILTERS,
        near: filters.near,
        lat: filters.lat,
        lng: filters.lng,
        radius: filters.radius > 0 ? filters.radius : 500,
        unit: filters.unit,
        sort: "distance",
      })}`
    : null;

  return (
    <div className="space-y-6">
      <section aria-label="Filter stores" className={cx(surface.panel, "space-y-4")}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div>
            <label htmlFor="store-search" className={field.label}>
              Search stores
            </label>
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400"
                aria-hidden="true"
              />
              <input
                id="store-search"
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Store name, city or country"
                value={text}
                maxLength={100}
                onChange={(e) => {
                  setText(e.target.value);
                  setFilters({ q: e.target.value });
                }}
                className={cx(field.input, "pl-9")}
              />
            </div>
          </div>

          <div>
            <LocationSearch
              label="Near a place"
              currentLabel={located ? filters.near : null}
              onSelect={selectPlace}
              onClear={clearPlace}
            />
            {located && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1 sm:flex-none">
                  <label htmlFor="store-radius" className={field.label}>
                    Within
                  </label>
                  <select
                    id="store-radius"
                    value={filters.radius}
                    onChange={(e) => setFilters({ radius: Number(e.target.value) })}
                    className={cx(field.select, "mt-1.5 sm:w-40")}
                  >
                    {STORE_RADIUS_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r === 0 ? "Any distance" : `${r} ${filters.unit}`}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset>
                  <legend className={field.label}>Units</legend>
                  <div className="mt-1.5 flex gap-1.5">
                    {(["mi", "km"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        aria-pressed={filters.unit === unit}
                        onClick={() => setFilters({ unit })}
                        className={cx(chip(filters.unit === unit), "h-[38px]")}
                      >
                        {unit === "mi" ? "Miles" : "Kilometres"}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className={cx(button.secondary, "w-full md:hidden")}
          aria-expanded={panelOpen}
          aria-controls="store-filter-panel"
          onClick={() => setPanelOpen((open) => !open)}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {panelOpen ? "Hide filters" : "More filters"}
          {panelCount > 0 && (
            <span className="rounded-full bg-chakra-500 px-1.5 text-[11px] font-bold text-shadow-950 tabular-nums">
              {panelCount}
            </span>
          )}
        </button>

        <div
          id="store-filter-panel"
          className={cx(panelOpen ? "grid" : "hidden", "gap-5 border-t border-shadow-700 pt-4 md:grid")}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <fieldset className="min-w-0">
              <legend className={field.label}>Region</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={filters.region === null}
                  onClick={() => selectRegion(null)}
                  className={chip(filters.region === null)}
                >
                  All regions
                </button>
                {regionsInData.map(({ region, label }) => (
                  <button
                    key={region}
                    type="button"
                    aria-pressed={filters.region === region}
                    onClick={() => selectRegion(region)}
                    className={chip(filters.region === region)}
                  >
                    {label}
                    <span className="tabular-nums opacity-70">{regionCounts.get(region) ?? 0}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="store-country" className={field.label}>
                  Country
                </label>
                <select
                  id="store-country"
                  value={filters.country ?? ""}
                  onChange={(e) => setFilters({ country: e.target.value || null })}
                  className={cx(field.select, "mt-1.5")}
                >
                  <option value="">All countries</option>
                  {countryOptions.map(({ code, name }) => (
                    <option key={code} value={code}>
                      {name} ({countryCounts.get(code) ?? 0})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className={field.label} id="verified-only-label">
                  Verification
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={filters.verifiedOnly}
                  aria-labelledby="verified-only-label verified-only-text"
                  onClick={() => setFilters((current) => ({ verifiedOnly: !current.verifiedOnly }))}
                  className="mt-1.5 flex h-[38px] w-full items-center gap-3 rounded-md border border-shadow-700 bg-shadow-900 px-3 text-left text-sm text-ash-200 transition-colors hover:border-shadow-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      filters.verifiedOnly ? "bg-chakra-500" : "bg-shadow-500",
                    )}
                  >
                    <span
                      className={cx(
                        "h-4 w-4 rounded-full bg-white shadow transition-transform",
                        filters.verifiedOnly ? "translate-x-[18px]" : "translate-x-0.5",
                      )}
                    />
                  </span>
                  <span id="verified-only-text">Verified hosts only</span>
                </button>
                <p className={field.hint}>
                  {filters.verifiedOnly
                    ? pendingHidden > 0
                      ? `${pluralize(pendingHidden, "pending store")} hidden`
                      : "Pending stores are hidden"
                    : "Showing stores awaiting verification"}
                </p>
              </div>
            </div>
          </div>

          <fieldset className="min-w-0">
            <legend className={field.label}>Must offer</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {STORE_FEATURES.map(({ feature, label, icon: Icon }) => {
                const active = filters.features.includes(feature);
                return (
                  <button
                    key={feature}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleFeature(feature)}
                    className={chip(active)}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ash-400" aria-live="polite" aria-atomic="true">
          Showing <span className="font-semibold text-white tabular-nums">{results.length}</span> of{" "}
          <span className="tabular-nums">{pluralize(totalInScope, filters.verifiedOnly ? "verified store" : "store")}</span>
          {located && (
            <>
              {" "}
              {filters.radius > 0 ? `within ${filters.radius} ${filters.unit} of ` : "near "}
              <span className="text-ash-200">{filters.near}</span>
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {activeCount > 0 && (
            <button type="button" onClick={reset} className={button.ghost}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset filters
            </button>
          )}
          <div className="flex items-center gap-2">
            <label htmlFor="store-sort" className="text-sm text-ash-400">
              Sort
            </label>
            <div className="min-w-[10.5rem]">
              <select
                id="store-sort"
                value={filters.sort}
                onChange={(e) => setFilters({ sort: e.target.value as StoreSort })}
                className={field.select}
              >
                {(Object.keys(STORE_SORT_LABEL) as StoreSort[])
                  .filter((sort) => sort !== "distance" || located)
                  .map((sort) => (
                    <option key={sort} value={sort}>
                      {STORE_SORT_LABEL[sort]}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {eventsNearHref && (
        <Link
          href={eventsNearHref}
          className="flex items-center justify-between gap-3 rounded-lg border border-chakra-500/30 bg-chakra-500/5 px-4 py-3 text-sm text-ash-200 transition-colors hover:border-chakra-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-chakra-400" aria-hidden="true" />
            <span className="truncate">
              See all events near <span className="font-medium text-white">{filters.near}</span>
              <span className="hidden sm:inline">, including conventions</span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-chakra-400" aria-hidden="true" />
        </Link>
      )}

      {results.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Stores">
          {results.map(({ store, distance }) => (
            <li key={store.slug}>
              <StoreCard
                store={store}
                distanceLabel={distance !== null ? formatDistance(distance, filters.unit) : null}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={StoreIcon}
          title="No stores match your filters"
          description={
            located && filters.radius > 0 && nearest
              ? `Nothing within ${filters.radius} ${filters.unit} of ${filters.near}. The nearest match is ${nearest.store.name} in ${nearest.store.city}, ${formatDistance(nearest.distance ?? 0, filters.unit)} away.`
              : pendingHidden > 0
                ? `${pluralize(pendingHidden, "store")} awaiting verification ${pendingHidden === 1 ? "matches" : "match"} your search.`
                : "Try a broader search, another region or fewer features."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {located && filters.radius > 0 && nearest && (
                <button type="button" className={button.primary} onClick={() => setFilters({ radius: 0 })}>
                  Search any distance
                </button>
              )}
              {pendingHidden > 0 && (
                <button type="button" className={button.secondary} onClick={() => setFilters({ verifiedOnly: false })}>
                  Show pending stores
                </button>
              )}
              <button type="button" className={button.secondary} onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset filters
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}

function countBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}
