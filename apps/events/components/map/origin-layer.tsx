"use client";

import type { LatLngTuple, PathOptions } from "leaflet";
import { useMemo } from "react";
import { Circle, Marker, Tooltip } from "react-leaflet";
import { originIcon } from "./marker-icons";
import type { MapOrigin } from "./venue-groups";

const RADIUS_STYLE: PathOptions = {
  color: "#ff7a1a",
  weight: 1.5,
  opacity: 0.85,
  dashArray: "6 7",
  fillColor: "#f25c00",
  fillOpacity: 0.06,
};

/** Search origin crosshair plus the dashed search-radius circle. */
export function OriginLayer({ origin }: { origin: MapOrigin }) {
  const center = useMemo((): LatLngTuple => [origin.lat, origin.lng], [origin.lat, origin.lng]);

  return (
    <>
      <Circle center={center} radius={origin.radiusMeters} pathOptions={RADIUS_STYLE} interactive={false} />
      <Marker
        position={center}
        icon={originIcon()}
        title={origin.label}
        alt={origin.label}
        interactive={false}
        keyboard={false}
        zIndexOffset={-1000}
      >
        <Tooltip permanent direction="top" offset={[0, -4]} className="ntcg-origin-tip">
          {origin.label}
        </Tooltip>
      </Marker>
    </>
  );
}
