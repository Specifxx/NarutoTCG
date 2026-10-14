import { Map as MapIcon, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, PageHeader } from "@/components/page-header";
import { StoreDirectory } from "@/components/stores/store-directory";
import { StoreDirectoryFallback } from "@/components/stores/store-directory-fallback";
import { StoreStats } from "@/components/stores/store-stats";
import { getEventSummaries, getStores } from "@/lib/data";
import { groupEventsByStore, toStoreSummary } from "@/lib/store-summary";
import { button } from "@/lib/styles";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Store locator",
  description:
    "Find verified local game stores hosting Naruto TCG demo days, weekly play and store championships across North America, Europe and Oceania.",
  alternates: { canonical: "/stores" },
};

export default async function StoresPage() {
  const now = new Date();
  const [stores, events] = await Promise.all([getStores(), getEventSummaries()]);
  const eventsByStore = groupEventsByStore(events);
  const summaries = stores.map((store) => toStoreSummary(store, eventsByStore.get(store.slug) ?? [], now));

  const countries = new Set(stores.map((s) => s.address.country)).size;
  const verified = stores.filter((s) => s.verified).length;
  const upcomingHosted = summaries.reduce((sum, s) => sum + s.upcomingCount, 0);

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Local game stores"
        title="Store locator"
        description="Verified Naruto TCG demo hosts with official demo kits, trained staff and regular organised play. Search by city, ZIP or postcode to find your nearest table."
        actions={
          <>
            <Link href="/events/map" className={button.secondary}>
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              View events map
            </Link>
            <Link href="/events/submit" className={button.ghost}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              List an event
            </Link>
          </>
        }
      />

      <StoreStats
        className="mt-6"
        stats={[
          { label: "Stores listed", value: stores.length, icon: "stores" },
          { label: "Countries", value: countries, icon: "countries" },
          { label: "Verified hosts", value: verified, icon: "verified" },
          { label: "Upcoming store events", value: upcomingHosted, icon: "events" },
        ]}
      />

      <h2 className="sr-only">Find a store</h2>
      <div className="mt-8">
        <Suspense fallback={<StoreDirectoryFallback stores={summaries} />}>
          <StoreDirectory stores={summaries} />
        </Suspense>
      </div>
    </Container>
  );
}
