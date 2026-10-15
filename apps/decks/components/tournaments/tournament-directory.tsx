"use client";

import type { EventTier } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useId, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/badges";
import { StatTile } from "@/components/ui/stat-tile";
import { EVENT_TIER_LABEL, EVENT_TIER_ORDER, EVENT_TIER_SHORT, formatNumber, pluralize } from "@/lib/format";
import { useImportedTournaments } from "@/lib/storage/imports";
import { eventTotals, filterEvents, formatOptions, mergeEventSummaries, offeredOr, regionOptions } from "./directory";
import { EventListHeader, EventRow } from "./event-row";
import { REGION_LABELS, type RegionId } from "./region";
import { BUTTON_GHOST_SM, FIELD, FOCUS_RING } from "./styles";
import { summarize, type TournamentSummary } from "./summary";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65-1.06 1.06-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
      />
    </svg>
  );
}

/**
 * Event directory: seed events from the server plus events imported in this browser,
 * with search, tier, region and format filters and KPIs recomputed for the filtered set.
 */
export function TournamentDirectory({ events }: { events: TournamentSummary[] }) {
  const id = useId();
  const imported = useImportedTournaments();
  // Stored events arrive sanitized; everything in this browser's store counts as an import. A
  // re-import of a seed event (its own "Download JSON") is skipped so it is not counted twice.
  const all = useMemo(
    () => mergeEventSummaries(events, imported.map((t) => ({ ...summarize(t), source: "import" as const }))),
    [events, imported],
  );
  const listHeading = useRef<HTMLHeadingElement>(null);

  const [text, setText] = useState("");
  const [tiers, setTiers] = useState<EventTier[]>([]);
  const [region, setRegion] = useState<RegionId | "all">("all");
  const [format, setFormat] = useState("all");

  const formats = useMemo(() => formatOptions(all), [all]);
  const regions = useMemo(() => regionOptions(all), [all]);
  const activeRegion = offeredOr(region, regions);
  const activeFormat = offeredOr(format, formats);
  const filtered = useMemo(
    () => filterEvents(all, { text, tiers, region: activeRegion, format: activeFormat }),
    [all, text, tiers, activeRegion, activeFormat],
  );
  const totals = eventTotals(filtered);
  const filtering = text.trim() !== "" || tiers.length > 0 || activeRegion !== "all" || activeFormat !== "all";
  const importedCount = all.filter((e) => e.source === "import").length;
  const duplicateImports = imported.length - importedCount;

  const toggleTier = (tier: EventTier) =>
    setTiers((prev) => (prev.includes(tier) ? prev.filter((t) => t !== tier) : EVENT_TIER_ORDER.filter((t) => t === tier || prev.includes(t))));
  const reset = () => {
    setText("");
    setTiers([]);
    setRegion("all");
    setFormat("all");
    // Both "Clear filters" buttons unmount once nothing is filtered; land on the list instead of <body>.
    listHeading.current?.focus();
  };

  const chip = (pressed: boolean) =>
    cx(
      "rounded-full border px-3 py-1 text-xs font-semibold transition",
      FOCUS_RING,
      pressed ? "border-chakra-400 bg-chakra-500/15 text-white" : "border-shadow-600 text-ash-300 hover:border-shadow-500 hover:text-white",
    );

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Totals for the listed events" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Events"
          value={formatNumber(totals.events)}
          detail={
            filtering
              ? `of ${formatNumber(all.length)} tracked`
              : importedCount > 0 || duplicateImports > 0
                ? [
                    importedCount > 0 && `Including ${pluralize(importedCount, "import")} from this browser`,
                    duplicateImports > 0 &&
                      `${pluralize(duplicateImports, "re-import")} of ${duplicateImports === 1 ? "a tracked event" : "tracked events"} not counted`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Tracked this season"
          }
        />
        {/* Per-event registrations, as on the home page (which counts distinct players and shows entries below). */}
        <StatTile label="Entries" value={formatNumber(totals.players)} detail="Each player counted once per event" />
        <StatTile label="Matches" value={formatNumber(totals.matches)} detail="Swiss and top cut, byes and intentional draws excluded" />
        <StatTile label="Published decklists" value={formatNumber(totals.decklists)} detail="Full lists with placements" />
      </section>

      <div className="flex flex-col gap-4">
        <form
          role="search"
          aria-label="Filter events"
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center"
        >
          <div className="relative min-w-0 lg:w-72">
            <label htmlFor={`${id}-q`} className="sr-only">
              Search events
            </label>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
            <input
              id={`${id}-q`}
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Event, city, organizer or winner"
              autoComplete="off"
              className={cx(FIELD, "w-full pl-8")}
            />
          </div>

          <div role="group" aria-label="Event tier" className="flex flex-wrap items-center gap-1.5">
            <button type="button" aria-pressed={tiers.length === 0} onClick={() => setTiers([])} className={chip(tiers.length === 0)}>
              All tiers
            </button>
            {EVENT_TIER_ORDER.map((tier) => (
              <button
                key={tier}
                type="button"
                aria-pressed={tiers.includes(tier)}
                onClick={() => toggleTier(tier)}
                title={EVENT_TIER_LABEL[tier]}
                className={chip(tiers.includes(tier))}
              >
                {EVENT_TIER_SHORT[tier]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="min-w-0">
              <label htmlFor={`${id}-region`} className="sr-only">
                Region
              </label>
              <select id={`${id}-region`} value={activeRegion} onChange={(e) => setRegion(e.target.value as RegionId | "all")} className={cx(FIELD, "w-full pr-8")}>
                <option value="all">All regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor={`${id}-format`} className="sr-only">
                Format
              </label>
              <select id={`${id}-format`} value={activeFormat} onChange={(e) => setFormat(e.target.value)} className={cx(FIELD, "w-full pr-8")}>
                <option value="all">All formats</option>
                {formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:ml-auto">
            <p aria-live="polite" className="text-sm text-ash-400">
              <span className="font-semibold tabular-nums text-ash-100">{formatNumber(filtered.length)}</span>{" "}
              {filtered.length === 1 ? "event" : "events"}
            </p>
            {filtering && (
              <button type="button" onClick={reset} className={BUTTON_GHOST_SM}>
                Clear filters
              </button>
            )}
          </div>
        </form>

        <h2 ref={listHeading} id={`${id}-list`} tabIndex={-1} className="sr-only">
          Events, newest first
        </h2>
        {filtered.length === 0 ? (
          <EmptyState title="No events match these filters">
            <button type="button" onClick={reset} className={cx("rounded-sm font-semibold text-chakra-400 hover:text-chakra-300", FOCUS_RING)}>
              Clear filters
            </button>{" "}
            to see all {pluralize(all.length, "event")}.
          </EmptyState>
        ) : (
          <div className="lg:overflow-hidden lg:rounded-lg lg:border lg:border-shadow-700">
            <EventListHeader />
            <ul aria-labelledby={`${id}-list`} className="flex flex-col gap-3 lg:gap-0">
              {filtered.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
