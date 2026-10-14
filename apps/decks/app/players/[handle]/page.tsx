import type { Metadata } from "next";
import { ImportedPlayerLoader } from "@/components/players/imported-player-loader";
import { ProfileView } from "@/components/players/profile-view";
import { PageContainer } from "@/components/ui/page-header";
import { ARCHETYPES } from "@/lib/data/archetypes";
import { getSeedTier } from "@/lib/data/meta";
import { getAllPlayerHandles, getPlayerProfile } from "@/lib/decks/repository";
import { pluralize } from "@/lib/format";
import type { TierId } from "@/lib/meta/types";

type Params = Promise<{ handle: string }>;

export const dynamicParams = true;

/** Prerender authors and every pilot with a published list; other players render on demand. */
export function generateStaticParams(): Array<{ handle: string }> {
  return getAllPlayerHandles()
    .filter((handle) => {
      const profile = getPlayerProfile(handle);
      return profile && (profile.isAuthor || profile.decks.length > 0);
    })
    .map((handle) => ({ handle }));
}

function decodeHandle(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    // Malformed escape: look the raw segment up as-is.
    return raw;
  }
}

function findProfile(raw: string) {
  return getPlayerProfile(decodeHandle(raw)) ?? getPlayerProfile(raw);
}

function seedTiers(): Record<string, TierId> {
  return Object.fromEntries(ARCHETYPES.map((archetype) => [archetype.id, getSeedTier(archetype.id)]));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const profile = findProfile((await params).handle);
  // Players from events imported in a browser are only known there; the client sets the title.
  if (!profile) return { title: "Player", robots: { index: false } };
  const events = profile.totals.events;
  return {
    title: profile.name,
    description: profile.isAuthor
      ? `${profile.name}: deck author profile, published decks and tournament results (fictional demo data).`
      : `${profile.name}: ${pluralize(events, "tracked event")}, archetypes played and decklists (fictional demo data).`,
  };
}

export default async function PlayerPage({ params }: { params: Params }) {
  const raw = (await params).handle;
  const profile = findProfile(raw);
  return (
    <PageContainer>
      {profile ? (
        <ProfileView profile={profile} tiers={seedTiers()} />
      ) : (
        // Not in the seed: the handle may belong to a player from an event imported in this browser.
        <ImportedPlayerLoader handle={decodeHandle(raw)} tiers={seedTiers()} />
      )}
    </PageContainer>
  );
}
