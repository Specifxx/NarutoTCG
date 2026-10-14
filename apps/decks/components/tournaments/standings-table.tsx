"use client";

import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArchetypeBadge, PlacementTag } from "@/components/ui/badges";
import { DataTable, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/format";
import { normalizeQuery } from "./directory";
import type { StandingsEntry } from "./event";
import { BUTTON_GHOST_SM, deckHref, FIELD, FOCUS_RING, playerHref } from "./styles";

/** Rows shown before "Show all"; small events always show everyone. */
const INITIAL_ROWS = 32;
const SHOW_ALL_BELOW = 48;

function DroppedTag() {
  return (
    <span className="shrink-0 rounded border border-shadow-500 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-ash-400">
      Dropped
    </span>
  );
}

export function StandingsTable({
  rows,
  topCutSize,
  showOverall,
}: {
  rows: StandingsEntry[];
  topCutSize: number;
  /** Show the overall (Swiss + top cut) record next to the Swiss record. */
  showOverall: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const hasResults = rows.some((r) => r.swissRecord !== null);

  const matching = useMemo(() => {
    const terms = normalizeQuery(query).split(" ").filter(Boolean);
    if (terms.length === 0) return rows;
    return rows.filter((row) => {
      const text = ` ${normalizeQuery(`${row.name} ${row.playerId} ${row.country ?? ""}`)}`;
      return terms.every((term) => text.includes(` ${term}`));
    });
  }, [rows, query]);

  const collapsible = rows.length > SHOW_ALL_BELOW && normalizeQuery(query) === "";
  const visible = collapsible && !expanded ? matching.slice(0, INITIAL_ROWS) : matching;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor={`${id}-find`} className="sr-only">
            Find a player in the standings
          </label>
          <input
            id={`${id}-find`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a player"
            autoComplete="off"
            className={cx(FIELD, "w-full")}
          />
        </div>
        <p aria-live="polite" className="text-sm text-ash-400">
          {normalizeQuery(query)
            ? `${formatNumber(matching.length)} of ${formatNumber(rows.length)} players`
            : `Showing ${formatNumber(visible.length)} of ${formatNumber(rows.length)} players`}
        </p>
      </div>

      <DataTable id={`${id}-table`}>
        <caption className="sr-only">Final standings in placement order</caption>
        <THead>
          <tr>
            <Th aria-sort="ascending">Place</Th>
            <Th>Player</Th>
            <Th>Country</Th>
            <Th>Deck</Th>
            <Th numeric>Swiss</Th>
            {showOverall && <Th numeric>Overall</Th>}
            <Th numeric>Pts</Th>
            <Th numeric>
              <abbr title="Opponents' match-win percentage" className="no-underline">
                OMW%
              </abbr>
            </Th>
            <Th numeric>
              <abbr title="Opponents' opponents' match-win percentage" className="no-underline">
                OOMW%
              </abbr>
            </Th>
            <Th>List</Th>
          </tr>
        </THead>
        <tbody>
          {visible.map((row) => (
            <Tr key={row.playerId} className={cx(row.inTopCut && "bg-shadow-800/70!")}>
              <Td className={cx("border-l-2", row.inTopCut ? "border-l-chakra-500" : "border-l-transparent")}>
                <PlacementTag placement={row.placement} topCutSize={topCutSize} />
                {row.inTopCut && <span className="sr-only"> (top cut)</span>}
              </Td>
              <Td>
                <span className="flex items-center gap-2">
                  <Link href={playerHref(row.playerId)} className={cx("font-medium text-ash-100 rounded-sm hover:text-chakra-400", FOCUS_RING)}>
                    {row.name}
                  </Link>
                  {row.dropped && <DroppedTag />}
                </span>
              </Td>
              <Td className="text-ash-400">{row.country ?? "—"}</Td>
              <Td>
                <ArchetypeBadge archetypeId={row.archetypeId} short href />
              </Td>
              <Td numeric>{row.swissRecord ?? "—"}</Td>
              {showOverall && <Td numeric className="text-ash-300">{row.overallRecord ?? "—"}</Td>}
              <Td numeric className="font-semibold text-white">
                {row.matchPoints ?? "—"}
              </Td>
              <Td numeric className="text-ash-300">
                {formatPercent(row.omw)}
              </Td>
              <Td numeric className="text-ash-400">
                {formatPercent(row.oomw)}
              </Td>
              <Td>
                {row.deckId ? (
                  <Link href={deckHref(row.deckId)} className={cx("font-medium text-chakra-400 rounded-sm hover:text-chakra-300", FOCUS_RING)}>
                    View list<span className="sr-only"> by {row.name}</span>
                  </Link>
                ) : (
                  <span className="text-ash-500">—</span>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>

      {matching.length === 0 && <p className="text-sm text-ash-400">No player matches “{query}”.</p>}
      {!hasResults && rows.length > 0 && (
        <p className="text-xs text-ash-500">No match results were recorded for this event, so records and tiebreakers are not available.</p>
      )}
      {collapsible && (
        <div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`${id}-table`}
            onClick={() => setExpanded((v) => !v)}
            className={BUTTON_GHOST_SM}
          >
            {expanded ? `Show top ${INITIAL_ROWS} only` : `Show all ${formatNumber(rows.length)} players`}
          </button>
        </div>
      )}
    </div>
  );
}
