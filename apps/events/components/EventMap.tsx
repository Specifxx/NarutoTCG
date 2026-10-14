"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NarutoEvent } from "@naruto-tcg/types";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, formatDate } from "../lib/format";

interface Props {
  events: NarutoEvent[];
  center?: { lat: number; lng: number } | null;
  radiusMiles?: number | null;
  height?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function EventMap({ events, center, radiusMiles, height = "520px" }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { worldCopyJump: true }).setView([30, 0], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
      maxZoom: 18,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    for (const e of events) {
      const color = EVENT_TYPE_COLORS[e.type];
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #07070b;box-shadow:0 0 8px ${color}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([e.lat, e.lng], { icon })
        .bindPopup(
          `<strong>${esc(e.title)}</strong><br/>${esc(EVENT_TYPE_LABELS[e.type])}<br/>${esc(formatDate(e.startsAt))}<br/>${esc(e.city)}<br/><a href="/events/${esc(e.id)}">View details</a>`,
        )
        .addTo(g);
      pts.push([e.lat, e.lng]);
    }
    if (center && radiusMiles) {
      L.circle([center.lat, center.lng], { radius: radiusMiles * 1609.34, color: "#ff7a1a", weight: 1 }).addTo(g);
      m.fitBounds(L.latLng(center.lat, center.lng).toBounds(radiusMiles * 1609.34 * 2.2));
    } else if (pts.length) {
      m.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 6 });
    }
  }, [events, center, radiusMiles]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-lg border border-shadow-700" />;
}
