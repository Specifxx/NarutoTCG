import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map/map-explorer";
import { MapPageSkeleton } from "@/components/map/map-skeleton";
import { getEventSummaries } from "@/lib/data";

const DESCRIPTION =
  "Explore Naruto TCG demo days, league nights, store championships and regionals on an interactive world map — filter by type, date and distance.";

export const metadata: Metadata = {
  title: "Event map",
  description: DESCRIPTION,
  alternates: { canonical: "/events/map" },
  openGraph: { title: "Naruto TCG event map", description: DESCRIPTION, url: "/events/map" },
};

export default async function EventMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Reading the query makes this route per-request, so the filtered sidebar is
  // server-rendered for any query string; the client filters against the same `now`.
  await searchParams;
  const now = new Date();
  const events = await getEventSummaries();

  return (
    <Suspense fallback={<MapPageSkeleton />}>
      <MapExplorer events={events} nowIso={now.toISOString()} />
    </Suspense>
  );
}
