import type { Decklist, EventTier, MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { ROGUE_ID, getArchetype } from "@/lib/data/archetypes";
import { EVENT_TIER_ORDER } from "@/lib/format";

/** Coercing events imported in this browser into the shape the deck and profile builders expect. Client-safe. */

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
  // A match without a second player counts as a bye, as in computeRecords.
  return { ...(raw as unknown as MatchRecord), player2Id: isText(raw.player2Id) ? raw.player2Id : null };
}

/**
 * An imported event with every field the deck directory and player profiles read made safe:
 * an unknown tier reads as a store championship (as on the tournaments page), a missing top cut
 * as none, unknown archetypes as rogue, missing placements rank after the known ones, malformed
 * decklists are dropped and unreadable players or matches are skipped. Null without an id.
 */
export function sanitizeImportedEvent(raw: Tournament): Tournament | null {
  if (!isRecord(raw) || !isText(raw.id)) return null;
  const rawPlayers: unknown[] = Array.isArray(raw.players) ? raw.players : [];
  const players = rawPlayers.filter((player): player is TournamentPlayer => isRecord(player) && isText(player.id));
  let nextPlacement = players.reduce((max, player) => (isPositiveInt(player.placement) ? Math.max(max, player.placement) : max), 0);
  const seen = new Set<string>();
  const cleanPlayers: TournamentPlayer[] = [];
  for (const player of players) {
    if (seen.has(player.id)) continue;
    seen.add(player.id);
    const decklist = cleanDecklist(player.decklist);
    cleanPlayers.push({
      ...player,
      name: isText(player.name) ? player.name : player.id,
      country: isText(player.country) ? player.country : undefined,
      archetypeId: isText(player.archetypeId) && getArchetype(player.archetypeId) ? player.archetypeId : ROGUE_ID,
      placement: isPositiveInt(player.placement) ? player.placement : ++nextPlacement,
      decklist,
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

/** Every readable imported event, sanitized, in stored order. */
export function sanitizeImportedEvents(tournaments: readonly Tournament[]): Tournament[] {
  return tournaments.flatMap((tournament) => {
    try {
      const clean = sanitizeImportedEvent(tournament);
      return clean ? [clean] : [];
    } catch {
      return [];
    }
  });
}
