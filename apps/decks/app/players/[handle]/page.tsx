import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VotedDeckCard } from "@/components/directory/voted-deck-card";
import { ArchetypeBars } from "@/components/players/archetype-bars";
import { HistoryTable } from "@/components/players/history-table";
import { ProfileHeader } from "@/components/players/profile-header";
import { archetypeRows, bestResult, matchWinRate } from "@/components/players/profile";
import { EmptyState } from "@/components/ui/badges";
import { PageContainer, Section } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { getSeedTier } from "@/lib/data/meta";
import { getAllPlayerHandles, getPlayerProfile } from "@/lib/decks/repository";
import { formatDate, formatNumber, formatPercent, pluralize } from "@/lib/format";
import type { TierId } from "@/lib/meta/types";
import { placementLabel } from "@/lib/tournament/standings";

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

function findProfile(raw: string) {
  let handle = raw;
  try {
    handle = decodeURIComponent(raw);
  } catch {
    // Malformed escape: look the raw segment up as-is.
  }
  return getPlayerProfile(handle) ?? getPlayerProfile(raw);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const profile = findProfile((await params).handle);
  if (!profile) return { title: "Player not found" };
  const events = profile.totals.events;
  return {
    title: profile.name,
    description: profile.isAuthor
      ? `${profile.name}: deck author profile, published decks and tournament results (fictional demo data).`
      : `${profile.name}: ${pluralize(events, "tracked event")}, archetypes played and decklists (fictional demo data).`,
  };
}

const JUMP_LINK =
  "rounded-md border border-shadow-600 bg-shadow-800 px-2.5 py-1 text-xs font-medium text-ash-300 outline-none hover:border-shadow-500 hover:text-white focus-visible:ring-2 focus-visible:ring-chakra-400";

export default async function PlayerPage({ params }: { params: Params }) {
  const profile = findProfile((await params).handle);
  if (!profile) notFound();

  const { totals, results, decks } = profile;
  const best = bestResult(results);
  const winRate = matchWinRate(totals);
  const rows = archetypeRows(profile.archetypeCounts);
  const tiers = new Map<string, TierId>();
  const tierOf = (archetypeId: string) => {
    if (!tiers.has(archetypeId)) tiers.set(archetypeId, getSeedTier(archetypeId));
    const tier = tiers.get(archetypeId)!;
    return tier === "unranked" ? undefined : tier;
  };
  const communityDecks = decks.filter((deck) => deck.source === "community");
  const upvotes = communityDecks.reduce((sum, deck) => sum + deck.votes, 0);
  const deckKinds = [
    decks.length > communityDecks.length && pluralize(decks.length - communityDecks.length, "tournament list"),
    communityDecks.length > 0 && pluralize(communityDecks.length, "community build"),
  ].filter(Boolean);

  return (
    <PageContainer>
      <ProfileHeader
        profile={profile}
        actions={
          <nav aria-label="On this page" className="flex flex-wrap gap-1.5">
            {results.length > 0 && (
              <a href="#history" className={JUMP_LINK}>
                Results
              </a>
            )}
            <a href="#decks" className={JUMP_LINK}>
              Decks
            </a>
          </nav>
        }
      />

      {results.length > 0 ? (
        <section aria-label="Tournament summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Events" value={formatNumber(totals.events)} detail={`Latest ${formatDate(results[0]!.date)}`} />
          <StatTile
            label="Record"
            value={<span className="tabular-nums">{`${totals.wins}-${totals.losses}-${totals.draws}`}</span>}
            detail="W-L-D, byes count as wins"
          />
          <StatTile label="Match win rate" value={formatPercent(winRate)} detail="Draws count as half a win" />
          <StatTile
            label="Top cuts"
            value={formatNumber(totals.topCuts)}
            detail={`${formatPercent(totals.topCuts / totals.events, 0)} of events`}
          />
          <StatTile label="Event wins" value={formatNumber(totals.eventWins)} detail={totals.eventWins > 0 ? "First-place finishes" : "No titles yet"} />
          <StatTile
            label="Best finish"
            value={best ? placementLabel(best.placement, best.topCutSize) : "—"}
            detail={best && <span className="block truncate" title={best.tournamentName}>{best.tournamentName}</span>}
          />
        </section>
      ) : (
        <section aria-label="Author summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Published decks" value={formatNumber(communityDecks.length)} detail="Community builds" />
          <StatTile label="Upvotes" value={formatNumber(upvotes)} detail="Across published decks" />
          {profile.joined && <StatTile label="Member since" value={formatDate(profile.joined)} />}
        </section>
      )}

      {results.length > 0 && (
        <div className="grid gap-10 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-8">
          <Section id="archetypes" title="Archetypes played" description="Tracked events per archetype.">
            <ArchetypeBars rows={rows} />
          </Section>
          <Section id="history" title="Tournament history" description={`${pluralize(results.length, "event")}, newest first.`}>
            <HistoryTable results={results} />
          </Section>
        </div>
      )}

      <Section
        id="decks"
        title="Decks"
        description={decks.length > 0 ? `${deckKinds.join(" and ")}, newest first.` : undefined}
      >
        {decks.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <li key={deck.id} className="min-w-0">
                <VotedDeckCard deck={deck} tier={tierOf(deck.archetypeId)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No published decks">
            {profile.name} has no decklists in the database yet. Lists appear here when an event publishes them.
          </EmptyState>
        )}
      </Section>
    </PageContainer>
  );
}
