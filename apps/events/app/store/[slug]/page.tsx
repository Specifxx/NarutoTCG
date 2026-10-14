import { ArrowRight, CalendarDays, CalendarPlus, ChevronDown, ChevronRight, History, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { EventCard } from "@/components/event-card";
import { absoluteUrl } from "@/components/event-detail/site-url";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { Container, SectionHeading } from "@/components/page-header";
import { OpeningHoursTable } from "@/components/stores/opening-hours-table";
import { StoreContact } from "@/components/stores/store-contact";
import { StoreFeatures } from "@/components/stores/store-features";
import { StoreHero } from "@/components/stores/store-hero";
import { StoreJsonLd } from "@/components/stores/store-json-ld";
import { getEventSummariesForStore, getStore, getStores } from "@/lib/data";
import type { EventSummary } from "@/lib/event-summary";
import { addressLines, cx, placeLabel, pluralize } from "@/lib/format";
import { weeklyHoursRows } from "@/lib/store-hours";
import { button, surface } from "@/lib/styles";
import { localeForRegion, zoneAbbreviation } from "@/lib/time";

export const revalidate = 3600;

const UPCOMING_LIMIT = 12;
/** Weekly nights repeat every week; cap each series so one-off events stay visible. */
const PER_SERIES_LIMIT = 3;
const RECENT_LIMIT = 3;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const stores = await getStores();
  return stores.map((store) => ({ slug: store.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Store not found", robots: { index: false } };

  const title = `${store.name} · ${store.address.city}`;
  const description = truncate(
    `${store.tagline ? `${store.tagline}. ` : ""}Naruto TCG ${store.verified ? "verified demo host" : "store"} in ${placeLabel(
      store.address,
    )}. ${store.description}`,
    200,
  );
  const path = storePath(store.slug);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Naruto TCG Events", title, description, url: path },
    twitter: { card: "summary", title, description },
  };
}

export default async function StorePage({ params }: PageProps) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const now = new Date();
  const nowMs = now.getTime();
  const events = await getEventSummariesForStore(store.slug);
  const upcomingAll = events.filter((e) => Date.parse(e.endsAt) > nowMs);
  const upcoming = limitPerSeries(upcomingAll, PER_SERIES_LIMIT, UPCOMING_LIMIT);
  const recent = events
    .filter((e) => Date.parse(e.endsAt) <= nowMs)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, RECENT_LIMIT);

  const locale = localeForRegion(store.region);
  const hoursRows = weeklyHoursRows(store.hours, locale);
  const zone = zoneAbbreviation(now, store.timeZone, locale);
  const directoryHref = `/events?${new URLSearchParams({ q: store.name }).toString()}`;
  const submitHref = `/events/submit?${new URLSearchParams({ store: store.slug }).toString()}`;
  const hiddenCount = upcomingAll.length - upcoming.length;

  return (
    <Container className="py-8 sm:py-10">
      <StoreJsonLd store={store} pageUrl={absoluteUrl(storePath(store.slug))} />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-ash-400">
          <li className="shrink-0">
            <Link href="/stores" className="hover:text-chakra-400">
              Stores
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span aria-current="page" className="truncate text-ash-200">
              {store.name}
            </span>
          </li>
        </ol>
      </nav>

      <StoreHero store={store} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* First in the DOM so phones see hours and contact details straight after the header. */}
        <aside aria-label="Hours and contact" className="space-y-4 lg:col-start-2 lg:row-start-1">
          <section aria-labelledby="store-hours-heading" className={surface.panel}>
            <h2 id="store-hours-heading" className="text-lg font-semibold text-white">
              Opening hours
            </h2>
            <OpeningHoursTable
              className="mt-3 -mx-1"
              rows={hoursRows}
              timeZone={store.timeZone}
              caption={`Opening hours, ${zone} (local time in ${store.address.city})`}
            />
            <p className="mt-3 border-t border-shadow-700 pt-3 text-xs text-ash-400">
              Times shown in <span className="font-medium text-ash-200">{zone}</span>, local time in{" "}
              {store.address.city}. Hours can change on holidays and event days.
            </p>
          </section>

          <StoreContact store={store} />
        </aside>

        <div className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="store-about-heading">
            <SectionHeading id="store-about-heading" title="About" />
            <p className="mt-3 max-w-prose leading-relaxed text-ash-200">{store.description}</p>
          </section>

          <StoreFeatures store={store} />

          <section aria-labelledby="store-upcoming-heading">
            <SectionHeading
              id="store-upcoming-heading"
              title="Upcoming events"
              description={
                upcomingAll.length
                  ? `${pluralize(upcomingAll.length, "event")} on the calendar${
                      hiddenCount > 0 ? ` · showing the next ${upcoming.length}` : ""
                    }`
                  : undefined
              }
            />
            {upcoming.length > 0 ? (
              <>
                <ul className="mt-4 grid gap-3">
                  {upcoming.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} showVenue={false} />
                    </li>
                  ))}
                </ul>
                <Link
                  href={directoryHref}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-chakra-400 hover:text-chakra-500 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  See all on the events directory
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <EmptyState
                className="mt-4"
                icon={CalendarDays}
                title="No upcoming events listed"
                description={`${store.name} hasn't published its next demo day or tournament yet. Follow the store or check back soon.`}
                action={
                  <Link href={submitHref} className={button.secondary}>
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Submit an event here
                  </Link>
                }
              />
            )}
          </section>

          {recent.length > 0 && (
            <section aria-labelledby="store-recent-heading">
              <SectionHeading id="store-recent-heading" title="Recent events" />
              <details className={cx(surface.card, "group mt-4")}>
                <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-medium text-ash-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 [&::-webkit-details-marker]:hidden">
                  <History className="h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
                  <span className="flex-1">Show the last {pluralize(recent.length, "event")} held here</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-ash-400 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="grid gap-3 border-t border-shadow-700 p-4">
                  {recent.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} past showVenue={false} />
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}

          <section aria-labelledby="store-location-heading">
            <SectionHeading id="store-location-heading" title="Location" />
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-start">
              <address className={cx(surface.panel, "flex items-start gap-3 not-italic")}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-chakra-400" aria-hidden="true" />
                <span className="text-sm leading-relaxed text-ash-200">
                  <span className="block font-semibold text-white">{store.name}</span>
                  {addressLines(store.address).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </address>
              <GoogleMapEmbed location={store.location} title={`Map of ${store.name}`} zoom={16} />
            </div>
          </section>

          <section
            aria-labelledby="store-cta-heading"
            className="relative overflow-hidden rounded-xl border border-chakra-500/40 bg-gradient-to-br from-chakra-500/15 via-shadow-900 to-shadow-900 p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <h2 id="store-cta-heading" className="text-lg font-semibold text-white">
                  Hosting a demo day here?
                </h2>
                <p className="mt-1 text-sm text-ash-200">
                  Store owners and organisers can list demo days, weekly nights and tournaments at {store.name}. New
                  listings are reviewed before they go live.
                </p>
              </div>
              <Link href={submitHref} className={cx(button.primary, "shrink-0")}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Submit an event
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}

function storePath(slug: string): string {
  return `/store/${encodeURIComponent(slug)}`;
}

/** Soonest-first events, at most `perSeries` per weekly series and `total` overall. */
function limitPerSeries(events: readonly EventSummary[], perSeries: number, total: number): EventSummary[] {
  const seen = new Map<string, number>();
  const out: EventSummary[] = [];
  for (const event of events) {
    if (event.seriesId) {
      const count = seen.get(event.seriesId) ?? 0;
      if (count >= perSeries) continue;
      seen.set(event.seriesId, count + 1);
    }
    out.push(event);
    if (out.length === total) break;
  }
  return out;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:–—-]+$/, "")}…`;
}
