import type { Tournament } from "@naruto-tcg/types";
import { ARCHETYPE_INDEX } from "@/lib/data/archetypes";
import { checkDecklistLegality } from "@/lib/decks/legality";
import { BestOfSchema, EventTierSchema } from "./schema";
import { isSlug } from "./slug";
import { isIsoDate } from "./text";
import type { IngestIssue, IngestSeverity } from "./types";

/** True when `values` is exactly 1..N in some order. */
export function isPermutation(values: readonly number[]): boolean {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.every((value, index) => value === index + 1);
}

function placementProblems(placements: readonly number[]): string {
  const counts = new Map<number, number>();
  for (const p of placements) counts.set(p, (counts.get(p) ?? 0) + 1);
  const repeated = [...counts].filter(([, n]) => n > 1).map(([p]) => p).sort((a, b) => a - b);
  const missing = Array.from({ length: placements.length }, (_, i) => i + 1).filter((p) => !counts.has(p));
  const list = (values: number[]) => values.slice(0, 5).join(", ") + (values.length > 5 ? ", …" : "");
  return [repeated.length > 0 ? `repeated: ${list(repeated)}` : "", missing.length > 0 ? `missing: ${list(missing)}` : ""]
    .filter(Boolean)
    .join("; ");
}

/**
 * Structural and consistency checks on a canonical tournament. Errors make the record unusable
 * for stats (broken ids, placements, pairings or archetypes); warnings flag data worth a second
 * look (partial top cut, odd game scores, illegal lists); info notes reduced coverage.
 */
