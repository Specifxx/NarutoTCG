import { getArchetype } from "@/lib/data/archetypes";
import { assembleTournament, assignArchetype, canonicalOrder, failed, summarize } from "./assemble";
import { autoMapColumns, cell, COLUMN_FIELDS, describeFields, missingRequiredFields } from "./columns";
import { parseCsv } from "./csv";
import { slugify } from "./slug";
import { detectJsonFormat, TournamentSchema, zodIssues } from "./schema";
import { convertScraped } from "./scraped";
import { sortIssues, type ColumnMapping, type CsvKind, type EventMetaInput, type IngestIssue, type IngestResult, type RawEvent } from "./types";
import { validateTournament } from "./validate";

export interface CsvFileInput {
  text: string;
  /** Overrides the automatic column mapping (field key → header). */
  mapping?: ColumnMapping;
}

export interface IngestCsvInput {
  meta: EventMetaInput;
  standings?: CsvFileInput;
  pairings?: CsvFileInput;
  decklists?: CsvFileInput;
  /** ISO timestamp for `importedAt`; defaults to the current time. */
  now?: string;
}

export interface IngestJsonOptions {
  /** Event fields that replace the file's (e.g. a corrected date from the wizard). */
  metaOverrides?: Partial<EventMetaInput>;
  now?: string;
}

/** Event meta with every defined override applied. */
function mergeMeta(meta: EventMetaInput, overrides: Partial<EventMetaInput> | undefined): EventMetaInput {
  const merged = { ...meta };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value !== undefined) Object.assign(merged, { [key]: value });
  }
  return merged;
}

/** Parses one CSV and maps its columns; null (with errors) when a required column is missing. */
function readCsv(kind: CsvKind, file: CsvFileInput, issues: IngestIssue[]): Array<(field: string) => string | undefined> | null {
  const table = parseCsv(file.text);
  issues.push(...table.issues.map((issue) => ({ ...issue, source: kind })));
  let mapping: ColumnMapping = autoMapColumns(kind, table.headers);
  if (file.mapping) {
    mapping = {};
    for (const field of COLUMN_FIELDS[kind]) {
      const header = file.mapping[field.key] ?? null;
      const known = header === null || table.headers.includes(header);
      if (!known) {
        issues.push({
          severity: "warning",
          code: "unknown-column",
          message: `Column "${header}" mapped to ${field.label} is not in the ${kind} file.`,
          source: kind,
          field: field.key,
        });
      }
      mapping[field.key] = known ? header : null;
    }
  }

  const missing = missingRequiredFields(kind, mapping);
  for (const group of missing) {
    issues.push({
      severity: "error",
      code: "missing-column",
      message: `The ${kind} file has no ${describeFields(kind, group)} column, so it was not imported.`,
      suggestion: `Map a column to ${describeFields(kind, group)} or rename its header.`,
      source: kind,
    });
  }
  if (missing.length > 0) return null;
  return table.rows.map((row) => (field: string) => cell(row, mapping, field) || undefined);
}

/**
 * Imports a TO's CSV exports: standings (players, placements, deck names, records, optional
 * decklist cells), pairings (round-by-round results) and decklists (long format, one card per
 * row). Any subset works as long as it names the players. Columns are mapped automatically
 * unless a mapping is given; names are matched across files ignoring case, accents and
 * punctuation, or by the standings' Player ID.
 */
