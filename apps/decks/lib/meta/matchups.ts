import { ROGUE_ID } from "@/lib/data/archetypes";
import { emptyWLD, matchupKey } from "@/lib/meta/aggregate";
import { recordGames, recordInterval, recordWinRate } from "@/lib/meta/stats";
import type { MatchupCell, MatchupMatrix, MetaAggregate } from "@/lib/meta/types";

function buildCell(meta: MetaAggregate, archetypeId: string, opponentId: string, minGames: number): MatchupCell {
  if (archetypeId === opponentId) {
    return {
      archetypeId,
      opponentId,
      record: emptyWLD(),
      games: meta.archetypes[archetypeId]?.mirrorMatches ?? 0,
      winRate: null,
      interval: null,
      mirror: true,
      lowSample: false,
    };
  }
  const record = { ...(meta.matchups[matchupKey(archetypeId, opponentId)] ?? emptyWLD()) };
  const games = recordGames(record);
  return {
    archetypeId,
    opponentId,
    record,
    games,
    winRate: recordWinRate(record),
    interval: recordInterval(record),
    mirror: false,
    lowSample: games < minGames,
  };
}

/**
 * Head-to-head matrix: `cells[row][col]` is the row archetype's record against the column
 * archetype. Diagonal cells are mirrors (games = mirror matches, no win rate); off-diagonal
 * cells with fewer than `minGames` games are flagged `lowSample`.
 */
export function buildMatchupMatrix(
  meta: MetaAggregate,
  archetypeIds: readonly string[],
  { minGames = 8 }: { minGames?: number } = {},
): MatchupMatrix {
  return {
    archetypeIds: [...archetypeIds],
    cells: archetypeIds.map((row) => archetypeIds.map((col) => buildCell(meta, row, col, minGames))),
    minGames,
  };
}

/** The `n` most-played archetypes by entries (ties by id), rogue excluded by default. */
export function topArchetypeIds(meta: MetaAggregate, n: number, { excludeRogue = true }: { excludeRogue?: boolean } = {}): string[] {
  return Object.entries(meta.archetypes)
    .filter(([id, counts]) => counts.entries > 0 && !(excludeRogue && id === ROGUE_ID))
    .sort(([idA, a], [idB, b]) => b.entries - a.entries || (idA < idB ? -1 : idA > idB ? 1 : 0))
    .slice(0, Math.max(0, n))
    .map(([id]) => id);
}
