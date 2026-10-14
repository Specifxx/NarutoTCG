"use client";

import type { LeafletEventHandlerFnMap, Marker as LeafletMarker } from "leaflet";
import Link from "next/link";
import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Marker, Popup } from "react-leaflet";
import { eventTypeMeta } from "@/lib/event-meta";
import { pluralize } from "@/lib/format";
import { applyMarkerState, venueIcon, type MarkerState } from "./marker-icons";
import type { VenueGroup } from "./venue-groups";

const POPUP_EVENT_LIMIT = 4;

export interface VenueMarkerHandlers {
  onSelect: (key: string) => void;
  onDeselect: (key: string) => void;
  onHover: (key: string | null) => void;
  register: (key: string, marker: LeafletMarker) => void;
  unregister: (key: string, marker: LeafletMarker) => void;
}

/** One pin per venue; Leaflet opens the bound popup on click or Enter. */
export const VenueMarker = memo(function VenueMarker({
  venue,
  state,
  onSelect,
  onDeselect,
  onHover,
  register,
  unregister,
}: { venue: VenueGroup; state: MarkerState } & VenueMarkerHandlers) {
  const markerRef = useRef<LeafletMarker>(null);
  const { key } = venue;
  const count = venue.events.length;
  const label = `${venue.name}, ${venue.city}: ${pluralize(count, "event")}`;
  const icon = venueIcon(venue.primaryType, count);

  // Selection mirrors the popup: Leaflet opens it on click and on Enter (and the
  // list opens it programmatically), and a second click toggles it closed.
  const eventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      popupopen: () => onSelect(key),
      popupclose: () => onDeselect(key),
      mouseover: () => onHover(key),
      mouseout: () => onHover(null),
    }),
    [key, onSelect, onDeselect, onHover],
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    register(key, marker);
    return () => unregister(key, marker);
  }, [key, register, unregister]);

  // The icon element survives setIcon(), so these attributes and listeners persist across state changes.
  useEffect(() => {
    const element = markerRef.current?.getElement();
    if (!element) return;
    element.setAttribute("aria-label", label);
    const focus = () => onHover(key);
    const blur = () => onHover(null);
    element.addEventListener("focus", focus);
    element.addEventListener("blur", blur);
    return () => {
      element.removeEventListener("focus", focus);
      element.removeEventListener("blur", blur);
    };
  }, [key, label, onHover]);

  // Runs after react-leaflet's own update effect (a child), so it follows any setIcon().
  useEffect(() => {
    const element = markerRef.current?.getElement();
    if (element) applyMarkerState(element, state);
  }, [state, icon]);

  return (
    <Marker
      ref={markerRef}
      position={venue.location}
      icon={icon}
      title={venue.name}
      alt={venue.name}
      zIndexOffset={state === "selected" ? 2000 : state === "hover" ? 1000 : 0}
      eventHandlers={eventHandlers}
    >
      <Popup
        maxWidth={300}
        minWidth={240}
        autoPanPaddingTopLeft={[56, 64]}
        autoPanPaddingBottomRight={[56, 48]}
      >
        <VenuePopup venue={venue} />
      </Popup>
    </Marker>
  );
});

function VenuePopup({ venue }: { venue: VenueGroup }) {
  const shown = venue.events.slice(0, POPUP_EVENT_LIMIT);
  const more = venue.events.length - shown.length;

  return (
    <div className="ntcg-popup__body">
      <div className="ntcg-popup__head">
        <h3 className="ntcg-popup__venue">{venue.name}</h3>
        <div className="ntcg-popup__place">
          {venue.place} <span aria-hidden="true">{venue.flag}</span>
        </div>
      </div>
      <ul className="ntcg-popup__list">
        {shown.map((event) => {
          const meta = eventTypeMeta(event.type);
          return (
            <li key={event.id}>
              <Link href={`/events/${event.id}`} className="ntcg-popup__event">
                <span className="ntcg-popup__dot" style={{ "--dot": meta.hex } as CSSProperties} aria-hidden="true" />
                <span>
                  <span className="ntcg-popup__date">
                    {event.display.date}
                    {event.status !== "scheduled" && ` · ${event.status === "cancelled" ? "Cancelled" : "Postponed"}`}
                  </span>
                  <span
                    className={
                      event.status === "cancelled"
                        ? "ntcg-popup__title ntcg-popup__title--cancelled"
                        : "ntcg-popup__title"
                    }
                  >
                    {event.title}
                  </span>
                  <span className="sr-only">, {meta.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {(more > 0 || venue.storeSlug) && (
        <div className="ntcg-popup__foot">
          {more > 0 && (
            <Link href={`/events?${new URLSearchParams({ q: venue.name }).toString()}`} className="ntcg-popup__link">
              +{more} more
              <span className="sr-only"> at {venue.name}</span>
            </Link>
          )}
          {venue.storeSlug && (
            <Link href={`/store/${venue.storeSlug}`} className="ntcg-popup__link">
              Store page<span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
