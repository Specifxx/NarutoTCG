"use client";

import type { EventType } from "@naruto-tcg/types";
import { List, Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterBar } from "@/components/directory/filter-bar";
import { prefersReducedMotion } from "@/components/directory/shared";
import type { EventSummary } from "@/lib/event-summary";
import { applyEventFilters, countActiveFilters, serializeEventFilters } from "@/lib/filters";
import { cx } from "@/lib/format";
import { toKm } from "@/lib/geo";
import { button } from "@/lib/styles";
import { useEventFilters } from "@/lib/use-event-filters";
import { MapSkeleton, mapLayout } from "./map-skeleton";
import { countByType, groupByVenue, venueGroupId, type FocusRequest, type MapOrigin } from "./venue-groups";
import { VenueList } from "./venue-list";

const EventMap = dynamic(() => import("./event-map"), { ssr: false, loading: () => <MapSkeleton /> });

/** Matches Tailwind's `lg` breakpoint, where the list scrolls in its own sidebar beside the map. */
const SPLIT_LAYOUT_QUERY = "(min-width: 64rem)";

interface Selection {
  key: string;
  source: "list" | "map";
}

/**
 * Interactive event map: URL-backed filters and a venue-grouped list in the
 * sidebar, Leaflet map beside it. Filtering runs against `nowIso` (the request
 * time) so the server render and hydration agree for any query string.
 */
export function MapExplorer({ events, nowIso }: { events: EventSummary[]; nowIso: string }) {
  const { filters, setFilters, resetFilters, hrefWithFilters } = useEventFilters();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const results = useMemo(() => applyEventFilters(events, filters, now), [events, filters, now]);
  const venues = useMemo(() => groupByVenue(results), [results]);
  // Legend counts ignore the type filter so each entry shows what toggling it would add.
  const typeCounts = useMemo(
    () => countByType(filters.types.length ? applyEventFilters(events, { ...filters, types: [] }, now) : results),
    [events, filters, now, results],
  );

  // List paging restarts whenever the narrowing filters or sort change.
  const listKey = useMemo(() => serializeEventFilters({ ...filters, view: "list", month: null }), [filters]);

  const { lat, lng, near, radius, unit } = filters;
  const origin = useMemo<MapOrigin | null>(
    () =>
      lat !== null && lng !== null
        ? { lat, lng, label: near ?? "Selected location", radiusMeters: toKm(radius, unit) * 1000 }
        : null,
    [lat, lng, near, radius, unit],
  );

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const focusNonce = useRef(0);

  // Hover/selection may outlive a venue that the filters just removed; ignore stale keys.
  const venueKeys = useMemo(() => new Set(venues.map((v) => v.key)), [venues]);
  const selectedKey = selection && venueKeys.has(selection.key) ? selection.key : null;
  const activeHoverKey = hoveredKey && venueKeys.has(hoveredKey) ? hoveredKey : null;

  // A removed pin takes its popup with it without a `popupclose` reaching us (its handlers
  // detach first), so drop the selection too — otherwise the venue would come back "selected".
  useEffect(() => {
    if (selection && !venueKeys.has(selection.key)) setSelection(null);
  }, [selection, venueKeys]);

  const selectFromList = useCallback((key: string) => {
    setSelection({ key, source: "list" });
    focusNonce.current += 1;
    setFocusRequest({ key, nonce: focusNonce.current });
  }, []);
  // Fired when a pin's popup opens — including the one opened for a list pick, which keeps its "list" source.
  const selectFromMap = useCallback(
    (key: string) => setSelection((current) => (current?.key === key ? current : { key, source: "map" })),
    [],
  );
  const deselect = useCallback((key: string) => setSelection((current) => (current?.key === key ? null : current)), []);
  const toggleType = useCallback(
    (type: EventType) =>
      setFilters((current) => ({
        types: current.types.includes(type) ? current.types.filter((t) => t !== type) : [...current.types, type],
      })),
    [setFilters],
  );

  // A pin picked on the map reveals its group in the sidebar. Only in the split
  // layout: on small screens the list sits below the map and scrolling the page
  // would carry the open popup out of view.
  useEffect(() => {
    if (!selection || selection.source !== "map") return;
    if (!window.matchMedia(SPLIT_LAYOUT_QUERY).matches) return;
    document
      .getElementById(venueGroupId(selection.key))
      ?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selection]);

  return (
    <div className={mapLayout.root}>
      <div className={mapLayout.title}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-chakra-500/30 bg-chakra-500/10 text-chakra-400 shadow-[0_0_24px_-6px_rgb(242_92_0/0.5)]">
          <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight tracking-tight text-white">Event map</h1>
          <p className="truncate text-xs text-ash-400">Demo days to regionals</p>
        </div>
        <Link href={hrefWithFilters("/events")} className={cx(button.secondary, "ml-auto shrink-0 px-3 py-1.5 text-xs")}>
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          List view
        </Link>
      </div>

      <div className={mapLayout.map}>
        <EventMap
          venues={venues}
          origin={origin}
          hoveredKey={activeHoverKey}
          selectedKey={selectedKey}
          focusRequest={focusRequest}
          typeCounts={typeCounts}
          activeTypes={filters.types}
          hasActiveFilters={countActiveFilters(filters) > 0}
          onHover={setHoveredKey}
          onSelect={selectFromMap}
          onDeselect={deselect}
          onToggleType={toggleType}
          onReset={resetFilters}
        />
      </div>

      <div className={mapLayout.sidebar}>
        <FilterBar variant="compact" resultCount={results.length} />
        <VenueList
          key={listKey}
          venues={venues}
          eventCount={results.length}
          unit={filters.unit}
          hoveredKey={activeHoverKey}
          selectedKey={selectedKey}
          onHover={setHoveredKey}
          onSelect={selectFromList}
        />
      </div>
    </div>
  );
}
