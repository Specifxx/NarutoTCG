"use client";

import { latLng, latLngBounds, type LatLngBounds, type LatLngTuple, type Map as LeafletMap, type Marker } from "leaflet";
import { useEffect, useRef, type RefObject } from "react";
import { useMap } from "react-leaflet";
import { prefersReducedMotion } from "@/components/directory/shared";
import type { FocusRequest, MapOrigin, VenueGroup } from "./venue-groups";

export const WORLD_CENTER: LatLngTuple = [24, 10];
export const WORLD_ZOOM = 2;
const FIT_PADDING: [number, number] = [48, 48];
const FIT_MAX_ZOOM = 12;
/** Zoom used when flying to a venue picked in the list (unless already closer). */
const FOCUS_ZOOM = 11;

function hasSize(map: LeafletMap): boolean {
  const size = map.getSize();
  return size.x > 0 && size.y > 0;
}

/** Bounds that frame the results (plus the search origin), or the search circle when nothing matched. */
function fitTarget(venues: VenueGroup[], origin: MapOrigin | null): LatLngBounds | null {
  if (venues.length > 0) {
    const bounds = latLngBounds(venues.map((v): LatLngTuple => [v.location.lat, v.location.lng]));
    if (origin) bounds.extend([origin.lat, origin.lng]);
    return bounds;
  }
  if (origin) return latLng(origin.lat, origin.lng).toBounds(origin.radiusMeters * 2);
  return null;
}

function fitsAtMinZoom(map: LeafletMap, bounds: LatLngBounds): boolean {
  const zoom = map.getMinZoom();
  const nw = map.project(bounds.getNorthWest(), zoom);
  const se = map.project(bounds.getSouthEast(), zoom);
  const size = map.getSize();
  return se.x - nw.x + FIT_PADDING[0] * 2 <= size.x && se.y - nw.y + FIT_PADDING[1] * 2 <= size.y;
}

function centroid(venues: VenueGroup[]): LatLngTuple {
  let lat = 0;
  let lng = 0;
  for (const { location } of venues) {
    lat += location.lat;
    lng += location.lng;
  }
  return [lat / venues.length, lng / venues.length];
}

/**
 * Frames the results whenever the set of venues or the search area changes
 * (`fitKey`), or when "Fit results" bumps `fitNonce`. Hover and selection never
 * refit. The first fit is instant so the map doesn't sweep in from the world view.
 */
export function FitController({
  venues,
  origin,
  fitKey,
  fitNonce,
}: {
  venues: VenueGroup[];
  origin: MapOrigin | null;
  fitKey: string;
  fitNonce: number;
}) {
  const map = useMap();
  const initial = useRef(true);
  // Latest props for the fit effect, which must re-run only when `fitKey`/`fitNonce` change.
  // Synced in an effect declared first, so it has run by the time the fit effect reads it.
  const latest = useRef({ venues, origin });
  useEffect(() => {
    latest.current = { venues, origin };
  });

  useEffect(() => {
    map.whenReady(() => {
      const animate = !initial.current && !prefersReducedMotion() && hasSize(map);
      initial.current = false;
      const { venues: currentVenues, origin: currentOrigin } = latest.current;
      const target = fitTarget(currentVenues, currentOrigin);
      map.stop();
      if (!target) {
        map.setView(WORLD_CENTER, WORLD_ZOOM, { animate });
      } else if (!fitsAtMinZoom(map, target) && currentVenues.length > 0) {
        // Narrow screens can't show a global spread even fully zoomed out; centre on
        // where the venues are rather than the bounds midpoint (often open ocean).
        map.setView(centroid(currentVenues), map.getMinZoom(), { animate });
      } else if (animate) {
        map.flyToBounds(target, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration: 0.8 });
      } else {
        map.fitBounds(target, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, animate: false });
      }
    });
  }, [map, fitKey, fitNonce]);

  return null;
}

/**
 * Flies to a venue picked in the sidebar and opens its popup once the map has
 * settled (opening mid-flight would fight the popup's auto-pan).
 */
export function FocusController({
  request,
  markers,
}: {
  request: FocusRequest | null;
  markers: RefObject<Map<string, Marker>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    let pending: (() => void) | null = null;

    map.whenReady(() => {
      const marker = markers.current.get(request.key);
      if (cancelled || !marker) return;
      const target = marker.getLatLng();
      const open = () => {
        pending = null;
        if (!cancelled && map.hasLayer(marker)) marker.openPopup();
      };

      const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);
      if (map.getZoom() >= FOCUS_ZOOM && map.getBounds().pad(-0.15).contains(target)) {
        open();
      } else if (prefersReducedMotion() || !hasSize(map)) {
        map.setView(target, zoom, { animate: false });
        open();
      } else {
        pending = open;
        map.once("moveend", open);
        map.flyTo(target, zoom, { duration: 0.9 });
      }
    });

    return () => {
      cancelled = true;
      if (pending) map.off("moveend", pending);
    };
  }, [map, request, markers]);

  return null;
}

/** Leaflet only watches the window; also re-measure when the container itself resizes. */
export function ResizeWatcher() {
  const map = useMap();

  useEffect(() => {
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(map.getContainer());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

/** Names the (focusable) Leaflet container for assistive tech. */
export function MapLabel({ label }: { label: string }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute("aria-roledescription", "map");
    container.setAttribute("aria-label", label);
  }, [map, label]);

  return null;
}
