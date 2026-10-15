import type { Tournament } from "@naruto-tcg/types";
import { CHARTED_ARCHETYPES, getArchetype } from "@/lib/data/archetypes";
import { normalizeName } from "@/lib/ingest/text";
import { OTHER_SERIES_ID, seriesIdFor } from "@/lib/meta/share";
import { computeRecords, emptyRecord, formatRecord } from "@/lib/tournament/standings";

/** Rows shown in the standings preview. */
export const STANDINGS_PREVIEW_LIMIT = 32;

export interface PreviewPlayer {
  id: string;
  name: string;
  country?: string;
  archetypeId: string;
  placement: number;
  /** Overall W-L(-D) from the matches, top cut included; "—" without pairings. */
  record: string;
  dropped: boolean;
  hasDecklist: boolean;
}

export interface BreakdownMember {
  archetypeId: string;
  label: string;
  players: number;
}

export interface BreakdownRow {
  /** Chart series: a charted archetype id, or the "Other" series. */
  seriesId: string;
  label: string;
  players: number;
  /** Share of the field, 0..1 */
  share: number;
  /** Players of this series in the top cut. */
  topCut: number;
  /** Archetypes folded into the row (one for a charted archetype), most played first. */
  members: BreakdownMember[];
}

/** Every player by final placement, with an overall record from the matches. */
export function previewPlayers(tournament: Tournament): PreviewPlayer[] {
  const records = computeRecords(tournament.matches);
  const hasMatches = tournament.matches.length > 0;
  return [...tournament.players]
    .sort((a, b) => a.placement - b.placement)
    .map((player) => ({
      id: player.id,
      name: player.name,
      ...(player.country ? { country: player.country } : {}),
      archetypeId: player.archetypeId,
      placement: player.placement,
      record: hasMatches ? formatRecord(records.get(player.id) ?? emptyRecord()) : "—",
      dropped: Boolean(player.dropped),
      hasDecklist: Boolean(player.decklist),
    }));
}

/** The top players for the standings preview. */
export function standingsPreview(tournament: Tournament, limit = STANDINGS_PREVIEW_LIMIT): PreviewPlayer[] {
  return previewPlayers(tournament).slice(0, limit);
}

/** Top cut players, champion first; empty without a cut. */
export function topCutPreview(tournament: Tournament): PreviewPlayer[] {
  return previewPlayers(tournament).filter((player) => player.placement <= tournament.topCutSize);
}

const SERIES_ORDER = new Map([...CHARTED_ARCHETYPES.map((a) => a.id), OTHER_SERIES_ID].map((id, index) => [id, index]));

/**
 * Field breakdown by chart series: each charted archetype keeps its fixed color slot and
 * uncharted archetypes (rogue included) fold into "Other". Most played first, "Other" last.
 */
export function archetypeBreakdown(tournament: Tournament): BreakdownRow[] {
  const total = tournament.players.length;
  const rows = new Map<string, BreakdownRow>();
  const members = new Map<string, Map<string, number>>();
  for (const player of tournament.players) {
    const seriesId = seriesIdFor(player.archetypeId);
    let row = rows.get(seriesId);
    if (!row) {
      const label = seriesId === OTHER_SERIES_ID ? "Other" : (getArchetype(seriesId)?.name ?? seriesId);
      row = { seriesId, label, players: 0, share: 0, topCut: 0, members: [] };
      rows.set(seriesId, row);
      members.set(seriesId, new Map());
    }
    row.players++;
    if (player.placement <= tournament.topCutSize) row.topCut++;
    const counts = members.get(seriesId)!;
    counts.set(player.archetypeId, (counts.get(player.archetypeId) ?? 0) + 1);
  }
  for (const row of rows.values()) {
    row.share = total === 0 ? 0 : row.players / total;
    row.members = [...members.get(row.seriesId)!]
      .map(([archetypeId, players]) => ({ archetypeId, label: getArchetype(archetypeId)?.name ?? archetypeId, players }))
      .sort((a, b) => b.players - a.players || a.label.localeCompare(b.label, "en"));
  }
  const order = (id: string) => SERIES_ORDER.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...rows.values()].sort((a, b) => {
    if (a.seriesId === OTHER_SERIES_ID || b.seriesId === OTHER_SERIES_ID) return a.seriesId === OTHER_SERIES_ID ? 1 : -1;
    return b.players - a.players || order(a.seriesId) - order(b.seriesId);
  });
}

/** A tracked (seed) event, as the import page hands it to the wizard: just enough to spot a copy. */
export interface SeedEventRef {
  id: string;
  name: string;
  date: string;
}

/** Prefix the wizard gives every imported event id (see `asLocalImport`). */
const LOCAL_PREFIX = "local-";

/**
 * The tracked event an import duplicates, or null: the same id once the "local-" prefix is
 * stripped (a re-imported "Download JSON"), or the same name (ignoring case, accents and
 * punctuation) on the same date (the same event from the organizer's exports).
 */
export function seedTwinOf(tournament: Pick<Tournament, "id" | "name" | "date">, seeds: readonly SeedEventRef[]): SeedEventRef | null {
  const id = tournament.id.startsWith(LOCAL_PREFIX) ? tournament.id.slice(LOCAL_PREFIX.length) : tournament.id;
  const name = normalizeName(tournament.name);
  const date = tournament.date.slice(0, 10);
  return seeds.find((seed) => seed.id === id || (name !== "" && normalizeName(seed.name) === name && seed.date.slice(0, 10) === date)) ?? null;
}

/** File name for the normalized download, e.g. "local-riverbend-sc-2026-09-12.json". */
export function normalizedFileName(tournamentId: string): string {
  return `${tournamentId.replace(/[^a-z0-9-]+/gi, "-")}.json`;
}

/** Pretty-printed normalized JSON, as the CLI writes it. */
export function normalizedJson(tournament: Tournament): string {
  return `${JSON.stringify(tournament, null, 2)}\n`;
}

/** The CLI command that ingests the downloaded file into the repository's data. */
export function cliCommand(fileName: string): string {
  return `pnpm --filter @naruto-tcg/decks ingest -- path/to/${fileName}`;
}
