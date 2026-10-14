import type { Decklist, EventTier, MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { ROGUE_ID, getArchetype } from "@/lib/data/archetypes";
import { buildTournamentDecks } from "@/lib/decks/catalog";
import { parseDeckId, type DeckDetail } from "@/lib/decks/types";
import { EVENT_TIER_ORDER } from "@/lib/format";
import { IMPORTED_PREFIX } from "./deck-meta";

/** Finding decks from events imported in this browser. Client-safe: no seed data. */

/** True for `local-<event>--<player>` deck ids. */
export function isImportedDeckId(deckId: string): boolean {
  const parsed = parseDeckId(deckId);
  return parsed?.kind === "tournament" && parsed.tournamentId.startsWith(IMPORTED_PREFIX);
}

const OUTCOMES: ReadonlySet<unknown> = new Set(["p1", "p2", "draw", "bye"]);

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const isPositiveInt = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;

function cleanDecklist(raw: unknown): Decklist | undefined {
  if (!isRecord(raw) || !isText(raw.leaderId) || !Array.isArray(raw.cards)) return undefined;
  const cards = raw.cards.filter(
    (entry): entry is Decklist["cards"][number] => isRecord(entry) && isText(entry.cardId) && isPositiveInt(entry.quantity),
  );
  return { leaderId: raw.leaderId, cards };
}

function cleanMatch(raw: unknown): MatchRecord | null {
  if (!isRecord(raw) || !isText(raw.player1Id) || !OUTCOMES.has(raw.outcome)) return null;
  return { ...(raw as unknown as MatchRecord), player2Id: isText(raw.player2Id) ? raw.player2Id : null };
}

/**
 * An imported event made safe for the deck builder, with the same rules as the deck directory so
 * every deck it lists also opens here: an unknown tier reads as a store championship, a missing
 * top cut as none, unknown archetypes as rogue, missing names as the id, missing placements rank
 * after the known ones, malformed decklists are dropped and unreadable players or matches are
 * skipped. Null without an id.
 */
export function sanitizeImportedTournament(raw: Tournament): Tournament | null {
  if (!isRecord(raw) || !isText(raw.id)) return null;
  const rawPlayers: unknown[] = Array.isArray(raw.players) ? raw.players : [];
  const players = rawPlayers.filter((player): player is TournamentPlayer => isRecord(player) && isText(player.id));
  let nextPlacement = players.reduce((max, player) => (isPositiveInt(player.placement) ? Math.max(max, player.placement) : max), 0);
  const seen = new Set<string>();
  const cleanPlayers: TournamentPlayer[] = [];
  for (const player of players) {
    if (seen.has(player.id)) continue;
    seen.add(player.id);
    cleanPlayers.push({
      ...player,
      name: isText(player.name) ? player.name : player.id,
      country: isText(player.country) ? player.country : undefined,
      archetypeId: isText(player.archetypeId) && getArchetype(player.archetypeId) ? player.archetypeId : ROGUE_ID,
      placement: isPositiveInt(player.placement) ? player.placement : ++nextPlacement,
      decklist: cleanDecklist(player.decklist),
    });
  }
  const tier: EventTier = EVENT_TIER_ORDER.includes(raw.tier) ? raw.tier : "store-championship";
  const rawMatches: unknown[] = Array.isArray(raw.matches) ? raw.matches : [];
  return {
    ...raw,
    name: isText(raw.name) ? raw.name : raw.id,
    date: typeof raw.date === "string" ? raw.date : "",
    tier,
    topCutSize: Number.isInteger(raw.topCutSize) && raw.topCutSize > 0 ? raw.topCutSize : 0,
    players: cleanPlayers,
    matches: rawMatches.map(cleanMatch).filter((match): match is MatchRecord => match !== null),
  };
}

/**
 * The deck for `deckId` among this browser's imported events, built exactly like seed tournament
 * decks; null when the event or the player's list is missing or the stored event is unreadable.
 */
export function findImportedDeck(tournaments: readonly Tournament[], deckId: string): DeckDetail | null {
  const parsed = parseDeckId(deckId);
  if (parsed?.kind !== "tournament") return null;
  const tournament = tournaments.find((t) => t.id === parsed.tournamentId);
  if (!tournament) return null;
  try {
    const clean = sanitizeImportedTournament(tournament);
    return (clean && buildTournamentDecks([clean]).find((deck) => deck.id === deckId)) ?? null;
  } catch {
    return null;
  }
}
