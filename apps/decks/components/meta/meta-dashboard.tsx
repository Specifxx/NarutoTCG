"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { EmptyState } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import { formatDate, pluralize } from "@/lib/format";
import { deriveSnapshotFromAggregates } from "@/lib/meta/snapshot";
import type { TournamentAggregate } from "@/lib/meta/types";
import { useImportedTournaments } from "@/lib/storage/imports";
import { ArchetypeStatsTable } from "./archetype-stats-table";
import {
  MATRIX_MIN_GAMES,
  TREND_EVENTS,
  aggregateImported,
  availableFormats,
  countMatches,
  mergeImportedAggregates,
  newestEventDate,
} from "./derive";
import { EventShareChart } from "./event-share-chart";
import { FieldVsCutChart } from "./field-vs-cut-chart";
import { MatchupMatrix } from "./matchup-matrix";
import { MetaFilters } from "./meta-filters";
import { MetaShareDonut } from "./meta-share-donut";
import { parseMetaParams, resetFilters, resolveFormat, serializeMetaParams, toMetaFilter, type MetaParams } from "./params";
import { TierList } from "./tier-list";

function formatRange(range: { from: string; to: string } | null): string {
  if (!range) return "no dates";
  return range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

/**
 * The meta page body for one query string. Everything is derived in the browser from the
 * server's per-event aggregates (plus this browser's imports when toggled on), so filters
 * never round-trip to the server.
 */
function MetaView({
  aggregates,
  query,
  onChange,
}: {
  aggregates: TournamentAggregate[];
  query: string;
  onChange?: (next: MetaParams) => void;
}) {
  const imported = useImportedTournaments();
  const importedAggregates = useMemo(() => aggregateImported(imported), [imported]);
  const state = useMemo(() => parseMetaParams(query), [query]);
  const includeImports = state.imports && importedAggregates.length > 0;

  const pool = useMemo(
    () => (includeImports ? mergeImportedAggregates(aggregates, importedAggregates) : aggregates),
    [includeImports, aggregates, importedAggregates],
  );
  const seedIds = useMemo(() => new Set(aggregates.map((a) => a.tournamentId)), [aggregates]);
  const formats = useMemo(() => availableFormats(pool), [pool]);
  const newestDate = useMemo(() => newestEventDate(pool), [pool]);
  const filter = useMemo(() => toMetaFilter(state, { newestDate, formats }), [state, newestDate, formats]);
  const snapshot = useMemo(
    () => deriveSnapshotFromAggregates(pool, filter, { minGames: MATRIX_MIN_GAMES, recentEvents: TREND_EVENTS }),
    [pool, filter],
  );

  const events = snapshot.aggregates.length;
  const importedShown = snapshot.aggregates.filter((a) => !seedIds.has(a.tournamentId)).length;
  const matches = Math.round(countMatches(snapshot.meta));
  const reset = onChange ? () => onChange(resetFilters(state)) : undefined;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <MetaFilters
          state={state}
          formats={formats}
          activeFormat={resolveFormat(state.format, formats)}
          importedCount={importedAggregates.length}
          onChange={onChange}
        />
        <p aria-live="polite" className="text-sm text-ash-300">
          <span className="font-semibold text-white">{pluralize(events, "event")}</span>
          {" · "}
          {pluralize(snapshot.meta.playerCount, "player")}
          {" · "}
          {pluralize(matches, "match", "matches")}
          {" · "}
          {formatRange(snapshot.dateRange)}
          {importedShown > 0 && <span className="text-ash-400"> · incl. {pluralize(importedShown, "imported event")}</span>}
        </p>
      </div>

      {events === 0 ? (
        <EmptyState title="No events match these filters">
          <p>Try a wider date range, another format or more event tiers.</p>
          {reset && (
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-md bg-chakra-500 px-3 py-1.5 text-sm font-semibold text-shadow-950 outline-none hover:bg-chakra-400 focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950"
            >
              Reset filters
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          <Section
            id="tier-list"
            title="Tier list"
            description="Archetypes ranked by a composite of adjusted win rate, top-cut conversion and meta presence. See the methodology below."
          >
            <TierList tiers={snapshot.tiers} trends={snapshot.trends} />
          </Section>

          <Section
            id="stats"
            title="Archetype stats"
            description="Every archetype in the selected events. Select a column header to sort."
          >
            <ArchetypeStatsTable stats={snapshot.stats} />
          </Section>

          <Section
            id="share"
            title="Meta share"
            description="Who shows up, who converts, and how the field shifted from event to event."
          >
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <MetaShareDonut rows={snapshot.overallShare} totalPlayers={snapshot.meta.playerCount} />
                <FieldVsCutChart rows={snapshot.fieldVsTopCut} hasTopCut={snapshot.meta.topCutSlots > 0} />
              </div>
              <EventShareChart rows={snapshot.shareByEvent} />
            </div>
          </Section>

          <MatchupMatrix meta={snapshot.meta} minGames={MATRIX_MIN_GAMES} />
        </>
      )}
    </div>
  );
}

/** URL-synced meta dashboard. The server parent must wrap it in <Suspense> (it reads search params). */
export function MetaDashboard({ aggregates }: { aggregates: TournamentAggregate[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const onChange = useCallback(
    (next: MetaParams) => {
      const query = serializeMetaParams(next, window.location.search);
      // The native History API is integrated with the App Router: useSearchParams updates
      // without a server round-trip and the scroll position stays put.
      window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    },
    [pathname],
  );
  return <MetaView aggregates={aggregates} query={searchParams.toString()} onChange={onChange} />;
}

/**
 * Suspense fallback: the all-events view with inert controls, so the prerendered HTML already
 * carries the full tier list, stats and charts before the URL-aware dashboard takes over.
 */
export function MetaDashboardFallback({ aggregates }: { aggregates: TournamentAggregate[] }) {
  return <MetaView aggregates={aggregates} query="" />;
}
