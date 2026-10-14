import type { EventLocation, EventTier, Tournament } from "@naruto-tcg/types";

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

const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
const text = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value : fallback);

/**
 * Fills the fields a browser-stored record can lack (older or hand-edited imports) so the views
 * never crash on them. Complete records, such as seed events and wizard output, are returned as is.
 */
export function normalizeTournament(tournament: Tournament): Tournament {
  const t = tournament as Partial<Tournament> & Pick<Tournament, "id" | "name" | "date" | "players" | "matches">;
  const tier = EVENT_TIERS.includes(t.tier as EventTier) ? (t.tier as EventTier) : "store-championship";
  const location = t.location && typeof t.location === "object" ? t.location : {};
  const complete =
    tier === t.tier &&
    location === t.location &&
    typeof t.format === "string" &&
    typeof t.organizer === "string" &&
    count(t.swissRounds) === t.swissRounds &&
    count(t.topCutSize) === t.topCutSize &&
    (t.bestOf === 1 || t.bestOf === 3) &&
    (t.source === "seed" || t.source === "import");
  if (complete) return tournament;
  return {
    ...tournament,
    tier,
    location,
    format: text(t.format, "Unknown format"),
    organizer: text(t.organizer, "Unknown organizer"),
    swissRounds: count(t.swissRounds),
    topCutSize: count(t.topCutSize),
    bestOf: t.bestOf === 1 ? 1 : 3,
    source: t.source === "seed" ? "seed" : "import",
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
