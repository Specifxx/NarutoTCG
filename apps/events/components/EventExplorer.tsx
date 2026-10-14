"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { List, Map as MapIcon, Search } from "lucide-react";
import type { EventType, NarutoEvent } from "@naruto-tcg/types";
import { Button } from "@naruto-tcg/ui";
import { distanceMiles, lookupPlace, type Place } from "../lib/geo";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, EVENT_TYPES } from "../lib/format";
import { EventCard } from "./EventCard";

const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: () => <div className="h-[520px] animate-pulse rounded-lg bg-shadow-800" />,
});

const field =
  "w-full rounded-md border border-shadow-700 bg-shadow-900 px-3 py-2 text-sm text-ash-200 focus:border-chakra-400 focus:outline-none";

export function EventExplorer({ events, view }: { events: NarutoEvent[]; view: "list" | "map" }) {
  const [types, setTypes] = useState<Set<EventType>>(new Set());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [where, setWhere] = useState("");
  const [radius, setRadius] = useState(50);
  const [place, setPlace] = useState<Place | null>(null);
  const [error, setError] = useState("");

  const toggle = (t: EventType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const applyLocation = () => {
    if (!where.trim()) {
      setPlace(null);
      setError("");
      return;
    }
    const p = lookupPlace(where);
    setPlace(p);
    setError(p ? "" : "Location not found. Try a city (e.g. Austin, London) or ZIP (e.g. 10001, 90012).");
  };

  const results = useMemo(() => {
    return events
      .map((e) => ({ e, d: place ? distanceMiles(place, e) : undefined }))
      .filter(({ e, d }) => {
        if (types.size && !types.has(e.type)) return false;
        const day = e.startsAt.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (d !== undefined && d > radius) return false;
        return true;
      })
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0) || a.e.startsAt.localeCompare(b.e.startsAt));
  }, [events, types, from, to, place, radius]);

  const shown = results.map((r) => r.e);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="flex gap-2">
          <Link
            href="/events"
            className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${view === "list" ? "border-chakra-500 text-chakra-400" : "border-shadow-700 text-ash-400"}`}
          >
            <List size={14} /> List
          </Link>
          <Link
            href="/events/map"
            className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${view === "map" ? "border-chakra-500 text-chakra-400" : "border-shadow-700 text-ash-400"}`}
          >
            <MapIcon size={14} /> Map
          </Link>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ash-400">Event type</legend>
          {EVENT_TYPES.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={types.has(t)}
                onChange={() => toggle(t)}
                className="accent-[#ff7a1a]"
              />
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: EVENT_TYPE_COLORS[t] }} />
              {EVENT_TYPE_LABELS[t]}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ash-400">Date range</legend>
          <input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
          <input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ash-400">Near me</legend>
          <input
            aria-label="ZIP or city"
            placeholder="ZIP or city"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyLocation()}
            className={field}
          />
          <label className="flex items-center gap-3 text-sm text-ash-400">
            Within
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 accent-[#ff7a1a]"
            />
            {radius} mi
          </label>
          <Button type="button" onClick={applyLocation} className="flex w-full items-center justify-center gap-2">
            <Search size={14} /> Find events
          </Button>
          {error && <p className="text-xs text-blood-500">{error}</p>}
          {place && <p className="text-xs text-ash-400">Showing events within {radius} miles of {place.label}.</p>}
        </fieldset>
      </aside>

      <section className="space-y-6">
        <p className="text-sm text-ash-400" aria-live="polite">
          {shown.length} event{shown.length === 1 ? "" : "s"}
        </p>
        {view === "map" && <EventMap events={shown} center={place} radiusMiles={place ? radius : null} />}
        {shown.length === 0 ? (
          <p className="rounded-lg border border-shadow-700 p-8 text-center text-ash-400">
            No events match these filters.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map(({ e, d }) => (
              <EventCard key={e.id} event={e} distance={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
