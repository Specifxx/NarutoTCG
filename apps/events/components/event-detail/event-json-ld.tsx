import type { EventStatus, TcgEvent } from "@naruto-tcg/types";
import { isFull } from "@/lib/registrations";
import { isoWithOffset } from "./event-dates";

const SCHEMA = "https://schema.org";

const STATUS: Record<EventStatus, string> = {
  scheduled: `${SCHEMA}/EventScheduled`,
  postponed: `${SCHEMA}/EventPostponed`,
  cancelled: `${SCHEMA}/EventCancelled`,
};

/** schema.org Event structured data for search engines. `pageUrl` must be absolute. */
export function EventJsonLd({ event, pageUrl }: { event: TcgEvent; pageUrl: string }) {
  const { venue, organizer } = event;
  const data = {
    "@context": SCHEMA,
    "@type": "Event",
    name: event.title,
    description: event.description,
    url: pageUrl,
    startDate: isoWithOffset(event.startsAt, event.timeZone),
    endDate: isoWithOffset(event.endsAt, event.timeZone),
    eventStatus: STATUS[event.status],
    eventAttendanceMode: `${SCHEMA}/OfflineEventAttendanceMode`,
    location: {
      "@type": "Place",
      name: venue.hall ? `${venue.name}, ${venue.hall}` : venue.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: [venue.address.line1, venue.address.line2].filter(Boolean).join(", "),
        addressLocality: venue.address.city,
        ...(venue.address.region ? { addressRegion: venue.address.region } : {}),
        ...(venue.address.postalCode ? { postalCode: venue.address.postalCode } : {}),
        addressCountry: venue.address.country,
      },
      geo: { "@type": "GeoCoordinates", latitude: venue.location.lat, longitude: venue.location.lng },
    },
    offers: {
      "@type": "Offer",
      price: event.entryFee.amount,
      priceCurrency: event.entryFee.currency,
      availability: `${SCHEMA}/${isFull(event.capacity, event.registeredCount) ? "SoldOut" : "InStock"}`,
      url: event.registration.method === "external" && event.registration.url ? event.registration.url : pageUrl,
      ...(event.registration.opensAt ? { validFrom: isoWithOffset(event.registration.opensAt, event.timeZone) } : {}),
    },
    organizer: {
      "@type": "Organization",
      name: organizer.name,
      ...(organizer.website ? { url: organizer.website } : {}),
      ...(organizer.email ? { email: organizer.email } : {}),
      ...(organizer.phone ? { telephone: organizer.phone } : {}),
    },
    ...(event.capacity !== null ? { maximumAttendeeCapacity: event.capacity } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so a value containing "</script>" can't break out of the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
