import type { Decklist, EventLocation, EventTier, MatchOutcome, MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { ROGUE_ID } from "@/lib/data/archetypes";

/** Directory row for an event: everything the list shows, nothing per-match. Plain and serializable. */
export interface TournamentSummary {
  id: string;
  name: string;
  tier: EventTier;
  date: string;
  location: EventLocation;
  organizer: string;
  format: string;
  players: number;
  swissRounds: number;
  topCutSize: number;
  /** Matches actually played; byes are not matches. */
  matches: number;
  /** Players with a published decklist. */
  decklists: number;
  winner: { id: string; name: string; archetypeId: string } | null;
  /** Archetype of each top cut player, champion first. */
  topCutArchetypeIds: string[];
  source: Tournament["source"];
}

const EVENT_TIERS: readonly EventTier[] = ["national-championship", "regional-championship", "online-open", "store-championship"];

const OUTCOMES: readonly MatchOutcome[] = ["p1", "p2", "draw"];
const LOCATION_TEXT = ["city", "region", "country", "venue"] as const;

type Loose = Record<string, unknown>;

const isRecord = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
const text = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value : fallback);
const isId = (value: unknown): value is string => typeof value === "string" && value !== "";
const isPositiveInt = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1;
const isScore = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isOptional = (value: unknown, type: "string" | "number" | "boolean") =>
  value === undefined || (typeof value === type && (type !== "number" || Number.isFinite(value)));

function normalizeLocation(value: unknown): EventLocation {
  if (!isRecord(value)) return {};
  const valid = LOCATION_TEXT.every((key) => isOptional(value[key], "string")) && isOptional(value.online, "boolean");
  if (valid) return value as EventLocation;
  const location: EventLocation = {};
  for (const key of LOCATION_TEXT) if (typeof value[key] === "string") location[key] = value[key];
  if (value.online === true) location.online = true;
  return location;
}

/** The list itself, its card entries without broken rows, or undefined when it is unusable. */
function normalizeDecklist(value: unknown): Decklist | undefined {
  if (!isRecord(value) || !isId(value.leaderId) || !Array.isArray(value.cards)) return undefined;
  const cards = value.cards.filter((entry) => isRecord(entry) && isId(entry.cardId) && isPositiveInt(entry.quantity));
  return cards.length === value.cards.length ? (value as unknown as Decklist) : { leaderId: value.leaderId, cards: cards as Decklist["cards"] };
}

/** The player itself when well formed, a repaired copy (placement 0 = unknown), or null without an id. */
function normalizePlayer(value: unknown): TournamentPlayer | null {
  if (!isRecord(value) || !isId(value.id)) return null;
  const decklist = normalizeDecklist(value.decklist);
  const valid =
    typeof value.name === "string" &&
    isId(value.archetypeId) &&
    isPositiveInt(value.placement) &&
    isOptional(value.country, "string") &&
    isOptional(value.dropped, "boolean") &&
    decklist === value.decklist;
  if (valid) return value as unknown as TournamentPlayer;
  return {
    id: value.id,
    name: text(value.name, value.id),
    archetypeId: isId(value.archetypeId) ? value.archetypeId : ROGUE_ID,
    placement: isPositiveInt(value.placement) ? value.placement : 0,
    ...(typeof value.country === "string" ? { country: value.country } : {}),
    ...(value.dropped === true ? { dropped: true } : {}),
    ...(decklist ? { decklist } : {}),
  };
}

/** The match itself when well formed, a repaired copy, or null when it cannot be read. */
function normalizeMatch(value: unknown): MatchRecord | null {
  if (!isRecord(value) || !isId(value.player1Id) || !isPositiveInt(value.round)) return null;
  const bye = value.outcome === "bye" || !isId(value.player2Id);
  const outcome = bye ? "bye" : OUTCOMES.find((o) => o === value.outcome);
  if (!outcome) return null;
  const games = isRecord(value.games) && isScore(value.games.p1) && isScore(value.games.p2) ? value.games : undefined;
  const valid =
    value.outcome === outcome &&
    (value.stage === "swiss" || value.stage === "top-cut") &&
    isOptional(value.table, "number") &&
    (bye ? value.player2Id === null : true) &&
    games === value.games &&
    isOptional(value.intentionalDraw, "boolean");
  if (valid) return value as unknown as MatchRecord;
  return {
    round: value.round,
    stage: value.stage === "top-cut" ? "top-cut" : "swiss",
    ...(typeof value.table === "number" && Number.isFinite(value.table) ? { table: value.table } : {}),
    player1Id: value.player1Id,
    player2Id: bye ? null : (value.player2Id as string),
    outcome,
    ...(games ? { games: { p1: games.p1 as number, p2: games.p2 as number } } : {}),
    ...(value.intentionalDraw === true ? { intentionalDraw: true } : {}),
  };
}

