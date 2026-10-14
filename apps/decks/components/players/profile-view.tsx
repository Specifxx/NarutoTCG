import { VotedDeckCard } from "@/components/directory/voted-deck-card";
import { EmptyState } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDate, formatNumber, formatPercent, pluralize } from "@/lib/format";
import type { TierId } from "@/lib/meta/types";
import type { PlayerProfile } from "@/lib/players/profiles";
import { placementLabel } from "@/lib/tournament/standings";
import { ArchetypeBars } from "./archetype-bars";
import { HistoryTable } from "./history-table";
import { ProfileHeader, type ProfileOrigin } from "./profile-header";
import { archetypeRows, bestResult, matchWinRate } from "./profile";

const JUMP_LINK =
  "rounded-md border border-shadow-600 bg-shadow-800 px-2.5 py-1 text-xs font-medium text-ash-300 outline-none hover:border-shadow-500 hover:text-white focus-visible:ring-2 focus-visible:ring-chakra-400";

/**
 * The player / author profile body. Client-safe (no seed modules), so the server page and the
 * imported-player fallback render the same view; `tiers` maps archetype ids to seed tiers.
 */
export function ProfileView({
  profile,
  tiers,
  origin = "seed",
}: {
  profile: PlayerProfile;
  tiers: Record<string, TierId>;
  origin?: ProfileOrigin;
}) {
  const { totals, results, decks } = profile;
  const best = bestResult(results);
  const winRate = matchWinRate(totals);
  const rows = archetypeRows(profile.archetypeCounts);
  const tierOf = (archetypeId: string) => {
    const tier = tiers[archetypeId];
    return tier && tier !== "unranked" ? tier : undefined;
  };
  const communityDecks = decks.filter((deck) => deck.source === "community");
  const upvotes = communityDecks.reduce((sum, deck) => sum + deck.votes, 0);
  const deckKinds = [
    decks.length > communityDecks.length && pluralize(decks.length - communityDecks.length, "tournament list"),
    communityDecks.length > 0 && pluralize(communityDecks.length, "community build"),
  ].filter(Boolean);

  return (
    <>
      <ProfileHeader
        profile={profile}
        origin={origin}
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
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-8">
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
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <li key={deck.id} className="min-w-0">
                <VotedDeckCard deck={deck} tier={tierOf(deck.archetypeId)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No published decks">
            {origin === "imported"
              ? `The imported ${results.length === 1 ? "event has" : "events have"} no decklist for ${profile.name}. Import the event again with decklists to add one.`
              : `${profile.name} has no decklists in the database yet. Lists appear here when an event publishes them.`}
          </EmptyState>
        )}
      </Section>
    </>
  );
}
