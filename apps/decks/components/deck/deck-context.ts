import type { MatchupGuide } from "@/lib/data/guides";
import { buildMatchupMatrix, topArchetypeIds } from "@/lib/meta/matchups";
import type { MatchupCell, MatchupMatrix, MetaAggregate } from "@/lib/meta/types";
import type { MatchupEntry } from "./types";

/** Opponents compared against when the archetype is not in the snapshot's matrix. */
const FALLBACK_OPPONENTS = 8;

/**
 * The archetype's row of head-to-head cells: taken from the snapshot matrix when the archetype is
 * charted there, otherwise computed against the most-played archetypes. `extraOpponentIds` (for
 * example opponents the author wrote notes about) are appended when the row lacks them.
 */
export function matchupRowFor(
  archetypeId: string,
  meta: MetaAggregate,
  matrix: MatchupMatrix,
  extraOpponentIds: readonly string[] = [],
): MatchupCell[] {
  const minGames = matrix.minGames;
  const index = matrix.archetypeIds.indexOf(archetypeId);
  let row =
    index >= 0
      ? matrix.cells[index]
      : buildMatchupMatrix(
          meta,
          [archetypeId, ...topArchetypeIds(meta, FALLBACK_OPPONENTS).filter((id) => id !== archetypeId)],
          { minGames },
        ).cells[0];
  const present = new Set(row.map((cell) => cell.opponentId));
  const missing = [...new Set(extraOpponentIds)].filter((id) => !present.has(id));
  if (missing.length > 0) row = [...row, ...buildMatchupMatrix(meta, [archetypeId, ...missing], { minGames }).cells[0].slice(1)];
  return row;
}

/**
 * Matchup guide entries for a deck's archetype, most-played opponent first (ties by id). The mirror
 * is skipped; guides come from `guideFor` so this stays free of seed imports.
 */
export function buildMatchupEntries({
  archetypeId,
  meta,
  matrix,
  guideFor,
  extraOpponentIds = [],
}: {
  archetypeId: string;
  meta: MetaAggregate;
  matrix: MatchupMatrix;
  guideFor: (archetypeId: string, opponentId: string) => MatchupGuide | null;
  extraOpponentIds?: readonly string[];
}): MatchupEntry[] {
  const entries = (id: string) => meta.archetypes[id]?.entries ?? 0;
  return matchupRowFor(archetypeId, meta, matrix, extraOpponentIds)
    .filter((cell) => !cell.mirror && cell.opponentId !== archetypeId)
    .sort((a, b) => entries(b.opponentId) - entries(a.opponentId) || (a.opponentId < b.opponentId ? -1 : a.opponentId > b.opponentId ? 1 : 0))
    .map((cell) => ({
      opponentId: cell.opponentId,
      record: { ...cell.record },
      games: cell.games,
      winRate: cell.winRate,
      interval: cell.interval,
      lowSample: cell.lowSample,
      opponentShare: meta.playerCount > 0 ? entries(cell.opponentId) / meta.playerCount : 0,
      guide: guideFor(archetypeId, cell.opponentId),
    }));
}
