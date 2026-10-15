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
  /** Matches actually played (see {@link countPlayedMatches}): byes and intentional draws are left out. */
  matches: number;
  /** Players with a published decklist. */
  decklists: number;
  winner: { id: string; name: string; archetypeId: string } | null;
  /** Archetype of each top cut player, champion first. */
  topCutArchetypeIds: string[];
  source: Tournament["source"];
}

/**
 * Matches actually played, Swiss and top cut, counted the way the meta engine counts them: byes,
 * intentional draws and matches against unregistered players are left out. The home page, the
 * event directory and every event page share this count, so the same label shows the same number.
 */
export function countPlayedMatches(tournament: Pick<Tournament, "players" | "matches">): number {
  const registered = new Set(tournament.players.map((p) => p.id));
  return tournament.matches.filter(
    (m) =>
      m.outcome !== "bye" &&
      !m.intentionalDraw &&
      m.player2Id !== null &&
      registered.has(m.player1Id) &&
      registered.has(m.player2Id),
  ).length;
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
    matches: countPlayedMatches(tournament),
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
