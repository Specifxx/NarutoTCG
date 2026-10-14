/**
 * Cross-module guarantees over the committed seed data: the generator, ingestion pipeline,
 * classifier, meta engine and deck catalog must agree with each other.
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES, ROGUE_ID } from "@/lib/data/archetypes";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { getDeck, getDeckSummaries, getPlayerProfile } from "@/lib/decks/repository";
import { parseDeckId, tournamentDeckId } from "@/lib/decks/types";
import { classifyDecklist } from "@/lib/ingest/archetypes";
import { ingestJson } from "@/lib/ingest/pipeline";
import { buildMetaSnapshot } from "@/lib/meta/snapshot";

describe("seed data × ingestion", () => {
  it.each(SEED_TOURNAMENTS.map((t) => [t.id, t] as const))("%s round-trips through ingestJson without errors", (_, t) => {
    const result = ingestJson(JSON.stringify(t), { now: "2026-10-14T00:00:00.000Z" });
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(result.tournament).not.toBeNull();
    const imported = result.tournament!;
    expect(imported.players.length).toBe(t.players.length);
    expect(imported.matches.length).toBe(t.matches.length);
    const placements = new Map(t.players.map((p) => [p.id, p.placement]));
    for (const p of imported.players) expect(p.placement).toBe(placements.get(p.id));
  });

  it("classifies every published seed decklist as its declared archetype", () => {
    let lists = 0;
    for (const t of SEED_TOURNAMENTS) {
      for (const player of t.players) {
        if (!player.decklist) continue;
        lists++;
        expect(classifyDecklist(player.decklist).archetypeId, `${t.id}/${player.id}`).toBe(player.archetypeId);
      }
    }
    expect(lists).toBeGreaterThanOrEqual(100);
  });
});

describe("seed data × meta engine", () => {
  const snapshot = buildMetaSnapshot(SEED_TOURNAMENTS);

  it("produces a populated S/A/B/C ladder with rogue unranked", () => {
    for (const tier of ["S", "A", "B", "C"] as const) expect(snapshot.tiers[tier].length, tier).toBeGreaterThan(0);
    expect(snapshot.stats.find((s) => s.archetypeId === ROGUE_ID)?.tier).toBe("unranked");
    expect(snapshot.stats.length).toBe(ARCHETYPES.length);
  });

  it("counts every entry and every top cut slot", () => {
    const players = SEED_TOURNAMENTS.reduce((sum, t) => sum + t.players.length, 0);
    const slots = SEED_TOURNAMENTS.reduce((sum, t) => sum + Math.min(t.topCutSize, t.players.length), 0);
    expect(snapshot.meta.playerCount).toBe(players);
    expect(snapshot.stats.reduce((sum, s) => sum + s.entries, 0)).toBe(players);
    expect(snapshot.stats.reduce((sum, s) => sum + s.topCut, 0)).toBe(slots);
    expect(snapshot.stats.reduce((sum, s) => sum + s.eventWins, 0)).toBe(SEED_TOURNAMENTS.length);
  });
});

describe("seed data × deck catalog", () => {
  const summaries = getDeckSummaries();

  it("has a resolvable, unique id for every deck", () => {
    const ids = new Set(summaries.map((d) => d.id));
    expect(ids.size).toBe(summaries.length);
    for (const summary of summaries) {
      expect(parseDeckId(summary.id), summary.id).not.toBeNull();
      expect(getDeck(summary.id)?.id).toBe(summary.id);
    }
  });

  it("lists every published tournament decklist and links pilots to profiles", () => {
    for (const t of SEED_TOURNAMENTS) {
      for (const player of t.players) {
        if (!player.decklist) continue;
        const deck = getDeck(tournamentDeckId(t.id, player.id));
        expect(deck?.tournament?.placement, `${t.id}/${player.id}`).toBe(player.placement);
        expect(getPlayerProfile(player.id)?.results.some((r) => r.tournamentId === t.id)).toBe(true);
      }
    }
  });
});
