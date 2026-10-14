import type { Decklist, EventLocation, EventTier, MatchOutcome, MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { ROGUE_ID, getArchetype } from "@/lib/data/archetypes";
import { EVENT_TIER_ORDER } from "@/lib/format";

/**
 * The one sanitizer for tournaments read back from this browser's storage. Stored records can be
 * older than the current shape, hand-edited or simply broken, so the imports store runs every
 * record through {@link sanitizeTournament} once and every page can trust what it gets.
 * Client-safe: no seed data.
 */

/** Tier of an event whose stored tier is missing or unknown. */
const DEFAULT_TIER: EventTier = "store-championship";
const UNKNOWN_FORMAT = "Unknown format";
const UNKNOWN_ORGANIZER = "Unknown organizer";

const OUTCOMES: readonly MatchOutcome[] = ["p1", "p2", "draw", "bye"];
const LOCATION_TEXT = ["city", "region", "country", "venue"] as const;

type Loose = Record<string, unknown>;

const isRecord = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
/** Ids (event, player, card, leader): any non-empty string. */
const isId = (value: unknown): value is string => typeof value === "string" && value !== "";
/** Text worth showing: a string with more than whitespace. */
const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const text = (value: unknown, fallback: string) => (isText(value) ? value : fallback);
/** A non-negative integer count; anything else counts as 0. */
const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
const isPositiveInt = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1;
const isScore = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isOptional = (value: unknown, type: "string" | "number" | "boolean") =>
  value === undefined || (typeof value === type && (type !== "number" || Number.isFinite(value)));
const isTier = (value: unknown): value is EventTier => EVENT_TIER_ORDER.includes(value as EventTier);
/** A known archetype id, or the rogue bucket (which is not an archetype of its own). */
const isArchetypeId = (value: unknown): value is string =>
  value === ROGUE_ID || (typeof value === "string" && getArchetype(value) !== undefined);

/** The location itself when well formed, else a copy of its readable parts ({} when there are none). */
function sanitizeLocation(value: unknown): EventLocation {
  if (!isRecord(value)) return {};
  const valid = LOCATION_TEXT.every((key) => isOptional(value[key], "string")) && isOptional(value.online, "boolean");
  if (valid) return value as EventLocation;
  const location: EventLocation = {};
  for (const key of LOCATION_TEXT) if (typeof value[key] === "string") location[key] = value[key];
  if (value.online === true) location.online = true;
  return location;
}

/** The list itself, a copy without its broken card rows, or undefined when it is unusable. */
function sanitizeDecklist(value: unknown): Decklist | undefined {
  if (!isRecord(value) || !isId(value.leaderId) || !Array.isArray(value.cards)) return undefined;
  const cards = value.cards.filter((entry) => isRecord(entry) && isId(entry.cardId) && isPositiveInt(entry.quantity));
  return cards.length === value.cards.length ? (value as unknown as Decklist) : { leaderId: value.leaderId, cards: cards as Decklist["cards"] };
}

/** The player itself when well formed, a repaired copy (placement 0 = unknown), or null without an id. */
function sanitizePlayer(value: unknown): TournamentPlayer | null {
  if (!isRecord(value) || !isId(value.id)) return null;
  const decklist = sanitizeDecklist(value.decklist);
  const valid =
    isText(value.name) &&
    isArchetypeId(value.archetypeId) &&
    isPositiveInt(value.placement) &&
    isOptional(value.country, "string") &&
    isOptional(value.dropped, "boolean") &&
    decklist === value.decklist;
  if (valid) return value as unknown as TournamentPlayer;
  return {
    id: value.id,
    name: text(value.name, value.id),
    archetypeId: isArchetypeId(value.archetypeId) ? value.archetypeId : ROGUE_ID,
    placement: isPositiveInt(value.placement) ? value.placement : 0,
    ...(typeof value.country === "string" ? { country: value.country } : {}),
    ...(value.dropped === true ? { dropped: true } : {}),
    ...(decklist ? { decklist } : {}),
  };
}

/** Readable players: the first entry per id wins; unknown placements go after the known ones, in list order. */
function sanitizePlayers(values: readonly unknown[]): TournamentPlayer[] {
  const seen = new Set<string>();
  const players: TournamentPlayer[] = [];
  for (const value of values) {
    const player = sanitizePlayer(value);
    if (!player || seen.has(player.id)) continue;
    seen.add(player.id);
    players.push(player);
  }
  let next = players.reduce((max, p) => Math.max(max, p.placement), 0);
  return players.map((p) => (p.placement > 0 ? p : { ...p, placement: ++next }));
}

/**
 * The match itself when well formed, a repaired copy, or null when it cannot be read (no first
 * player, no positive round or an unknown outcome). A match without a second player is a bye.
 */
function sanitizeMatch(value: unknown): MatchRecord | null {
  if (!isRecord(value) || !isId(value.player1Id) || !isPositiveInt(value.round)) return null;
  const stated = OUTCOMES.find((o) => o === value.outcome);
  if (!stated) return null;
  const bye = stated === "bye" || !isId(value.player2Id);
  const outcome: MatchOutcome = bye ? "bye" : stated;
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

const sameItems = <T>(a: readonly T[], b: readonly unknown[]) => a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * Turns a tournament read from browser storage into a record every page can use, or null when
 * it cannot be one.
 *
 * - **Rejected** (null): anything that is not an object, or has no non-empty string `id`.
 * - **Event fields**: an unknown or missing `tier` reads as a store championship; a `name` that
 *   is not text becomes the id; a `format` or `organizer` that is not a string, or (when the
 *   record needs repair anyway) is blank, becomes "Unknown format" / "Unknown organizer"; a
 *   non-string `date` becomes "" (string dates are kept as they are: pages that need a real
 *   date check it themselves); the location keeps only its readable parts; `swissRounds` and
 *   `topCutSize` are non-negative integers (0 otherwise); `bestOf` is 1 or 3 (3 otherwise);
 *   `source` is "import" unless it says "seed"; non-string `notes` and `importedAt` are dropped.
 * - **Players**: entries that are not objects or lack an id are dropped and the first entry per
 *   id wins; a missing or blank name becomes the id; a missing or unknown archetype becomes
 *   rogue; players without a valid placement rank after the known ones, in list order; a
 *   non-string country is dropped; a decklist without a leader or a card array is dropped,
 *   and broken card rows are filtered out of the others.
 * - **Matches**: dropped when they cannot be read (no first player, no positive round or an
 *   unknown outcome); a match without a second player, or marked as one, is a bye with
 *   `player2Id: null`; an unknown stage reads as Swiss; a non-numeric table and an unreadable
 *   game score are dropped.
 *
 * Complete records, such as seed events and wizard output, are returned as is (the same
 * object), as are their well-formed players, matches, decklists and location. Anything else is
 * a new object: the input is never mutated. Sanitizing a sanitized record returns it unchanged.
 */
export function sanitizeTournament(raw: unknown): Tournament | null {
  if (!isRecord(raw) || !isId(raw.id)) return null;
  const id = raw.id;
  const rawPlayers: readonly unknown[] = Array.isArray(raw.players) ? raw.players : [];
  const rawMatches: readonly unknown[] = Array.isArray(raw.matches) ? raw.matches : [];
  const tier = isTier(raw.tier) ? raw.tier : DEFAULT_TIER;
  const location = sanitizeLocation(raw.location);
  const players = sanitizePlayers(rawPlayers);
  const matches = rawMatches.map(sanitizeMatch).filter((m): m is MatchRecord => m !== null);
  const complete =
    isText(raw.name) &&
    typeof raw.date === "string" &&
    tier === raw.tier &&
    location === raw.location &&
    typeof raw.format === "string" &&
    typeof raw.organizer === "string" &&
    count(raw.swissRounds) === raw.swissRounds &&
    count(raw.topCutSize) === raw.topCutSize &&
    (raw.bestOf === 1 || raw.bestOf === 3) &&
    (raw.source === "seed" || raw.source === "import") &&
    isOptional(raw.notes, "string") &&
    isOptional(raw.importedAt, "string") &&
    Array.isArray(raw.players) &&
    Array.isArray(raw.matches) &&
    sameItems(players, rawPlayers) &&
    sameItems(matches, rawMatches);
  if (complete) return raw as unknown as Tournament;
  const { notes, importedAt, ...rest } = raw;
  return {
    ...rest,
    id,
    name: text(raw.name, id),
    tier,
    format: text(raw.format, UNKNOWN_FORMAT),
    date: typeof raw.date === "string" ? raw.date : "",
    location,
    organizer: text(raw.organizer, UNKNOWN_ORGANIZER),
    swissRounds: count(raw.swissRounds),
    topCutSize: count(raw.topCutSize),
    bestOf: raw.bestOf === 1 ? 1 : 3,
    source: raw.source === "seed" ? "seed" : "import",
    players,
    matches,
    ...(typeof notes === "string" ? { notes } : {}),
    ...(typeof importedAt === "string" ? { importedAt } : {}),
  };
}
