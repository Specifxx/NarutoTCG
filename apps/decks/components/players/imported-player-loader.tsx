"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { BUTTON_GHOST, BUTTON_PRIMARY, FOCUS_RING } from "@/components/directory/styles";
import { EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/page-header";
import type { TierId } from "@/lib/meta/types";
import { useImportedTournaments } from "@/lib/storage/imports";
import { useHydrated } from "@/lib/storage/local-store";
import { importedPlayerProfile } from "./imported-profile";
import { ProfileView } from "./profile-view";

const TITLE_SUFFIX = " · Naruto TCG Decks";

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Looking for this player in events imported in this browser…</span>
      <div aria-hidden="true" className="flex animate-pulse items-center gap-3 border-b border-shadow-700 pb-6">
        <div className="h-12 w-12 shrink-0 rounded-full bg-shadow-700 sm:h-14 sm:w-14" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="h-3 w-28 rounded bg-shadow-700" />
          <div className="h-8 w-2/3 max-w-sm rounded bg-shadow-700" />
        </div>
      </div>
      <div aria-hidden="true" className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-lg border border-shadow-700 bg-shadow-900" />
        ))}
      </div>
    </div>
  );
}

/**
 * Profile page for a handle with no seed profile: players who only appear in events imported in
 * this browser. Waits for storage, then renders the regular profile view or a "not found" state.
 */
export function ImportedPlayerLoader({ handle, tiers }: { handle: string; tiers: Record<string, TierId> }) {
  const hydrated = useHydrated();
  const imported = useImportedTournaments();
  const profile = useMemo(() => importedPlayerProfile(imported, handle), [imported, handle]);

  useEffect(() => {
    if (hydrated) document.title = `${profile ? profile.name : "Player not found"}${TITLE_SUFFIX}`;
  }, [hydrated, profile]);

  if (!hydrated) return <LoadingState />;
  if (profile) return <ProfileView profile={profile} tiers={tiers} origin="imported" />;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/decks" className={`rounded-sm hover:text-chakra-300 ${FOCUS_RING}`}>
            Decks
          </Link>
        }
        title="Player not found"
        description={
          <>
            No player or author called <span className="font-mono text-ash-200">@{handle}</span> is in the database or in
            the events imported in this browser.
          </>
        }
      />
      <EmptyState title="Nothing to show for this link">
        <p>
          Imported events live only in the browser that imported them, so this player may come from an event imported on
          another device or since deleted.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/decks" className={BUTTON_PRIMARY}>
            Browse decks
          </Link>
          <Link href="/tournaments" className={BUTTON_GHOST}>
            Browse tournaments
          </Link>
        </div>
      </EmptyState>
    </>
  );
}
