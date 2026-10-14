import type { Decklist, MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";

const TOURNAMENT_KEYS = [
  "id", "name", "tier", "format", "date", "location", "organizer", "swissRounds",
  "topCutSize", "bestOf", "source", "importedAt", "notes", "players", "matches",
] as const;
const LOCATION_KEYS = ["city", "region", "country", "venue", "online"] as const;
const PLAYER_KEYS = ["id", "name", "country", "archetypeId", "placement", "dropped", "decklist"] as const;
const MATCH_KEYS = ["round", "stage", "table", "player1Id", "player2Id", "outcome", "games", "intentionalDraw"] as const;

/** Copy of `value` with only `keys`, in that order, dropping undefined values. */
function ordered<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) if (value[key] !== undefined) out[key] = value[key];
  return out;
}

function canonicalDecklist(decklist: Decklist): Decklist {
  return {
    leaderId: decklist.leaderId,
    cards: decklist.cards.map((entry) => ({ cardId: entry.cardId, quantity: entry.quantity })),
  };
}

/** Round, then table, with byes (no table) last within their round. */
export function compareMatches(a: MatchRecord, b: MatchRecord): number {
  return a.round - b.round || (a.table ?? Number.POSITIVE_INFINITY) - (b.table ?? Number.POSITIVE_INFINITY);
}

/**
 * The canonical form of a tournament: stable key order, no undefined values, players by
 * placement and matches by {@link compareMatches}. Serialization round-trips it exactly.
 */
export function canonicalTournament(tournament: Tournament): Tournament {
  const players = tournament.players
    .map((player): TournamentPlayer => {
      const out = ordered(player, PLAYER_KEYS);
      return out.decklist ? { ...out, decklist: canonicalDecklist(out.decklist) } : out;
    })
    .sort((a, b) => a.placement - b.placement);
  const matches = tournament.matches
    .map((match) => {
      const out = ordered(match, MATCH_KEYS);
      return out.games ? { ...out, games: { p1: out.games.p1, p2: out.games.p2 } } : out;
    })
    .sort(compareMatches);
  return {
    ...ordered(tournament, TOURNAMENT_KEYS),
    location: ordered(tournament.location, LOCATION_KEYS),
    players,
    matches,
  };
}

function serializePlayer(player: TournamentPlayer): string {
  const { decklist, ...scalars } = player;
  const head = JSON.stringify(scalars);
  if (!decklist) return `    ${head}`;
  const cards = decklist.cards.map((entry) => `      ${JSON.stringify(entry)}`).join(",\n");
  return `    ${head.slice(0, -1)},"decklist":{"leaderId":${JSON.stringify(decklist.leaderId)},"cards":[\n${cards}\n    ]}}`;
}

/**
 * Deterministic, diff-friendly JSON for a seed event: 2-space indentation, but one line per
 * match, per player (scalar fields) and per decklist entry so the files stay compact.
 */
export function serializeTournament(tournament: Tournament): string {
  const canonical = canonicalTournament(tournament);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(canonical)) {
    if (key === "players") {
      lines.push(`  "players": [\n${canonical.players.map(serializePlayer).join(",\n")}\n  ]`);
    } else if (key === "matches") {
      lines.push(`  "matches": [\n${canonical.matches.map((m) => `    ${JSON.stringify(m)}`).join(",\n")}\n  ]`);
    } else {
      lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value, null, 2).replace(/\n/g, "\n  ")}`);
    }
  }
  return `{\n${lines.join(",\n")}\n}\n`;
}
