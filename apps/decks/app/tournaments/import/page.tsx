import type { Metadata } from "next";
import Link from "next/link";
import { ImportHelp } from "@/components/import/import-help";
import { ImportWizard } from "@/components/import/import-wizard";
import { ImportedList } from "@/components/import/imported-list";
import { BUTTON_GHOST } from "@/components/import/styles";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";

export const metadata: Metadata = {
  title: "Import results",
  description:
    "Import tournament standings, pairings and decklists from CSV or JSON exports: map columns, validate, preview and save the event in your browser.",
};

/** The tracked events, reduced to what the wizard needs to flag a re-import (the seed data stays on the server). */
const SEED_EVENTS = SEED_TOURNAMENTS.map(({ id, name, date }) => ({ id, name, date }));

export default function ImportResultsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="For tournament organizers"
        title="Import results"
        description="Turn your tournament software's exports into an event page, meta data and published decklists. Files are checked in your browser and saved only to this browser."
        actions={
          <Link href="/tournaments" className={BUTTON_GHOST}>
            Browse tournaments
          </Link>
        }
      />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ImportWizard seedEvents={SEED_EVENTS} />
        <aside aria-label="Your imports and help" className="flex min-w-0 flex-col gap-6">
          <ImportedList />
          <ImportHelp />
        </aside>
      </div>
    </PageContainer>
  );
}
