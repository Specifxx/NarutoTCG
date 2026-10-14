import type { Metadata } from "next";
import Link from "next/link";
import { BUTTON_GHOST, BUTTON_PRIMARY } from "@/components/tournaments/styles";
import { summarize } from "@/components/tournaments/summary";
import { TournamentDirectory } from "@/components/tournaments/tournament-directory";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Standings, top cut brackets, pairings and published decklists from tracked Naruto TCG events (fictional demo data).",
};

export default function TournamentsPage() {
  const events = SEED_TOURNAMENTS.map(summarize);
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Competitive play"
        title="Tournaments"
        description="Standings, brackets, pairings and published decklists from every tracked event, newest first. Seed events are fictional demo data."
        actions={
          <Link href="/tournaments/import" className={BUTTON_GHOST}>
            Import results
          </Link>
        }
      />

      <TournamentDirectory events={events} />

      <aside
        aria-labelledby="organizer-cta-title"
        className="flex flex-col gap-4 rounded-lg border border-chakra-600/60 bg-shadow-900 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chakra-400">For tournament organizers</p>
          <h2 id="organizer-cta-title" className="mt-1 text-lg font-bold text-white">
            Ran an event? Publish the results.
          </h2>
          <p className="mt-1 text-sm text-ash-400">
            Upload standings, pairings and decklists as CSV or JSON. The import wizard checks names, records and lists, then
            adds the event to the directory, the meta and the deck database in this browser.
          </p>
        </div>
        <Link href="/tournaments/import" className={BUTTON_PRIMARY}>
          Open the import wizard
        </Link>
      </aside>
    </PageContainer>
  );
}