export function ingestCsv(input: IngestCsvInput): IngestResult {
  const issues: IngestIssue[] = [];
  const standings = input.standings ? readCsv("standings", input.standings, issues) : null;
  const pairings = input.pairings ? readCsv("pairings", input.pairings, issues) : null;
  const decklists = input.decklists ? readCsv("decklists", input.decklists, issues) : null;
  const raw: RawEvent = {
    meta: input.meta,
    standings: (standings ?? []).map((get, index) => ({
      row: index + 1,
      name: get("player") ?? "",
      playerId: get("playerId"),
      placement: get("placement"),
      country: get("country"),
      archetype: get("archetype"),
      record: get("record"),
      wins: get("wins"),
      losses: get("losses"),
      draws: get("draws"),
      points: get("points"),
      dropped: get("dropped"),
      decklist: get("decklist"),
    })),
    pairings: (pairings ?? []).map((get, index) => ({
      row: index + 1,
      round: get("round") ?? "",
      stage: get("stage"),
      table: get("table"),
      player1: get("player1") ?? "",
      player2: get("player2") ?? "",
      result: get("result"),
      winner: get("winner"),
    })),
    decklistRows: (decklists ?? []).map((get, index) => ({
      row: index + 1,
      player: get("player") ?? "",
      quantity: get("quantity") ?? "",
      card: get("card"),
      cardId: get("cardId"),
      section: get("section"),
    })),
  };
  return assembleTournament(raw, issues, input.now);
}

function ingestCanonical(value: unknown, options: IngestJsonOptions): IngestResult {
  const parsed = TournamentSchema.safeParse(value);
  if (!parsed.success) return failed(zodIssues(parsed.error, "json"));
  const data = parsed.data;
  const meta = mergeMeta(
    {
      name: data.name,
      date: data.date,
      tier: data.tier,
      format: data.format,
      location: data.location,
      organizer: data.organizer,
      swissRounds: data.swissRounds,
      topCutSize: data.topCutSize,
      bestOf: data.bestOf,
      notes: data.notes,
    },
    options.metaOverrides,
  );

  const issues: IngestIssue[] = [];
  let fromLabel = 0;
  let inferred = 0;
  const players = data.players.map((player, index) => {
    if (getArchetype(player.archetypeId)) {
      fromLabel++;
      return player;
    }
    const where = { source: "json" as const, row: index + 1, field: `players[${index}].archetypeId` };
    const { archetypeId, from } = assignArchetype({ name: player.name, label: player.archetypeId, decklist: player.decklist }, where, issues);
    if (from === "decklist") inferred++;
    else fromLabel++;
    return { ...player, archetypeId };
  });

  const tournament = canonicalOrder({
    ...data,
    ...meta,
    format: meta.format ?? data.format,
    swissRounds: meta.swissRounds ?? data.swissRounds,
    topCutSize: meta.topCutSize ?? data.topCutSize,
    bestOf: meta.bestOf ?? data.bestOf,
    // Slugified so hand-written ids with spaces, "/" or "#" still make safe URLs and deck ids.
    id: `local-${slugify(data.id.replace(/^local-/, ""), "event")}`,
    players,
    source: "import",
    importedAt: options.now ?? new Date().toISOString(),
  });
  issues.push(...validateTournament(tournament));
  return { tournament, issues: sortIssues(issues), summary: summarize(tournament, issues, fromLabel, inferred) };
}

/**
 * Imports JSON: a canonical tournament record (players and matches) or a scraped export (an
 * event with standings and pairings, see `ScrapedTournamentSchema`). Canonical records keep
 * their ids (slugified, prefixed `local-`) and have non-canonical archetype ids resolved like deck labels.
 */
export function ingestJson(text: string, options: IngestJsonOptions = {}): IngestResult {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failed([{ severity: "error", code: "invalid-json", message: `Not valid JSON: ${reason}`, source: "json" }]);
  }
  switch (detectJsonFormat(value)) {
    case "canonical":
      return ingestCanonical(value, options);
    case "scraped": {
      const { raw, issues } = convertScraped(value);
      if (!raw) return failed(issues);
      return assembleTournament({ ...raw, meta: mergeMeta(raw.meta, options.metaOverrides) }, issues, options.now);
    }
    default:
      return failed([
        {
          severity: "error",
          code: "unknown-json-format",
          message: "Unrecognized JSON: expected a tournament record (players and matches) or a scraped export (an event with standings and pairings).",
          source: "json",
        },
      ]);
  }
}
