"use client";

import type { Tournament } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { DeckCard } from "@/components/decks/deck-card";
import { ArchetypeDot, EmptyState, EventTierBadge } from "@/components/ui/badges";
import { PageHeader, Section } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { buildTournamentDecks, toSummary } from "@/lib/decks/catalog";
import { EVENT_TIER_LABEL, formatDate, formatLocation, formatNumber, formatPercent, pluralize } from "@/lib/format";
import { OMW_FLOOR } from "@/lib/rules";
import { archetypeName } from "./archetype-name";
import { buildBracket } from "./bracket";
import { BracketView } from "./bracket-view";
import { buildStandings, eventMetaBreakdown } from "./event";
import { EventMetaChart } from "./event-meta-chart";
import { ImportedBadge } from "./event-row";
import { PairingsTabs } from "./pairings-tabs";
import { eventRounds } from "./rounds";
import { StandingsTable } from "./standings-table";
import { FOCUS_RING, playerHref } from "./styles";
import { structureLabel, summarize } from "./summary";
import { TournamentActions } from "./tournament-actions";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ash-500">{label}</dt>
      <dd className="mt-1 text-sm text-ash-100">{children}</dd>
    </div>
  );
}

/**
 * Full event page body, computed from the tournament record alone (no seed lookups), so the
 * same view renders seed events from the server and imported events from this browser.
 */
export function TournamentView({ tournament: t }: { tournament: Tournament }) {
  const view = useMemo(() => {
    const standings = buildStandings(t);
    const seeds = new Map(standings.flatMap((row) => (row.swissRank === null ? [] : [[row.playerId, row.swissRank] as const])));
    return {
      players: new Map(t.players.map((p) => [p.id, p])),
      summary: summarize(t),
      standings,
      bracket: buildBracket(t.matches, seeds),
      rounds: eventRounds(t.matches),
      breakdown: eventMetaBreakdown(t.players, t.topCutSize),
      decks: buildTournamentDecks([t]).map(toSummary),
    };
  }, [t]);
  const { summary, standings, bracket, rounds, breakdown, decks, players } = view;
  const winner = summary.winner;
  const dropped = t.players.filter((p) => p.dropped).length;

  const sections = [
    bracket.length > 0 && { id: "bracket", label: "Bracket" },
    { id: "standings", label: "Standings" },
    rounds.length > 0 && { id: "pairings", label: "Pairings" },
    breakdown.length > 0 && { id: "meta", label: "Event meta" },
    { id: "decklists", label: "Decklists" },
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <span className="flex flex-wrap items-center gap-2">
              <Link href="/tournaments" className={cx("rounded-sm hover:text-chakra-300", FOCUS_RING)}>
                Tournaments
              </Link>
              <span aria-hidden="true" className="text-ash-500">
                /
              </span>
              <span className="text-ash-400">{EVENT_TIER_LABEL[t.tier]}</span>
            </span>
          }
          title={t.name}
          description={t.notes ?? (t.source === "import" ? "Imported through the results wizard and stored only in this browser." : undefined)}
          actions={<TournamentActions tournament={t} />}
        />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-shadow-700 bg-shadow-900 p-4 sm:grid-cols-4">
          <Fact label="Tier">
            <EventTierBadge tier={t.tier} />
          </Fact>
          <Fact label="Date">
            <time dateTime={t.date}>{formatDate(t.date)}</time>
          </Fact>
          <Fact label="Location">
            {formatLocation(t.location)}
            {t.location.venue && <span className="block text-xs text-ash-400">{t.location.venue}</span>}
          </Fact>
          <Fact label="Organizer">{t.organizer}</Fact>
          <Fact label="Format">{t.format}</Fact>
          <Fact label="Structure">{structureLabel(t.swissRounds, t.topCutSize)}</Fact>
          <Fact label="Matches">Best of {t.bestOf}</Fact>
          <Fact label="Source">
            {t.source === "import" ? (
              <span className="flex flex-col items-start gap-1">
                <ImportedBadge />
                {t.importedAt && <span className="text-xs text-ash-400">Imported {formatDate(t.importedAt)}</span>}
              </span>
            ) : (
              <span>
                Demo seed data <span className="text-ash-400">(fictional event)</span>
              </span>
            )}
          </Fact>
        </dl>

        <section aria-label="Event totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Players" value={formatNumber(t.players.length)} detail={dropped > 0 ? `${formatNumber(dropped)} dropped` : "No drops"} />
          <StatTile label="Matches" value={formatNumber(summary.matches)} detail={rounds.length > 0 ? `${pluralize(rounds.length, "round")}, byes not counted` : "No results recorded"} />
          <StatTile
            label="Decklists published"
            value={formatNumber(summary.decklists)}
            detail={t.players.length > 0 && summary.decklists > 0 ? `${formatPercent(summary.decklists / t.players.length, 0)} of the field` : "None published"}
          />
          <StatTile
            label="Winning archetype"
            value={
              winner ? (
                <span className="flex min-w-0 items-center gap-2 text-lg">
                  <ArchetypeDot archetypeId={winner.archetypeId} />
                  <span className="truncate">{archetypeName(winner.archetypeId)}</span>
                </span>
              ) : (
                "—"
              )
            }
            detail={
              winner ? (
                <>
                  Piloted by{" "}
                  <Link href={playerHref(winner.id)} className={cx("rounded-sm font-medium text-ash-200 hover:text-chakra-400", FOCUS_RING)}>
                    {winner.name}
                  </Link>
                </>
              ) : (
                "No winner recorded"
              )
            }
          />
        </section>

        <nav aria-label="On this page" className="flex gap-2 overflow-x-auto pb-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cx(
                "shrink-0 rounded-full border border-shadow-600 px-3 py-1 text-xs font-semibold text-ash-300 transition hover:border-chakra-400 hover:text-white",
                FOCUS_RING,
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      {bracket.length > 0 && (
        <Section
          id="bracket"
          title={`Top ${t.topCutSize} bracket`}
          description="Seeds are Swiss ranks; scores are games won. Match winners are in bold."
        >
          <BracketView rounds={bracket} players={players} />
        </Section>
      )}

      <Section
        id="standings"
        title="Standings"
        description={`Top cut players by elimination round, then everyone by Swiss rank. Tiebreakers: OMW%, then OOMW%, each opponent floored at ${Math.round(OMW_FLOOR * 100)}%.`}
      >
        {standings.length > 0 ? (
          <StandingsTable rows={standings} topCutSize={t.topCutSize} showOverall={bracket.length > 0} />
        ) : (
          <EmptyState title="No players recorded for this event" />
        )}
      </Section>

      {rounds.length > 0 && (
        <Section id="pairings" title="Pairings" description="Results read from player 1's side. ID marks an intentional draw.">
          <PairingsTabs rounds={rounds} matches={t.matches} players={players} />
        </Section>
      )}

      {breakdown.length > 0 && (
        <Section id="meta" title="Event meta" description="How the field was split, and which archetypes converted into the top cut.">
          <EventMetaChart rows={breakdown} topCutSize={t.topCutSize} playerCount={t.players.length} />
        </Section>
      )}

      <Section
        id="decklists"
        title="Published decklists"
        description={decks.length > 0 ? `${pluralize(decks.length, "list")}, best finish first.` : undefined}
      >
        {decks.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {decks.map((deck) => (
              <li key={deck.id}>
                <DeckCard deck={deck} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No decklists published">The organizer did not publish lists for this event.</EmptyState>
        )}
      </Section>
    </>
  );
}
