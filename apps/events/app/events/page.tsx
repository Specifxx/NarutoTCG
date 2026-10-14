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
import { isPast } from "@/lib/event-summary";

const DESCRIPTION =
  "Find Naruto TCG premier demo days, convention showcases, weekly league nights, store championships and regionals near you — filter by type, date and distance.";

export const metadata: Metadata = {
  title: "Event directory",
  description: DESCRIPTION,
  alternates: { canonical: "/events" },
  openGraph: { title: "Find Naruto TCG events", description: DESCRIPTION, url: "/events" },
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

  const upcoming = events.filter((event) => event.status !== "cancelled" && !isPast(event, now));
  const typeCounts = Object.fromEntries(EVENT_TYPES.map(({ type }) => [type, 0])) as Record<EventType, number>;
  for (const event of upcoming) typeCounts[event.type] += 1;

  return (
    <Container className="py-8 sm:py-10">
      <DirectoryHero stats={stats} />
      <TypeTiles counts={typeCounts} />
      <FeaturedEvents events={pickFeatured(upcoming)} />

      <div id={DIRECTORY_ANCHOR_ID} className="mt-10 scroll-mt-20">
        <Suspense fallback={<DirectorySkeleton />}>
          <EventDirectory events={events} nowIso={now.toISOString()} />
        </Suspense>
      </div>
    </Container>
  );
}
