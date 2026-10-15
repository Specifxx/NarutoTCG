"use client";

import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { useMemo } from "react";
import { EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/page-header";
import { useImportedTournaments } from "@/lib/storage/imports";
import { useHydrated } from "@/lib/storage/local-store";
import { useClientTitle } from "./client-title";
import { BUTTON_GHOST, BUTTON_PRIMARY, FOCUS_RING } from "./styles";
import { TournamentView } from "./tournament-view";

function Breadcrumb() {
  return (
    <Link href="/tournaments" className={cx("rounded-sm hover:text-chakra-300", FOCUS_RING)}>
      Tournaments
    </Link>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading the imported event from this browser…</span>
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-4 border-b border-shadow-700 pb-6">
        <div className="h-3 w-28 rounded bg-shadow-700" />
        <div className="h-9 w-3/4 max-w-xl rounded bg-shadow-700" />
        <div className="h-4 w-1/2 max-w-md rounded bg-shadow-800" />
      </div>
      <div aria-hidden="true" className="grid animate-pulse grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg border border-shadow-700 bg-shadow-900" />
        ))}
      </div>
    </div>
  );
}

/**
 * Event page for a `local-` id: finds the event among this browser's imports once storage is
 * readable and renders the same view as seed events.
 */
export function ImportedTournamentLoader({ id }: { id: string }) {
  const hydrated = useHydrated();
  const imported = useImportedTournaments();
  const tournament = useMemo(() => {
    const found = imported.find((t) => t.id === id);
    // Stored events arrive sanitized. Everything in this browser's store is an import, whatever
    // the file said, so it can be deleted.
    return found && (found.source === "import" ? found : { ...found, source: "import" as const });
  }, [imported, id]);

  useClientTitle(hydrated ? (tournament ? tournament.name : "Event not found") : null);

  if (!hydrated) return <LoadingState />;

  if (!tournament) {
    return (
      <>
        <PageHeader
          eyebrow={<Breadcrumb />}
          title="Event not found in this browser"
          description="Imported events are stored only in the browser that imported them. This one may have been deleted, or imported on another device."
        />
        <EmptyState title="Nothing to show for this link">
          <p>Import the results again to see the standings, bracket and decklists here.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/tournaments/import" className={BUTTON_PRIMARY}>
              Open the import wizard
            </Link>
            <Link href="/tournaments" className={BUTTON_GHOST}>
              Browse all events
            </Link>
          </div>
        </EmptyState>
      </>
    );
  }

  return <TournamentView tournament={tournament} />;
}
