"use client";

import "leaflet/dist/leaflet.css";
import "./leaflet-theme.css";

import type { EventType } from "@naruto-tcg/types";
import type { LatLngBoundsExpression, Marker as LeafletMarker } from "leaflet";
import { useCallback, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import { pluralize } from "@/lib/format";
import { FitController, FocusController, MapLabel, ResizeWatcher, WORLD_CENTER, WORLD_ZOOM } from "./map-controllers";
import { MapLegend } from "./map-legend";
import { EmptyMapOverlay, FitResultsButton, MapVignette } from "./map-overlays";
import type { MarkerState } from "./marker-icons";
import { OriginLayer } from "./origin-layer";
import type { FocusRequest, MapOrigin, VenueGroup } from "./venue-groups";
import { VenueMarker } from "./venue-marker";
import { BASEMAP } from "./tile-config";

const MAX_BOUNDS: LatLngBoundsExpression = [
  [-85, -200],
  [85, 200],
];

export interface EventMapProps {
  venues: VenueGroup[];
  origin: MapOrigin | null;
  hoveredKey: string | null;
  selectedKey: string | null;
  focusRequest: FocusRequest | null;
  typeCounts: Record<EventType, number>;
  activeTypes: readonly EventType[];
  hasActiveFilters: boolean;
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
  onDeselect: (key: string) => void;
  onToggleType: (type: EventType) => void;
  onReset: () => void;
}

/**
 * Leaflet map of venue pins. Client-only: load it through `next/dynamic` with
 * `ssr: false`. The MapContainer mounts once; everything that changes with the
 * filters is a child layer or a `useMap()` controller.
 */
export default function EventMap({
  venues,
  origin,
  hoveredKey,
  selectedKey,
  focusRequest,
  typeCounts,
  activeTypes,
  hasActiveFilters,
  onHover,
  onSelect,
  onDeselect,
  onToggleType,
  onReset,
}: EventMapProps) {
  const markers = useRef(new Map<string, LeafletMarker>());
  const [fitNonce, setFitNonce] = useState(0);

  const register = useCallback((key: string, marker: LeafletMarker) => {
    markers.current.set(key, marker);
  }, []);
  const unregister = useCallback((key: string, marker: LeafletMarker) => {
    if (markers.current.get(key) === marker) markers.current.delete(key);
  }, []);

  // Refit only when the set of venues or the search area changes — not on order, hover or selection.
  const fitKey = useMemo(() => {
    const keys = venues.map((v) => v.key).sort().join("|");
    const area = origin ? `${origin.lat},${origin.lng},${origin.radiusMeters}` : "";
    return `${keys}#${area}`;
  }, [venues, origin]);

  const stateOf = (key: string): MarkerState =>
    key === selectedKey ? "selected" : key === hoveredKey ? "hover" : "idle";

  return (
    <div className="relative isolate h-full w-full overflow-hidden bg-shadow-950">
      <MapContainer
        className="ntcg-map h-full w-full"
        center={WORLD_CENTER}
        zoom={WORLD_ZOOM}
        minZoom={2}
        maxZoom={19}
        worldCopyJump
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
      >
        <TileLayer
          url={BASEMAP.base.url}
          attribution={BASEMAP.base.attribution}
          {...(BASEMAP.base.subdomains ? { subdomains: BASEMAP.base.subdomains } : {})}
          maxNativeZoom={BASEMAP.base.maxNativeZoom}
          maxZoom={19}
        />
        {BASEMAP.labels && (
          <TileLayer url={BASEMAP.labels.url} maxNativeZoom={BASEMAP.labels.maxNativeZoom} maxZoom={19} />
        )}
        <ZoomControl position="topright" />
        <MapLabel label={`Map of ${pluralize(venues.length, "venue")}`} />
        <ResizeWatcher />
        <FitController venues={venues} origin={origin} fitKey={fitKey} fitNonce={fitNonce} />
        <FocusController request={focusRequest} markers={markers} />
        {origin && <OriginLayer origin={origin} />}
        {venues.map((venue) => (
          <VenueMarker
            key={venue.key}
            venue={venue}
            state={stateOf(venue.key)}
            onSelect={onSelect}
            onDeselect={onDeselect}
            onHover={onHover}
            register={register}
            unregister={unregister}
          />
        ))}
      </MapContainer>

      <MapVignette />
      <FitResultsButton onClick={() => setFitNonce((n) => n + 1)} />
      <MapLegend counts={typeCounts} activeTypes={activeTypes} onToggle={onToggleType} />
      {venues.length === 0 && <EmptyMapOverlay hasActiveFilters={hasActiveFilters} onReset={onReset} />}
    </div>
  );
}
