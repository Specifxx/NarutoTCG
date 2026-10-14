import Link from "next/link";
import { TEXT_LINK } from "@/components/directory/styles";
import { ArchetypeBadge, EventTierBadge, PlacementTag } from "@/components/ui/badges";
import { DataTable, THead, Td, Th, Tr } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import type { PlayerResult } from "@/lib/players/profiles";
import { formatRecord } from "@/lib/tournament/standings";

/** Tournament history, newest first. Scrolls inside its own frame on narrow screens. */
export function HistoryTable({ results }: { results: PlayerResult[] }) {
  return (
    <DataTable>
      <caption className="sr-only">Tournament results, newest first</caption>
      <THead>
        <tr>
          <Th>Date</Th>
          <Th>Event</Th>
          <Th>Tier</Th>
          <Th>Finish</Th>
          <Th>Archetype</Th>
          <Th numeric>Record</Th>
          <Th>Decklist</Th>
        </tr>
      </THead>
      <tbody>
        {results.map((result) => (
          <Tr key={result.tournamentId}>
            <Td className="whitespace-nowrap text-ash-300 tabular-nums">{formatDate(result.date)}</Td>
            <Td>
              <Link
                href={`/tournaments/${encodeURIComponent(result.tournamentId)}`}
                className={`block w-56 whitespace-normal leading-snug sm:w-72 ${TEXT_LINK}`}
              >
                {result.tournamentName}
              </Link>
            </Td>
            <Td>
              <EventTierBadge tier={result.tier} short />
            </Td>
            <Td>
              <span className="flex items-center gap-2">
                <PlacementTag placement={result.placement} topCutSize={result.topCutSize} />
                <span className="whitespace-nowrap text-xs text-ash-400 tabular-nums">of {formatNumber(result.playerCount)}</span>
              </span>
            </Td>
            <Td>
              <ArchetypeBadge archetypeId={result.archetypeId} href />
            </Td>
            <Td numeric className="text-ash-100">
              {formatRecord(result.record)}
            </Td>
            <Td>
              {result.deckId ? (
                <Link href={`/deck/${encodeURIComponent(result.deckId)}`} className={`whitespace-nowrap text-chakra-300 ${TEXT_LINK}`}>
                  View list<span className="sr-only"> from {result.tournamentName}</span>
                </Link>
              ) : (
                <span className="text-ash-500">
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Not published</span>
                </span>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
