import type { Decklist, MatchRecord, MatchStage, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { getArchetype, ROGUE_ID } from "@/lib/data/archetypes";
import { formatForDate } from "@/lib/data/cards";
import type { WLD } from "@/lib/meta/types";
import { computeFinalPlacements, computeRecords, emptyRecord, formatRecord, matchPoints, topCutRounds } from "@/lib/tournament/standings";
import { classifyDecklist, resolveArchetypeLabel } from "./archetypes";
import { createCardResolver, FUZZY_CARD_LOOKUPS, type CardResolver } from "./cards";
import { buildDecklist, parseDecklistText, parseQuantity, parseSection, type DecklistLine } from "./decklist-text";
import { isByeToken, parseMatchResult, parseRecord, parseRoundLabel, parseStage, type ParsedMatchResult } from "./results";
import { bracketConflicts, bracketPlacements } from "./bracket";
import { idSlug, uniqueSlug } from "./slug";
import { clip, closestMatches, isIsoDate, normalizeName, stripControlCharacters } from "./text";
import { sortIssues, type EventMetaInput, type IngestIssue, type IngestResult, type IngestSource, type IngestSummary, type RawEvent } from "./types";
import { describeConflicts, isPermutation, validateTournament } from "./validate";

/** Similarity at which a misspelled name in pairings or decklists is matched to a known player. */
const PLAYER_FUZZY_THRESHOLD = 0.85;
/** Similarity from which an unknown name gets a "Did you mean" suggestion. */
const SUGGESTION_FLOOR = 0.5;
/**
 * Distinct unknown names that get a suggestion. Past it only close matches are looked for, which
 * is much cheaper: a file full of different unknown names would otherwise cost names × players.
 */
const SUGGESTED_NAMES = 50;
/**
 * Name comparisons fuzzy matching may make per import (about a second of work). Real events stay
 * far below it (512 players spelled differently in every file take about 260,000); past it,
 * names are only matched exactly.
 */
const MAX_FUZZY_COMPARISONS = 3_000_000;
/** Classifier confidence at which a list that contradicts the reported deck name is flagged. */
const MISMATCH_CONFIDENCE = 0.8;

/** Player being assembled, with what the standings reported about them. */
interface Draft {
  id: string;
  name: string;
  row?: number;
  playerId?: string;
  country?: string;
  label?: string;
  dropped: boolean;
  placement?: number;
  record?: WLD;
  points?: number;
  decklist?: Decklist;
}

interface PairingDraft {
  row: number;
  round: number;
  /** Bracket size from a "Top 8"-style label; the round number is assigned later. */
  cutSize?: number;
  stage?: MatchStage;
  table?: number;
  p1: Draft;
  p2: Draft | null;
  result: ParsedMatchResult;
}

type Roster = ReturnType<typeof createRoster>;

export function failed(issues: IngestIssue[]): IngestResult {
  return {
    tournament: null,
    issues: sortIssues(issues),
    summary: { players: 0, matches: 0, decklists: 0, archetypesFromLabel: 0, archetypesInferred: 0, rogue: 0, unknownCards: 0 },
  };
}

/** Outcome of a fuzzy lookup for a name that matched no player exactly. */
interface Miss {
  /** The single close player, accepted with a warning. */
  fuzzy: Draft | null;
  /** "A and B" when two players are equally close. */
  tied: string | null;
  /** Best candidate for a "Did you mean" suggestion. */
  suggestion: string | null;
}

/**
 * Players by every name and handle they go by. A name shared by two players is ambiguous. Names
 * that miss are fuzzy-matched once each (every player is added before the first lookup), so
 * cost grows with the distinct names, not the rows.
 */
function createRoster(issues: IngestIssue[]) {
  const drafts: Draft[] = [];
  /** Each player's normalized display name, for fuzzy matching. */
  const candidates: Array<{ candidate: Draft; key: string }> = [];
  const usedIds = new Set<string>();
  const keys = new Map<string, Draft | null>();
  const misses = new Map<string, Miss>();
  const reported = new Set<string>();
  const register = (key: string, draft: Draft) => {
    if (!key) return;
    const existing = keys.get(key);
    keys.set(key, existing === undefined || existing === draft ? draft : null);
  };
  /** The player for a name or handle; null when ambiguous, undefined when unknown. */
  const find = (text: string): Draft | null | undefined => keys.get(normalizeName(text));
  let suggested = 0;
  let comparisons = 0;
  const miss = (key: string, source: IngestSource): Miss => {
    const cached = misses.get(key);
    if (cached) return cached;
    if (comparisons >= MAX_FUZZY_COMPARISONS) return { fuzzy: null, tied: null, suggestion: null };
    comparisons += candidates.length;
    if (comparisons >= MAX_FUZZY_COMPARISONS) {
      issues.push({
        severity: "info",
        code: "player-matching-limited",
        message: "So many names did not match a player exactly that, from here on, names are only matched exactly (no typo matching or suggestions).",
        source,
      });
    }
    const floor = suggested < SUGGESTED_NAMES ? SUGGESTION_FLOOR : PLAYER_FUZZY_THRESHOLD;
    const { best, runnerUp } = closestMatches(key, candidates, floor);
    const fuzzy = best && best.score >= PLAYER_FUZZY_THRESHOLD ? best.candidate : null;
    const tied = fuzzy && runnerUp && runnerUp.score >= PLAYER_FUZZY_THRESHOLD ? `${fuzzy.name} and ${runnerUp.candidate.name}` : null;
    if (!fuzzy) suggested++;
    const result = { fuzzy: tied ? null : fuzzy, tied, suggestion: best ? best.candidate.name : null };
    misses.set(key, result);
    return result;
  };

  return {
    drafts,
    find,
    /** Adds a player under a unique, length-capped slug of `idSource`. */
    add(fields: Omit<Draft, "id">, idSource: string): Draft {
      const draft = { ...fields, id: uniqueSlug(idSlug(idSource), usedIds) };
      drafts.push(draft);
      candidates.push({ candidate: draft, key: normalizeName(draft.name) });
      for (const text of [draft.name, draft.playerId, draft.id]) register(normalizeName(text ?? ""), draft);
      return draft;
    },
    /**
     * Resolves a name from the pairings or decklists, accepting a misspelling with a warning when
     * it is close to exactly one player. Unknown and ambiguous names are errors, reported once per
     * name and file.
     */
    resolve(text: string, source: IngestSource, row: number, field: string): Draft | null {
      const key = normalizeName(text);
      const hit = keys.get(key);
      if (hit) return hit;
      const firstReport = !reported.has(`${source}|${key}`);
      reported.add(`${source}|${key}`);
      const { fuzzy, tied, suggestion } = hit === undefined ? miss(key, source) : { fuzzy: null, tied: null, suggestion: null };
      if (hit === null || tied) {
        if (firstReport) {
          issues.push({
            severity: "error",
            code: "ambiguous-player",
            message: tied
              ? `"${clip(text)}" is close to more than one player (${tied}); rows with this name were skipped.`
              : `"${clip(text)}" matches more than one player; rows with this name were skipped.`,
            suggestion: "Refer to these players by their Player ID.",
            source,
            row,
            field,
          });
        }
        return null;
      }
      if (fuzzy) {
        issues.push({ severity: "warning", code: "player-fuzzy-match", message: `Matched "${clip(text)}" to ${fuzzy.name}.`, source, row, field });
        // Later rows with this spelling are exact hits, with no further warning.
        register(key, fuzzy);
        return fuzzy;
      }
      if (firstReport) {
        issues.push({
          severity: "error",
          code: "unknown-player",
          message: `"${clip(text)}" is not in the standings; rows with this player were skipped.`,
          ...(suggestion ? { suggestion: `Did you mean "${suggestion}"?` } : {}),
          source,
          row,
          field,
        });
      }
      return null;
    },
  };
}

const parseInteger = (raw: string | undefined) => (raw && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : undefined);

/** Leading number of a placement cell ("1", "1st"); undefined for labels such as "T8". */
function parsePlacement(raw: string | undefined): number | undefined {
  const match = raw?.trim().match(/^(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function parseDropped(raw: string | undefined): boolean {
  const key = normalizeName(raw ?? "");
  return key !== "" && !["no", "n", "false", "0", "none"].includes(key);
}

function normalizeCountry(raw: string | undefined): string | undefined {
  const text = raw?.trim();
  if (!text) return undefined;
  return /^[a-z]{2,3}$/i.test(text) ? text.toUpperCase() : text;
}

const sameRecord = (a: WLD, b: WLD) => a.wins === b.wins && a.losses === b.losses && a.draws === b.draws;

function compareMatches(a: MatchRecord, b: MatchRecord): number {
  return (
    a.round - b.round ||
    (a.table ?? Number.POSITIVE_INFINITY) - (b.table ?? Number.POSITIVE_INFINITY) ||
    (a.player1Id < b.player1Id ? -1 : a.player1Id > b.player1Id ? 1 : 0)
  );
}

/** The record with keys in canonical order and players/matches sorted, as the seed files store it. */
export function canonicalOrder(t: Tournament): Tournament {
  return {
    id: t.id,
    name: t.name,
    tier: t.tier,
    format: t.format,
    date: t.date,
    location: t.location,
    organizer: t.organizer,
    swissRounds: t.swissRounds,
    topCutSize: t.topCutSize,
    bestOf: t.bestOf,
    source: t.source,
    ...(t.importedAt ? { importedAt: t.importedAt } : {}),
    ...(t.notes ? { notes: t.notes } : {}),
    players: [...t.players].sort((a, b) => a.placement - b.placement),
    matches: [...t.matches].sort(compareMatches),
  };
}

export function summarize(t: Tournament, issues: readonly IngestIssue[], fromLabel: number, inferred: number): IngestSummary {
  return {
    players: t.players.length,
    matches: t.matches.length,
    decklists: t.players.filter((p) => p.decklist).length,
    archetypesFromLabel: fromLabel,
    archetypesInferred: inferred,
    rogue: t.players.filter((p) => p.archetypeId === ROGUE_ID).length,
    unknownCards: issues.filter((issue) => issue.code === "unknown-card").length,
  };
}

/**
 * One player's archetype: a recognized deck label, else the decklist classifier, else rogue.
 * Warns about fuzzy and unknown labels, and about lists the classifier confidently reads as
 * a different archetype than the label.
 */
export function assignArchetype(
  player: { name: string; label?: string; decklist?: Decklist },
  where: Pick<IngestIssue, "source" | "row" | "field">,
  issues: IngestIssue[],
): { archetypeId: string; from: "label" | "decklist" | null } {
  const label = player.label?.trim();
  const classified = player.decklist ? classifyDecklist(player.decklist) : null;
  const nameOf = (id: string) => getArchetype(id)?.name ?? id;
  if (label) {
    const resolved = resolveArchetypeLabel(label);
    if (resolved.method !== "unknown") {
      if (resolved.method === "fuzzy") {
        issues.push({
          severity: "warning",
          code: "archetype-fuzzy-match",
          message: `${player.name}: read deck "${label}" as ${nameOf(resolved.archetypeId)}.`,
          ...where,
        });
      }
      if (classified && classified.archetypeId !== resolved.archetypeId && classified.confidence >= MISMATCH_CONFIDENCE) {
        issues.push({
          severity: "warning",
          code: "archetype-mismatch",
          message: `${player.name}: reported as ${nameOf(resolved.archetypeId)} but the decklist looks like ${nameOf(classified.archetypeId)}.`,
          ...where,
        });
      }
      return { archetypeId: resolved.archetypeId, from: "label" };
    }
    issues.push({
      severity: "warning",
      code: "unknown-archetype-label",
      message: classified
        ? `${player.name}: unknown deck "${label}"; classified from the decklist as ${nameOf(classified.archetypeId)}.`
        : `${player.name}: unknown deck "${label}"; recorded as Rogue.`,
      suggestion: 'Use an archetype name such as "Pain", "Sage Naruto" or "Rogue".',
      ...where,
    });
  }
  if (classified) return { archetypeId: classified.archetypeId, from: "decklist" };
  return { archetypeId: ROGUE_ID, from: label ? "label" : null };
}

/** Adds a player per standings row, skipping nameless rows and reporting duplicates. */
function readStandings(standings: RawEvent["standings"], roster: Roster, cards: CardResolver, issues: IngestIssue[]): void {
  const seen = new Map<string, number>();
  for (const standing of standings) {
    const name = standing.name.trim();
    const where = { source: "standings" as const, row: standing.row };
    if (!name) {
      issues.push({ severity: "warning", code: "missing-player-name", message: "Row has no player name; skipped.", ...where });
      continue;
    }
    // A row without a Player ID duplicates any earlier row with the same name.
    const playerId = standing.playerId?.trim() || undefined;
    const identity = playerId ? `id:${normalizeName(playerId)}` : `name:${normalizeName(name)}`;
    const duplicateOf = seen.get(identity);
    if (duplicateOf !== undefined) {
      issues.push({
        severity: "error",
        code: "duplicate-player",
        message: `"${name}" appears more than once in the standings (rows ${duplicateOf} and ${standing.row}); row ${standing.row} was skipped.`,
        suggestion: "Remove the duplicate row, or add Player IDs if these are different people.",
        ...where,
      });
      continue;
    }
    seen.set(identity, standing.row);
    if (!seen.has(`name:${normalizeName(name)}`)) seen.set(`name:${normalizeName(name)}`, standing.row);

    const record = parseRecord(standing.record);
    if (standing.record && !record) {
      issues.push({ severity: "warning", code: "invalid-record", message: `${name}: cannot read record "${standing.record}".`, ...where, field: "record" });
    }
    const [wins, losses, draws] = [standing.wins, standing.losses, standing.draws].map(parseInteger);
    const counted = wins !== undefined || losses !== undefined || draws !== undefined;
    const parsedList = standing.decklist?.trim()
      ? parseDecklistText(standing.decklist, { ...where, field: "decklist", owner: name, resolver: cards })
      : null;
    issues.push(...(parsedList?.issues ?? []));
    roster.add(
      {
        name,
        row: standing.row,
        playerId,
        country: normalizeCountry(standing.country),
        label: standing.archetype,
        dropped: parseDropped(standing.dropped),
        placement: parsePlacement(standing.placement),
        record: record ?? (counted ? { wins: wins ?? 0, losses: losses ?? 0, draws: draws ?? 0 } : undefined),
        points: parseInteger(standing.points),
        decklist: parsedList?.decklist ?? undefined,
      },
      playerId ?? name,
    );
  }
}

/** Groups long-format decklist rows by player and attaches the resulting lists. */
function readDecklistRows(rows: RawEvent["decklistRows"], roster: Roster, cards: CardResolver, issues: IngestIssue[]): void {
  const lines = new Map<Draft, DecklistLine[]>();
  for (const row of rows) {
    if (!row.player.trim()) {
      issues.push({ severity: "warning", code: "missing-player-name", message: "Row has no player name; skipped.", source: "decklists", row: row.row, field: "player" });
      continue;
    }
    const draft = roster.resolve(row.player, "decklists", row.row, "player");
    if (!draft) continue;
    const card = row.card && row.cardId ? `${row.card} (${row.cardId})` : row.cardId || row.card || "";
    if (!card) {
      issues.push({ severity: "warning", code: "missing-card", message: "Row has no card name or id; skipped.", source: "decklists", row: row.row });
      continue;
    }
    const section = row.section ? parseSection(row.section) : null;
    const list = lines.get(draft) ?? [];
    list.push({
      quantity: parseQuantity(row.quantity),
      card,
      row: row.row,
      ...(section ? { section } : {}),
      ...(section === "leader" ? { leader: true } : {}),
    });
    lines.set(draft, list);
  }
  for (const [draft, list] of lines) {
    const parsed = buildDecklist(list, { source: "decklists", owner: draft.name, resolver: cards });
    issues.push(...parsed.issues);
    if (!parsed.decklist) continue;
    if (draft.decklist) {
      issues.push({
        severity: "warning",
        code: "duplicate-decklist",
        message: `${draft.name} has a list in both the standings and the decklists file; used the decklists file.`,
        source: "decklists",
      });
    }
    draft.decklist = parsed.decklist;
  }
}

/** Reads each pairing row into a pairing draft; rows with unknown players or results are skipped. */
function readPairings(pairings: RawEvent["pairings"], roster: Roster, issues: IngestIssue[]): PairingDraft[] {
  const drafts: PairingDraft[] = [];
  const unknownStages = new Set<string>();
  for (const pairing of pairings) {
    const where = { source: "pairings" as const, row: pairing.row };
    const label = parseRoundLabel(pairing.round);
    if (!label) {
      issues.push({ severity: "error", code: "invalid-round", message: `Cannot read round "${pairing.round}"; row skipped.`, ...where, field: "round" });
      continue;
    }
    let [name1, name2] = [pairing.player1.trim(), pairing.player2.trim()];
    if (isByeToken(name1)) [name1, name2] = [name2, ""];
    if (isByeToken(name1)) {
      issues.push({ severity: "warning", code: "empty-pairing", message: "Pairing row has no players; skipped.", ...where });
      continue;
    }
    const bye = isByeToken(name2);
    const p1 = roster.resolve(name1, "pairings", pairing.row, "player1");
    const p2 = bye ? null : roster.resolve(name2, "pairings", pairing.row, "player2");
    if (!p1 || (!bye && !p2)) continue;

    const winner = pairing.winner ? roster.find(pairing.winner) : undefined;
    const winnerName = winner && winner === p1 ? name1 : winner && winner === p2 ? name2 : pairing.winner;
    const result: ParsedMatchResult | null = bye
      ? { outcome: "bye" }
      : parseMatchResult(pairing.result, { winnerName, player1Name: name1, player2Name: name2 });
    if (!result) {
      const winnerNote = pairing.winner ? ` / winner "${pairing.winner}"` : "";
      issues.push({
        severity: "error",
        code: "invalid-result",
        message: `Round ${pairing.round}, ${name1} vs ${name2}: cannot read result "${pairing.result ?? ""}"${winnerNote}; row skipped.`,
        suggestion: 'Use "2-1", "W", "L", "D", "ID" or a winner name, from player 1\'s point of view.',
        ...where,
        field: "result",
      });
      continue;
    }
    if (!bye && result.outcome === "bye") {
      issues.push({ severity: "error", code: "invalid-bye", message: `Round ${pairing.round}: result "bye" but player 2 is ${name2}; row skipped.`, ...where, field: "result" });
      continue;
    }

    let stage = pairing.stage ? (parseStage(pairing.stage) ?? undefined) : undefined;
    if (pairing.stage && !stage && !unknownStages.has(pairing.stage)) {
      unknownStages.add(pairing.stage);
      issues.push({ severity: "warning", code: "unknown-stage", message: `Unknown stage "${pairing.stage}"; inferred from the round number.`, ...where, field: "stage" });
    }
    if ("cutSize" in label) stage = "top-cut";
    const table = parseInteger(pairing.table);
    drafts.push({
      row: pairing.row,
      round: "round" in label ? label.round : 0,
      ...("cutSize" in label ? { cutSize: label.cutSize } : {}),
      ...(stage ? { stage } : {}),
      ...(table ? { table } : {}),
      p1,
      p2,
      result,
    });
  }
  return drafts;
}

/**
 * Trailing rounds that look like a single-elimination bracket: 1, 2, 4… matches going backwards,
 * no byes or draws, each round seating fewer than all players, and each round's winners being
 * exactly the next round's players. At least one Swiss round remains.
 */
function inferCutRounds(pairings: readonly PairingDraft[], playerCount: number): number {
  const rounds = new Map<number, PairingDraft[]>();
  for (const p of pairings) {
    const round = rounds.get(p.round);
    if (round) round.push(p);
    else rounds.set(p.round, [p]);
  }
  const order = [...rounds.keys()].sort((a, b) => a - b);
  const last = order[order.length - 1]!;
  let cut = 0;
  let nextPlayers: ReadonlySet<Draft> | null = null;
  for (let i = order.length - 1, expected = 1; i > 0; i--, expected *= 2) {
    const round = rounds.get(order[i]!)!;
    const clean = round.every((p) => p.p2 !== null && (p.result.outcome === "p1" || p.result.outcome === "p2"));
    if (order[i] !== last - cut || !clean || round.length !== expected || round.length * 2 >= playerCount) break;
    const winners = round.map((p) => (p.result.outcome === "p1" ? p.p1 : p.p2!));
    const later = nextPlayers;
    if (later && (new Set(winners).size !== later.size || winners.some((winner) => !later.has(winner)))) break;
    nextPlayers = new Set(round.flatMap((p) => [p.p1, p.p2!]));
    cut++;
  }
  return cut;
}

/**
 * Gives every pairing a round number and stage. Stages come from the stage column or a top cut
 * round label; otherwise rounds after `meta.swissRounds` (or from the first explicitly top cut
 * round on) are top cut, and with no stage information at all a trailing bracket-shaped run of
 * rounds is. Top cut rounds numbered from 1 again are moved after Swiss. Returns the Swiss
 * round count and top cut size (from meta when given).
 */
function assignRoundsAndStages(
  pairings: PairingDraft[],
  meta: EventMetaInput,
  playerCount: number,
  issues: IngestIssue[],
): { swissRounds: number; topCutSize: number } {
  const numbered = pairings.filter((p) => p.cutSize === undefined);
  const explicitCut = numbered.filter((p) => p.stage === "top-cut").map((p) => p.round);

  let boundary = meta.swissRounds;
  if (boundary === undefined && explicitCut.length > 0 && Math.min(...explicitCut) > 1) {
    boundary = Math.min(...explicitCut) - 1;
  } else if (boundary === undefined && numbered.length > 0 && pairings.every((p) => p.stage === undefined)) {
    const maxRound = Math.max(...numbered.map((p) => p.round));
    const cut = inferCutRounds(numbered, playerCount);
    boundary = maxRound - cut;
    if (cut > 0) {
      issues.push({
        severity: "info",
        code: "stage-inferred",
        message: `Rounds ${boundary + 1}–${maxRound} look like a top cut bracket and were recorded as top cut.`,
        suggestion: "Add a Stage column or set the number of Swiss rounds to be explicit.",
        source: "pairings",
      });
    }
  }
  for (const p of numbered) p.stage ??= boundary !== undefined && p.round > boundary ? "top-cut" : "swiss";

  const swissNumbers = numbered.filter((p) => p.stage === "swiss").map((p) => p.round);
  const lastSwiss = swissNumbers.length > 0 ? Math.max(...swissNumbers) : 0;
  const cutPairings = numbered.filter((p) => p.stage === "top-cut");
  const firstCut = cutPairings.length > 0 ? Math.min(...cutPairings.map((p) => p.round)) : undefined;
  if (firstCut !== undefined && firstCut <= lastSwiss) {
    for (const p of cutPairings) p.round += lastSwiss - firstCut + 1;
    issues.push({
      severity: "info",
      code: "top-cut-renumbered",
      message: `Top cut rounds restart at ${firstCut}; they were renumbered to follow Swiss round ${lastSwiss}.`,
      source: "pairings",
    });
  }

  const swissRounds = meta.swissRounds ?? lastSwiss;
  const labelSizes = pairings.flatMap((p) => (p.cutSize !== undefined ? [p.cutSize] : []));
  const openingRound = cutPairings.length > 0 ? Math.min(...cutPairings.map((p) => p.round)) : undefined;
  const openingSize = openingRound === undefined ? 0 : 2 * cutPairings.filter((p) => p.round === openingRound).length;
  const topCutSize = meta.topCutSize ?? Math.max(0, openingSize, ...labelSizes);

  const bracketRounds = topCutRounds(Math.max(topCutSize, ...labelSizes));
  for (const p of pairings) {
    if (p.cutSize !== undefined) p.round = swissRounds + Math.max(1, bracketRounds - Math.log2(p.cutSize) + 1);
  }
  return { swissRounds, topCutSize };
}

function toMatch(p: PairingDraft): MatchRecord {
  return {
    round: p.round,
    stage: p.stage ?? "swiss",
    ...(p.table !== undefined ? { table: p.table } : {}),
    player1Id: p.p1.id,
    player2Id: p.p2?.id ?? null,
    outcome: p.result.outcome,
    ...(p.result.games ? { games: p.result.games } : {}),
    ...(p.result.intentionalDraw ? { intentionalDraw: true } : {}),
  };
}

/** Players with archetypes, counting where each archetype came from. */
function buildPlayers(roster: Roster, issues: IngestIssue[], source: IngestSource) {
  let fromLabel = 0;
  let inferred = 0;
  const unlabeled: string[] = [];
  const players = roster.drafts.map((draft): TournamentPlayer => {
    const { archetypeId, from } = assignArchetype(draft, { source: "standings", row: draft.row, field: "archetype" }, issues);
    if (from === "label") fromLabel++;
    else if (from === "decklist") inferred++;
    else unlabeled.push(draft.name);
    return {
      id: draft.id,
      name: draft.name,
      ...(draft.country ? { country: draft.country } : {}),
      archetypeId,
      placement: 0,
      ...(draft.dropped ? { dropped: true } : {}),
      ...(draft.decklist ? { decklist: draft.decklist } : {}),
    };
  });
  if (unlabeled.length > 0) {
    const names = unlabeled.slice(0, 5).join(", ") + (unlabeled.length > 5 ? ` and ${unlabeled.length - 5} more` : "");
    issues.push({
      severity: "warning",
      code: "missing-archetype",
      message: `No deck name or decklist for ${unlabeled.length} player${unlabeled.length === 1 ? "" : "s"} (${names}); recorded as Rogue.`,
      suggestion: "Add an Archetype column to the standings or upload decklists.",
      source,
    });
  }
  return { players, fromLabel, inferred };
}

/**
 * Placements from the standings column when it is a clean 1..N that the top cut results do not
 * contradict, else from the results (or row order). A column that contradicts the bracket (often
 * Swiss ranks exported as placements) keeps its order only within each bracket band and outside
 * the cut.
 */
function assignPlacements(
  players: TournamentPlayer[],
  roster: Roster,
  matches: MatchRecord[],
  cut: { swissRounds: number; topCutSize: number },
  placementColumn: boolean,
  issues: IngestIssue[],
): void {
  const reported = roster.drafts.map((draft) => draft.placement);
  if (reported.every((p): p is number => p !== undefined) && isPermutation(reported)) {
    players.forEach((player, index) => (player.placement = reported[index]!));
    const conflicts = bracketConflicts({ players, matches, ...cut });
    if (conflicts.length === 0) return;
    const placements = bracketPlacements(players, matches, new Map(players.map((p) => [p.id, p.placement])));
    for (const player of players) player.placement = placements.get(player.id)!;
    issues.push({
      severity: "warning",
      code: "placements-recomputed",
      message: `The placement column contradicts the top cut results: ${describeConflicts(conflicts)} Top cut players were re-placed by how far they got in the bracket; the column's order is kept within each round and outside the cut.`,
      suggestion: "Export the final standings rather than the Swiss standings.",
      source: "standings",
      field: "placement",
    });
    return;
  }
  if (placementColumn) {
    issues.push({
      severity: "warning",
      code: "placements-recomputed",
      message: `The placement column is not 1–${players.length} without repeats; placements were ${matches.length > 0 ? "recomputed from the pairings" : "taken from the row order"}.`,
      source: "standings",
      field: "placement",
    });
  }
  if (matches.length === 0) {
    players.forEach((player, index) => (player.placement = index + 1));
    return;
  }
  const computed = computeFinalPlacements({ players, matches, topCutSize: cut.topCutSize });
  for (const player of players) player.placement = computed.get(player.id)!;
}

/**
 * Flags reported records and points that neither the Swiss nor the overall results reproduce.
 * Skipped when the pairings hold no Swiss matches (e.g. a bracket-only export).
 */
function crossCheckRecords(roster: Roster, matches: readonly MatchRecord[], issues: IngestIssue[]): void {
  if (!matches.some((match) => match.stage === "swiss")) return;
  const overall = computeRecords(matches);
  const swiss = computeRecords(matches, { stage: "swiss" });
  for (const draft of roster.drafts) {
    const all = overall.get(draft.id) ?? emptyRecord();
    const swissOnly = swiss.get(draft.id) ?? emptyRecord();
    const where = { source: "standings" as const, row: draft.row };
    if (draft.record && !sameRecord(draft.record, all) && !sameRecord(draft.record, swissOnly)) {
      issues.push({
        severity: "warning",
        code: "record-mismatch",
        message: `${draft.name}: the standings say ${formatRecord(draft.record)} but the pairings give ${formatRecord(all)}.`,
        ...where,
        field: "record",
      });
    }
    if (draft.points !== undefined && draft.points !== matchPoints(swissOnly) && draft.points !== matchPoints(all)) {
      issues.push({
        severity: "warning",
        code: "points-mismatch",
        message: `${draft.name}: the standings say ${draft.points} points but the pairings give ${matchPoints(swissOnly)}.`,
        ...where,
        field: "points",
      });
    }
  }
}

/**
 * Builds a tournament from pipeline rows; every CSV and scraped-JSON import ends here. Players
 * come from the standings (or the pairings when there are none), decklists and matches are
 * matched to them by name or handle, then archetypes, placements and the record cross-check
 * are derived and the result is validated.
 */
export function assembleTournament(raw: RawEvent, issues: IngestIssue[], now?: string): IngestResult {
  const { meta } = raw;
  const roster = createRoster(issues);
  const cards = createCardResolver();
  readStandings(raw.standings, roster, cards, issues);
  if (raw.standings.length === 0) {
    for (const name of raw.pairings.flatMap((p) => [p.player1.trim(), p.player2.trim()])) {
      if (!isByeToken(name) && roster.find(name) === undefined) roster.add({ name, dropped: false }, name);
    }
    if (roster.drafts.length > 0) {
      issues.push({ severity: "info", code: "players-from-pairings", message: "No standings: players were taken from the pairings and placed by their results." });
    }
  }
  if (roster.drafts.length === 0) {
    issues.push({ severity: "error", code: "no-players", message: "No players found: add a standings file (or pairings) with player names." });
    return failed(issues);
  }
  readDecklistRows(raw.decklistRows, roster, cards, issues);
  if (cards.exhausted) {
    issues.push({
      severity: "info",
      code: "card-matching-limited",
      message: `More than ${FUZZY_CARD_LOOKUPS} different card names were not found exactly; past that, cards were matched by exact name or id only.`,
      source: raw.decklistRows.length > 0 ? "decklists" : "standings",
    });
  }

  const pairings = readPairings(raw.pairings, roster, issues);
  const { swissRounds, topCutSize } = assignRoundsAndStages(pairings, meta, roster.drafts.length, issues);
  const matches = pairings.map(toMatch).sort(compareMatches);

  const { players, fromLabel, inferred } = buildPlayers(roster, issues, raw.standings.length > 0 ? "standings" : "pairings");
  assignPlacements(players, roster, matches, { swissRounds, topCutSize }, raw.standings.some((s) => s.placement?.trim()), issues);
  crossCheckRecords(roster, matches, issues);

  const date = meta.date.trim();
  const name = stripControlCharacters(meta.name).trim();
  const tournament = canonicalOrder({
    // Each part is length-capped, so a long name still gives a short, stable id.
    id: `local-${idSlug(name, "event")}-${isIsoDate(date) ? date : idSlug(date, "undated")}`,
    name,
    tier: meta.tier,
    format: meta.format?.trim() || (isIsoDate(date) ? formatForDate(date) : ""),
    date,
    location: meta.location,
    organizer: meta.organizer.trim(),
    swissRounds,
    topCutSize,
    bestOf: meta.bestOf ?? 3,
    source: "import",
    importedAt: now ?? new Date().toISOString(),
    ...(meta.notes?.trim() ? { notes: meta.notes.trim() } : {}),
    players,
    matches,
  });
  issues.push(...validateTournament(tournament));
  return { tournament, issues: sortIssues(issues), summary: summarize(tournament, issues, fromLabel, inferred) };
}
