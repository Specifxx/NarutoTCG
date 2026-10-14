import type { EventType } from "@naruto-tcg/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DirectoryHero } from "@/components/directory/directory-hero";
import { DirectorySkeleton } from "@/components/directory/directory-skeleton";
import { EventDirectory } from "@/components/directory/event-directory";
import { FeaturedEvents, pickFeatured } from "@/components/directory/featured-events";
import { DIRECTORY_ANCHOR_ID } from "@/components/directory/shared";
import { TypeTiles } from "@/components/directory/type-tiles";
import { Container } from "@/components/page-header";
import { getDirectoryStats, getEventSummaries } from "@/lib/data";
import { EVENT_TYPES } from "@/lib/event-meta";
import { applyEventFilters, DEFAULT_FILTERS } from "@/lib/filters";

const DESCRIPTION =
  "Find Naruto TCG premier demo days, convention showcases, weekly league nights, store championships and regionals near you — filter by type, date and distance.";

export const metadata: Metadata = {
  title: "Event directory",
  description: DESCRIPTION,
  alternates: { canonical: "/events" },
  // Next replaces (not merges) the layout's openGraph, so repeat siteName and type.
  openGraph: {
    type: "website",
    siteName: "Naruto TCG Events",
    title: "Find Naruto TCG events",
    description: DESCRIPTION,
    url: "/events",
  },
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Reading the query opts this route into per-request rendering, so the filtered
  // directory is server-rendered for any query string. The client directory reads
  // the same values through useSearchParams() and filters against the same `now`.
  await searchParams;
  const now = new Date();
  const [events, stats] = await Promise.all([getEventSummaries(), getDirectoryStats(now)]);

  // Exactly what the unfiltered list shows (upcoming, cancelled ones included), so the
  // hero and type-tile counts match the result count the directory and each tile's filter show.
  const listed = applyEventFilters(events, DEFAULT_FILTERS, now).map(({ event }) => event);
  const typeCounts = Object.fromEntries(EVENT_TYPES.map(({ type }) => [type, 0])) as Record<EventType, number>;
  for (const event of listed) typeCounts[event.type] += 1;

  return (
    <Container className="py-8 sm:py-10">
      <DirectoryHero listed={listed.length} stores={stats.stores} countries={stats.countries} />
      <TypeTiles counts={typeCounts} />
      <FeaturedEvents events={pickFeatured(listed.filter((event) => event.status !== "cancelled"))} />

      <div id={DIRECTORY_ANCHOR_ID} className="mt-10">
        <Suspense fallback={<DirectorySkeleton />}>
          <EventDirectory events={events} nowIso={now.toISOString()} />
        </Suspense>
      </div>
    </Container>
  );
}