export function validateTournament(tournament: Tournament): IngestIssue[] {
  const issues: IngestIssue[] = [];
  const add = (severity: IngestSeverity, code: string, message: string, field?: string) =>
    issues.push({ severity, code, message, source: "tournament", ...(field ? { field } : {}) });

  if (!tournament.name.trim()) add("error", "missing-name", "The event has no name.", "name");
  if (!isSlug(tournament.id)) {
    add("error", "invalid-id", `Event id "${tournament.id}" must use lowercase letters, digits and single dashes.`, "id");
  }
  if (!isIsoDate(tournament.date)) add("error", "invalid-date", `"${tournament.date}" is not a valid date; use YYYY-MM-DD.`, "date");
  if (!EventTierSchema.safeParse(tournament.tier).success) add("error", "invalid-tier", `Unknown event tier "${tournament.tier}".`, "tier");
  if (!BestOfSchema.safeParse(tournament.bestOf).success) add("error", "invalid-best-of", `Best-of must be 1 or 3, not ${tournament.bestOf}.`, "bestOf");

  const ids = new Set<string>();
  const legalityDate = isIsoDate(tournament.date) ? tournament.date : undefined;
  tournament.players.forEach((player, index) => {
    const field = `players[${index}]`;
    if (ids.has(player.id)) add("error", "duplicate-player-id", `Player id "${player.id}" is used more than once.`, `${field}.id`);
    ids.add(player.id);
    if (!isSlug(player.id)) {
      add("error", "invalid-id", `Player id "${player.id}" must use lowercase letters, digits and single dashes.`, `${field}.id`);
    }
    if (!ARCHETYPE_INDEX.has(player.archetypeId)) {
      add("error", "unknown-archetype", `${player.name}: unknown archetype id "${player.archetypeId}".`, `${field}.archetypeId`);
    }
    if (player.decklist) {
      const problems = checkDecklistLegality(player.decklist, { date: legalityDate });
      if (problems.length > 0) {
        add("warning", "decklist-illegal", `${player.name}'s decklist is not legal: ${problems.map((p) => p.message).join(" ")}`, `${field}.decklist`);
      }
    }
  });
  if (tournament.players.length === 0) add("error", "no-players", "The event has no players.", "players");
  else if (!isPermutation(tournament.players.map((p) => p.placement))) {
    add(
      "error",
      "invalid-placements",
      `Placements must run 1–${tournament.players.length} with no repeats (${placementProblems(tournament.players.map((p) => p.placement))}).`,
      "players",
    );
  }

  if (tournament.matches.length === 0) {
    add("info", "no-pairings", "No pairings: matchup and win-rate stats will not include this event.", "matches");
    return issues;
  }

  const pairedInRound = new Map<number, Set<string>>();
  const maxGames = Math.ceil(tournament.bestOf / 2);
  let maxSwissRound = 0;
  let topCutMatches = 0;
  tournament.matches.forEach((match, index) => {
    const field = `matches[${index}]`;
    const where = `Round ${match.round}${match.table !== undefined ? `, table ${match.table}` : ""}`;
    const players = match.player2Id === null ? [match.player1Id] : [match.player1Id, match.player2Id];
    for (const id of players) {
      if (!ids.has(id)) add("error", "unknown-player", `${where}: unknown player "${id}".`, field);
    }
    if (match.player1Id === match.player2Id) add("error", "self-pairing", `${where}: ${match.player1Id} is paired against themselves.`, field);
    if ((match.player2Id === null) !== (match.outcome === "bye")) {
      add("error", "invalid-bye", `${where}: a bye needs an empty player 2 and the outcome "bye".`, field);
    }
    const paired = pairedInRound.get(match.round) ?? new Set<string>();
    pairedInRound.set(match.round, paired);
    for (const id of players) {
      if (paired.has(id)) add("error", "player-paired-twice", `${where}: ${id} is paired more than once in round ${match.round}.`, field);
      paired.add(id);
    }

    if (match.stage === "swiss") maxSwissRound = Math.max(maxSwissRound, match.round);
    else {
      topCutMatches++;
      if (match.outcome === "draw") add("error", "top-cut-draw", `${where}: top cut matches cannot end in a draw.`, field);
      if (match.round <= tournament.swissRounds) {
        add("warning", "stage-order", `${where}: top cut match in round ${match.round}, not after the ${tournament.swissRounds} Swiss rounds.`, field);
      }
    }

    if (match.games) {
      const { p1, p2 } = match.games;
      const expected = match.outcome === "p1" ? p1 > p2 : match.outcome === "p2" ? p2 > p1 : match.outcome === "draw" ? p1 === p2 : false;
      if (!expected) add("warning", "games-mismatch", `${where}: game score ${p1}-${p2} does not match the outcome "${match.outcome}".`, field);
      else if (Math.max(p1, p2) > maxGames) {
        add("warning", "games-exceed-best-of", `${where}: game score ${p1}-${p2} is not possible in a best-of-${tournament.bestOf}.`, field);
      }
    }
    if (match.intentionalDraw && match.outcome !== "draw") {
      add("warning", "intentional-draw-outcome", `${where}: flagged as an intentional draw but the outcome is "${match.outcome}".`, field);
    }
  });

  if (maxSwissRound > tournament.swissRounds) {
    add("warning", "swiss-rounds-mismatch", `Pairings reach Swiss round ${maxSwissRound} but the event lists ${tournament.swissRounds} Swiss rounds.`, "swissRounds");
  }
  const expectedCut = tournament.topCutSize > 1 ? tournament.topCutSize - 1 : 0;
  if (topCutMatches < expectedCut) {
    add(
      "warning",
      "partial-top-cut",
      `Top ${tournament.topCutSize} needs ${expectedCut} top cut matches but ${topCutMatches} were recorded; missing rounds fall back to Swiss order in the placements.`,
      "matches",
    );
  } else if (topCutMatches > expectedCut) {
    add("warning", "top-cut-size-mismatch", `${topCutMatches} top cut matches were recorded for a top cut of ${tournament.topCutSize}.`, "topCutSize");
  }
  if (tournament.topCutSize > tournament.players.length) {
    add("warning", "top-cut-too-large", `Top cut of ${tournament.topCutSize} is larger than the ${tournament.players.length}-player field.`, "topCutSize");
  }
  return issues;
}
