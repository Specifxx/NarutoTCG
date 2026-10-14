import type { Metadata } from "next";
import { latestResults, overviewKpis } from "@/components/home/events";
import { pickFeaturedDecks } from "@/components/home/featured";
import { FeaturedDecks } from "@/components/home/featured-decks";
import { OverviewHero } from "@/components/home/hero";
import { KpiRow } from "@/components/home/kpi-row";
import { LatestResults } from "@/components/home/latest-results";
import { MethodologyTeaser } from "@/components/home/methodology-teaser";
import { OrganizerPanel } from "@/components/home/organizer-panel";
import { TierSnapshot } from "@/components/home/tier-snapshot";
import { tierHighlights } from "@/components/home/tiers";
import { PageContainer } from "@/components/ui/page-header";
import { getSeedSnapshot, getSeedTier } from "@/lib/data/meta";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { getDeckSummaries } from "@/lib/decks/repository";
import type { TierId } from "@/lib/meta/types";

// No title: the root segment's own page does not get the layout's title template, so the
// layout's default title ("Naruto TCG · Decks & Meta") is the right one here.
export const metadata: Metadata = {
  description:
    "Naruto TCG meta at a glance: S and A tier archetypes, the latest event results, featured decklists and tools for tournament organizers (fictional demo data).",
};

export default function HomePage() {
  const snapshot = getSeedSnapshot();
  const decks = getDeckSummaries();
  const featured = pickFeaturedDecks(decks);
  const tiers: Record<string, TierId> = Object.fromEntries(
    [...featured.winners, ...featured.community].map((deck) => [deck.archetypeId, getSeedTier(deck.archetypeId)]),
  );

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <OverviewHero asOf={snapshot.dateRange?.to ?? null} eventCount={snapshot.aggregates.length} />
        <KpiRow kpis={overviewKpis(SEED_TOURNAMENTS, decks, snapshot.stats)} />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
        <TierSnapshot rows={tierHighlights(snapshot.tiers, snapshot.trends)} eventCount={snapshot.aggregates.length} />
        <LatestResults events={latestResults(SEED_TOURNAMENTS, 4)} />
      </div>

      <FeaturedDecks winners={featured.winners} community={featured.community} tiers={tiers} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
        <OrganizerPanel />
        <MethodologyTeaser />
      </div>
    </PageContainer>
  );
}
