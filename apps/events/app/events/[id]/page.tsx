import type { TcgEvent } from "@naruto-tcg/types";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AboutSection } from "@/components/event-detail/about-section";
import { eventCalendarEntry } from "@/lib/event-calendar";
import { eventDateLabels } from "@/components/event-detail/event-dates";
import { EventHero } from "@/components/event-detail/event-hero";
import { EventJsonLd } from "@/components/event-detail/event-json-ld";
import { LocationSection } from "@/components/event-detail/location-section";
import { NearbyEvents, type NearbyEvent } from "@/components/event-detail/nearby-events";
import { OrganizerCard } from "@/components/event-detail/organizer-card";
import { PlayersSection } from "@/components/event-detail/players-section";
import { PrizesSection } from "@/components/event-detail/prizes-section";
import { RegisterPanel } from "@/components/event-detail/register-panel";
import { ScheduleCard } from "@/components/event-detail/schedule-card";
import { SeriesDates } from "@/components/event-detail/series-dates";
import { absoluteUrl, eventPath } from "@/lib/site";
import { StatusBanner } from "@/components/event-detail/status-banner";
import { Container } from "@/components/page-header";
import {
  getEvent,
  getEvents,
  getSeriesSummaries,
  getStore,
  getUpcomingEventSummaries,
} from "@/lib/data";
import { eventTypeMeta } from "@/lib/event-meta";
import type { EventSummary } from "@/lib/event-summary";
import { countryName, formatMoney, placeLabel } from "@/lib/format";
import { distanceIn, haversineKm, toKm, type DistanceUnit } from "@/lib/geo";
import { REGISTRATION_COUNTRIES } from "@/lib/registrations";

export const revalidate = 3600;
export const dynamicParams = true;

const NEARBY_RADIUS_KM = 150;
const NEARBY_LIMIT = 4;
/** Countries whose players think in miles. */
const MILE_COUNTRIES = new Set(["US", "GB", "LR", "MM"]);

const COUNTRY_OPTIONS = REGISTRATION_COUNTRIES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
  a.name.localeCompare(b.name, "en"),
);

type PageProps = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((event) => ({ id: event.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "Event not found", robots: { index: false } };

  const dates = eventDateLabels(event);
  const title = event.status === "cancelled" ? `Cancelled: ${event.title}` : event.title;
  const description = truncate(
    `${dates.dateSpan} · ${event.venue.name}, ${placeLabel(event.venue.address)}. ${event.description}`,
    200,
  );
  const path = eventPath(event.id);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Naruto TCG Events", title, description, url: path },
    twitter: { card: "summary", title, description },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const now = new Date();
  const dates = eventDateLabels(event);
  const path = eventPath(event.id);
  const pageUrl = absoluteUrl(path);
  const typeMeta = eventTypeMeta(event.type);
  const unit: DistanceUnit = MILE_COUNTRIES.has(event.venue.address.country) ? "mi" : "km";
  const storeSlug = event.venue.storeSlug ?? event.organizer.storeSlug;

  const [upcoming, series, store] = await Promise.all([
    getUpcomingEventSummaries({ now }),
    event.seriesId ? getSeriesSummaries(event.seriesId) : Promise.resolve([]),
    storeSlug ? getStore(storeSlug) : Promise.resolve(undefined),
  ]);

  const siblings = series.filter((s) => s.id !== event.id && Date.parse(s.endsAt) > now.getTime());
  const nearby = findNearby(event, upcoming, unit);

  return (
    <Container className="py-8 sm:py-10">
      <EventJsonLd event={event} pageUrl={pageUrl} />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-ash-400">
          <li className="shrink-0">
            <Link href="/events" className="hover:text-chakra-400">
              Events
            </Link>
          </li>
          <li className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href={`/events?type=${event.type}`} className="hover:text-chakra-400">
              {typeMeta.label}
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span aria-current="page" className="truncate text-ash-200">
              {event.title}
            </span>
          </li>
        </ol>
      </nav>

      <StatusBanner status={event.status} organizerName={event.organizer.name} />
      <EventHero event={event} dates={dates} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* First in the DOM so phones reach the call to action straight after the hero. */}
        <aside aria-label="Registration and schedule" className="lg:col-start-2 lg:row-start-1">
          {/* Sticky only when the viewport is tall enough to show the whole sidebar. */}
          <div className="space-y-4 lg:[@media(min-height:46rem)]:sticky lg:[@media(min-height:46rem)]:top-20">
            <RegisterPanel
              eventId={event.id}
              eventTitle={event.title}
              eventMeta={`${dates.dateSpan} · ${event.venue.name}`}
              schedule={{
                status: event.status,
                startsAt: event.startsAt,
                endsAt: event.endsAt,
                opensAt: event.registration.opensAt,
                closesAt: event.registration.closesAt,
              }}
              method={event.registration.method}
              externalUrl={event.registration.url}
              fee={formatMoney(event.entryFee)}
              capacity={event.capacity}
              registeredCount={event.registeredCount}
              opensLabel={dates.opens}
              closesLabel={dates.closes}
              inStore={{
                venueName: event.venue.name,
                storeHref: event.venue.storeSlug ? `/store/${event.venue.storeSlug}` : undefined,
                phone: store?.contact.phone ?? event.organizer.phone,
              }}
              countries={COUNTRY_OPTIONS}
            />
            <ScheduleCard
              event={event}
              entry={eventCalendarEntry(event, pageUrl)}
              path={path}
              shareText={`${event.title} — ${dates.dateSpan} at ${event.venue.name}, ${event.venue.address.city}`}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1">
          <AboutSection event={event} />
          <PrizesSection prizes={event.prizes} />
          <PlayersSection
            participants={event.participants}
            registeredCount={event.registeredCount}
            capacity={event.capacity}
          />
          <OrganizerCard organizer={event.organizer} />
          <LocationSection venue={event.venue} />
          {event.seriesId && (
            <SeriesDates
              siblings={siblings}
              weekday={dates.weekdayLong}
              timeRange={dates.timeRange}
              storeSlug={event.venue.storeSlug}
            />
          )}
          <NearbyEvents
            nearby={nearby}
            origin={event.venue.location}
            city={event.venue.address.city}
            unit={unit}
            radius={NEARBY_RADIUS_KM / toKm(1, unit)}
          />
        </div>
      </div>
    </Container>
  );
}

/**
 * Soonest upcoming events within NEARBY_RADIUS_KM, skipping this event's own series
 * (listed separately) and showing at most one date per other weekly series.
 */
function findNearby(event: TcgEvent, upcoming: EventSummary[], unit: DistanceUnit): NearbyEvent[] {
  const seenSeries = new Set<string>();
  const out: NearbyEvent[] = [];
  for (const candidate of upcoming) {
    if (candidate.id === event.id) continue;
    if (event.seriesId && candidate.seriesId === event.seriesId) continue;
    if (haversineKm(event.venue.location, candidate.venue.location) > NEARBY_RADIUS_KM) continue;
    const seriesKey = candidate.seriesId ?? candidate.id;
    if (seenSeries.has(seriesKey)) continue;
    seenSeries.add(seriesKey);
    out.push({ event: candidate, distance: distanceIn(event.venue.location, candidate.venue.location, unit) });
    if (out.length === NEARBY_LIMIT) break;
  }
  return out;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:–—-]+$/, "")}…`;
}