/** Repaired players: the first entry per id wins; unknown placements go after the known ones, in list order. */
function normalizePlayers(values: readonly unknown[]): TournamentPlayer[] {
  const seen = new Set<string>();
  const players: TournamentPlayer[] = [];
  for (const value of values) {
    const player = normalizePlayer(value);
    if (!player || seen.has(player.id)) continue;
    seen.add(player.id);
    players.push(player);
  }
  let next = players.reduce((max, p) => Math.max(max, p.placement), 0);
  return players.map((p) => (p.placement > 0 ? p : { ...p, placement: ++next }));
}

const sameItems = <T>(a: readonly T[], b: readonly unknown[]) => a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * Repairs what a browser-stored record can lack or get wrong (older or hand-edited imports) so
 * the views never crash on it: missing or mistyped event fields, players without ids or with
 * broken decklists, unreadable matches, non-text notes. Complete records, such as seed events
 * and wizard output, are returned as is (same object).
 */
export function normalizeTournament(tournament: Tournament): Tournament {
  const t = tournament as unknown as Loose & Pick<Tournament, "id" | "name" | "date">;
  const rawPlayers: readonly unknown[] = Array.isArray(t.players) ? t.players : [];
  const rawMatches: readonly unknown[] = Array.isArray(t.matches) ? t.matches : [];
  const tier = EVENT_TIERS.includes(t.tier as EventTier) ? (t.tier as EventTier) : "store-championship";
  const location = normalizeLocation(t.location);
  const players = normalizePlayers(rawPlayers);
  const matches = rawMatches.map(normalizeMatch).filter((m): m is MatchRecord => m !== null);
  const complete =
    tier === t.tier &&
    location === t.location &&
    typeof t.format === "string" &&
    typeof t.organizer === "string" &&
    count(t.swissRounds) === t.swissRounds &&
    count(t.topCutSize) === t.topCutSize &&
    (t.bestOf === 1 || t.bestOf === 3) &&
    (t.source === "seed" || t.source === "import") &&
    isOptional(t.notes, "string") &&
    isOptional(t.importedAt, "string") &&
    sameItems(players, rawPlayers) &&
    sameItems(matches, rawMatches);
  if (complete) return tournament;
  const { notes, importedAt, ...rest } = tournament;
  return {
    ...rest,
    tier,
    location,
    format: text(t.format, "Unknown format"),
    organizer: text(t.organizer, "Unknown organizer"),
    swissRounds: count(t.swissRounds),
    topCutSize: count(t.topCutSize),
    bestOf: t.bestOf === 1 ? 1 : 3,
    source: t.source === "seed" ? "seed" : "import",
    players,
    matches,
    ...(typeof notes === "string" ? { notes } : {}),
    ...(typeof importedAt === "string" ? { importedAt } : {}),
  };
}

/** Reduces a tournament record to its directory row. Pure; never touches seed data. */
export function summarize(tournament: Tournament): TournamentSummary {
  const byPlacement = tournament.players.slice().sort((a, b) => a.placement - b.placement);
  const winner = byPlacement[0]?.placement === 1 ? byPlacement[0] : undefined;
  return {
    id: tournament.id,
    name: tournament.name,
    tier: tournament.tier,
    date: tournament.date,
    location: tournament.location,
    organizer: tournament.organizer,
    format: tournament.format,
    players: tournament.players.length,
    swissRounds: tournament.swissRounds,
    topCutSize: tournament.topCutSize,
    matches: tournament.matches.filter((m) => m.outcome !== "bye" && m.player2Id !== null).length,
    decklists: tournament.players.filter((p) => p.decklist).length,
    winner: winner ? { id: winner.id, name: winner.name, archetypeId: winner.archetypeId } : null,
    topCutArchetypeIds:
      tournament.topCutSize > 0
        ? byPlacement.filter((p) => p.placement <= tournament.topCutSize).map((p) => p.archetypeId)
        : [],
    source: tournament.source,
  };
}

/** Event structure in words: "7 rounds + Top 8", "5 rounds", "Top 8 bracket". */
export function structureLabel(swissRounds: number, topCutSize: number): string {
  const swiss = swissRounds > 0 ? `${swissRounds} ${swissRounds === 1 ? "round" : "rounds"}` : "";
  if (topCutSize <= 1) return swiss || "—";
  return swiss ? `${swiss} + Top ${topCutSize}` : `Top ${topCutSize} bracket`;
}
