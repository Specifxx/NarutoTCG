import type { GeoPoint } from "@naruto-tcg/types";
import { Compass, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { EventCard } from "@/components/event-card";
import { SectionHeading } from "@/components/page-header";
import { DEFAULT_FILTERS, RADIUS_OPTIONS, serializeEventFilters } from "@/lib/filters";
import { formatDistance, type DistanceUnit } from "@/lib/geo";
import type { EventSummary } from "@/lib/event-summary";

export interface NearbyEvent {
  event: EventSummary;
  distance: number;
}

export function NearbyEvents({
  nearby,
  origin,
  city,
  unit,
  radius,
}: {
  nearby: NearbyEvent[];
  origin: GeoPoint;
  city: string;
  unit: DistanceUnit;
  /** Search radius in `unit`. */
  radius: number;
}) {
  const query = serializeEventFilters({
    ...DEFAULT_FILTERS,
    near: city,
    lat: origin.lat,
    lng: origin.lng,
    // Snap to a radius the directory's picker offers so the filter UI shows it selected.
    radius: RADIUS_OPTIONS.find((option) => option >= radius) ?? Math.round(radius),
    unit,
    sort: "distance",
  });

  return (
    <section aria-labelledby="nearby-heading">
      <SectionHeading
        id="nearby-heading"
        title="More events nearby"
        description={`Upcoming within ${formatDistance(radius, unit)} of this venue`}
        action={
          nearby.length > 0 ? (
            <Link
              href={`/events/map?${query}`}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-chakra-400 hover:text-chakra-500"
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              View on map
            </Link>
          ) : undefined
        }
      />
      {nearby.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Compass}
          title={`No other upcoming events near ${city}`}
          description="Try widening the search on the map, or check back as organisers add new dates."
          action={
            <Link
              href={`/events/map?${query}`}
              className="text-sm font-semibold text-chakra-400 hover:text-chakra-500"
            >
              Explore the map
            </Link>
          }
        />
      ) : (
        <div className="mt-4 grid gap-3">
          {nearby.map(({ event, distance }) => (
            <EventCard key={event.id} event={event} distanceLabel={formatDistance(distance, unit)} />
          ))}
        </div>
      )}
    </section>
  );
}
