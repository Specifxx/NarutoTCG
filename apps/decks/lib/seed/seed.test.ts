import { readdirSync, readFileSync, statSync } from "node:fs";
import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { ARCHETYPE_INDEX } from "@/lib/data/archetypes";
import { formatForDate } from "@/lib/data/cards";
import { getTournament, SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { isDecklistLegal } from "@/lib/decks/legality";
import {
  DROP_FROM_ROUND,
  DROP_ONE_WIN_MIN_LOSSES,
  INTENTIONAL_DRAW_CUSHION,
  META_PERIODS,
  metaPeriodFor,
  SEED_EVENTS,
  swissRoundsFor,
} from "@/lib/seed/config";
import { buildSeedDecklist } from "@/lib/seed/decklists";
import { generateSeedTournaments, publishedListDepth } from "@/lib/seed/generate";
import { generatePlayerPool, slugify } from "@/lib/seed/players";
import { serializeTournament } from "@/lib/seed/serialize";
import { gameWinProbability, matchupAdjustment, matchWinProbability } from "@/lib/seed/simulate";
import { createRng } from "@/lib/random";
import { computeFinalPlacements, computeRecords, computeSwissStandings, topCutRounds } from "@/lib/tournament/standings";
import { pairKey } from "@/lib/tournament/swiss";
import { bracketSeedOrder } from "@/lib/tournament/topcut";

const SEED_DIR = new URL("../../data/seed/tournaments/", import.meta.url);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const files = readdirSync(SEED_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();
const raw = new Map(files.map((f) => [f, readFileSync(new URL(f, SEED_DIR), "utf8")]));
const committed: Tournament[] = files.map((f) => JSON.parse(raw.get(f)!) as Tournament);

describe("seed files", () => {
  it("has the 12 configured events with unique slug ids, one file each", () => {
    expect(committed).toHaveLength(12);
    const ids = committed.map((t) => t.id);
    expect(new Set(ids).size).toBe(12);
    expect(files).toEqual(ids.map((id) => `${id}.json`));
    expect(ids.slice().sort()).toEqual(SEED_EVENTS.map((e) => e.id).sort());
    for (const id of ids) expect(id).toMatch(SLUG);
  });

  it("stays under 1 MB in total", () => {
    const bytes = files.reduce((sum, f) => sum + statSync(new URL(f, SEED_DIR)).size, 0);
    expect(bytes).toBeLessThan(1_000_000);
  });

  it("is exactly what the generator produces (deterministic regeneration)", () => {
    const generated = generateSeedTournaments();
    const byId = new Map(committed.map((t) => [t.id, t]));
    for (const tournament of generated) {
      expect(byId.get(tournament.id)).toStrictEqual(tournament);
      expect(serializeTournament(tournament)).toBe(raw.get(`${tournament.id}.json`));
    }
  });
});

describe.each(committed.map((t) => [t.id, t] as const))("%s", (_id, t) => {
  const playerIds = new Set(t.players.map((p) => p.id));
  const swiss = t.matches.filter((m) => m.stage === "swiss");
  const topCut = t.matches.filter((m) => m.stage === "top-cut");

  it("has event metadata consistent with the format and size rules", () => {
    expect(t.date >= "2026-05-01" && t.date <= "2026-10-14").toBe(true);
    expect(t.format).toBe(formatForDate(t.date));
    expect(t.swissRounds).toBe(swissRoundsFor(t.players.length));
    expect(t.bestOf).toBe(3);
    expect(t.source).toBe("seed");
    expect(t.notes).toBeTruthy();
  });

  it("has unique, slug-safe player ids and known archetypes", () => {
    expect(playerIds.size).toBe(t.players.length);
    for (const p of t.players) {
      expect(p.id).toMatch(SLUG);
      expect(ARCHETYPE_INDEX.has(p.archetypeId)).toBe(true);
    }
  });

  it("has placements forming a permutation of 1..N that match computeFinalPlacements", () => {
    expect(t.players.map((p) => p.placement)).toEqual(t.players.map((_, i) => i + 1));
    const expected = computeFinalPlacements(t);
    for (const p of t.players) expect(p.placement).toBe(expected.get(p.id));
  });

  it("references only registered players, seats each player at most once per round", () => {
    const rounds = new Map<number, string[]>();
    for (const m of t.matches) {
      expect(playerIds.has(m.player1Id)).toBe(true);
      if (m.player2Id !== null) expect(playerIds.has(m.player2Id)).toBe(true);
      const seated = rounds.get(m.round) ?? [];
      seated.push(m.player1Id, ...(m.player2Id === null ? [] : [m.player2Id]));
      rounds.set(m.round, seated);
    }
    for (const seated of rounds.values()) expect(new Set(seated).size).toBe(seated.length);
  });

  it("runs Swiss without rematches, with byes, draws and drops recorded consistently", () => {
    const keys = swiss.filter((m) => m.player2Id !== null).map((m) => pairKey(m.player1Id, m.player2Id!));
    expect(new Set(keys).size).toBe(keys.length);
    expect(Math.max(...swiss.map((m) => m.round))).toBe(t.swissRounds);

    const byes = swiss.filter((m) => m.player2Id === null);
    expect(new Set(byes.map((m) => m.player1Id)).size).toBe(byes.length);
    for (const m of swiss) {
      if (m.player2Id === null) {
        expect(m).toStrictEqual({ round: m.round, stage: "swiss", player1Id: m.player1Id, player2Id: null, outcome: "bye" });
      } else if (m.intentionalDraw) {
        expect(m.round).toBe(t.swissRounds);
        expect(m.outcome).toBe("draw");
        expect(m.games).toBeUndefined();
      } else if (m.outcome === "draw") {
        expect(m.games).toEqual({ p1: 1, p2: 1 });
      } else {
        const [winner, loser] = m.outcome === "p1" ? [m.games!.p1, m.games!.p2] : [m.games!.p2, m.games!.p1];
        expect(winner).toBe(2);
        expect(loser).toBeLessThan(2);
      }
    }

    const lastRound = new Map<string, number>();
    for (const m of swiss) for (const id of [m.player1Id, m.player2Id]) if (id) lastRound.set(id, Math.max(lastRound.get(id) ?? 0, m.round));
    for (const p of t.players) {
      if (p.dropped) expect(lastRound.get(p.id)).toBeLessThan(t.swissRounds);
      else expect(lastRound.get(p.id)).toBe(t.swissRounds);
    }
  });

  it("pairs each Swiss round after the first with the higher-ranked player as player1", () => {
    for (let round = 2; round <= t.swissRounds; round++) {
      const rank = new Map(computeSwissStandings(t.players, swiss, { throughRound: round - 1 }).map((row) => [row.playerId, row.rank]));
      for (const m of swiss) {
        if (m.round === round && m.player2Id !== null) expect(rank.get(m.player1Id)!).toBeLessThan(rank.get(m.player2Id)!);
      }
    }
  });

  it("drops only winless or one-win players, from round 3 until before the last round", () => {
    for (const p of t.players.filter((x) => x.dropped)) {
      const lastPlayed = Math.max(...swiss.filter((m) => m.player1Id === p.id || m.player2Id === p.id).map((m) => m.round));
      const record = computeRecords(swiss, { throughRound: lastPlayed }).get(p.id)!;
      expect(lastPlayed).toBeGreaterThanOrEqual(DROP_FROM_ROUND);
      expect(lastPlayed).toBeLessThan(t.swissRounds);
      expect(record.wins === 0 || (record.wins === 1 && record.losses >= DROP_ONE_WIN_MIN_LOSSES)).toBe(true);
    }
  });

  it("lets only players locked for the cut draw intentionally", () => {
    const standings = computeSwissStandings(t.players, swiss, { throughRound: t.swissRounds - 1 }).filter((row) => !row.dropped);
    const lockedAt = standings[t.topCutSize - 1]!.matchPoints + INTENTIONAL_DRAW_CUSHION;
    const points = new Map(standings.map((row) => [row.playerId, row.matchPoints]));
    for (const m of swiss.filter((x) => x.intentionalDraw)) {
      expect(points.get(m.player1Id)!).toBeGreaterThanOrEqual(lockedAt);
      expect(points.get(m.player2Id!)!).toBeGreaterThanOrEqual(lockedAt);
    }
  });

  it("seeds the top cut from the final Swiss standings in bracket order", () => {
    const seeds = computeSwissStandings(t.players, swiss)
      .filter((row) => !row.dropped)
      .map((row) => row.playerId);
    const firstRound = topCut.filter((m) => m.round === t.swissRounds + 1).map((m) => [m.player1Id, m.player2Id]);
    expect(firstRound).toEqual(bracketSeedOrder(t.topCutSize).map(([a, b]) => [seeds[a - 1], seeds[b - 1]]));
  });

  it("has a complete single-elimination top cut with tables and no draws", () => {
    expect(topCut).toHaveLength(t.topCutSize - 1);
    expect(new Set(topCut.map((m) => m.round)).size).toBe(topCutRounds(t.topCutSize));
    for (const m of topCut) {
      expect(m.round).toBeGreaterThan(t.swissRounds);
      expect(["p1", "p2"]).toContain(m.outcome);
      expect(m.table).toBeGreaterThan(0);
    }
    const cut = t.players.filter((p) => p.placement <= t.topCutSize);
    expect(cut.every((p) => !p.dropped)).toBe(true);
    expect(new Set(topCut.flatMap((m) => [m.player1Id, m.player2Id]))).toEqual(new Set(cut.map((p) => p.id)));
  });

  it("publishes a legal decklist for exactly the published placements", () => {
    const depth = publishedListDepth(t);
    for (const p of t.players) {
      if (p.placement <= depth) {
        expect(p.decklist).toBeDefined();
        expect(isDecklistLegal(p.decklist!, { date: t.date })).toBe(true);
        expect(ARCHETYPE_INDEX.get(p.archetypeId)!.leaderIds).toContain(p.decklist!.leaderId);
      } else {
        expect("decklist" in p).toBe(false);
      }
    }
  });

  it("keeps matches sorted by round then table, byes last", () => {
    for (let i = 1; i < t.matches.length; i++) {
      const [a, b] = [t.matches[i - 1]!, t.matches[i]!];
      expect(a.round <= b.round).toBe(true);
      if (a.round === b.round) {
        expect(a.table).toBeDefined();
        if (b.table !== undefined) expect(a.table!).toBeLessThan(b.table);
      }
    }
  });
});

describe("seed pool and model", () => {
  it("draws recurring players: many players attend several events", () => {
    const appearances = new Map<string, number>();
    for (const t of committed) for (const p of t.players) appearances.set(p.id, (appearances.get(p.id) ?? 0) + 1);
    expect([...appearances.values()].filter((n) => n >= 3).length).toBeGreaterThan(100);
  });

  it("generates 440 players with unique names and slug ids", () => {
    const pool = generatePlayerPool();
    expect(pool).toHaveLength(440);
    expect(new Set(pool.map((p) => p.name)).size).toBe(440);
    expect(new Set(pool.map((p) => p.id)).size).toBe(440);
    for (const p of pool) expect(p.id).toMatch(SLUG);
  });

  it("slugifies accented and punctuated names", () => {
    expect(slugify("Léa O'Brien")).toBe("lea-obrien");
    expect(slugify("Bram de Vries")).toBe("bram-de-vries");
    expect(slugify("Zoë  --  Sjöberg")).toBe("zoe-sjoberg");
  });

  it("covers every event date with exactly one meta period", () => {
    for (const e of SEED_EVENTS) {
      expect(META_PERIODS.filter((p) => (!p.from || p.from <= e.date) && (!p.to || e.date <= p.to))).toHaveLength(1);
      expect(metaPeriodFor(e.date)).toBeDefined();
    }
  });

  it("uses an antisymmetric matchup model with even mirrors", () => {
    expect(matchupAdjustment("sand-gaara", "akatsuki-pain")).toBe(0.3);
    expect(matchupAdjustment("akatsuki-pain", "sand-gaara")).toBe(-0.3);
    const a = { archetypeId: "uzumaki-sage", skill: 0.2 };
    const b = { archetypeId: "itachi-tsukuyomi", skill: -0.1 };
    expect(matchWinProbability(a, b) + matchWinProbability(b, a)).toBeCloseTo(1, 12);
    expect(matchWinProbability({ archetypeId: "rogue", skill: 0 }, { archetypeId: "rogue", skill: 0 })).toBe(0.5);
  });

  it("derives a per-game probability that reproduces the match probability", () => {
    for (const match of [0.2, 0.5, 0.62, 0.9]) {
      const p = gameWinProbability(match);
      expect(p * p * (3 - 2 * p)).toBeCloseTo(match, 9);
    }
  });

  it("builds legal lists for every archetype before and after NT04", () => {
    for (const archetypeId of ARCHETYPE_INDEX.keys()) {
      for (const date of ["2026-05-16", "2026-07-25"]) {
        for (let s = 0; s < 10; s++) {
          const list = buildSeedDecklist(archetypeId, date, createRng(`${archetypeId}:${date}:${s}`));
          expect(isDecklistLegal(list, { date })).toBe(true);
        }
      }
    }
  });
});

describe("lib/data/tournaments", () => {
  it("exposes the committed events newest first", () => {
    expect(SEED_TOURNAMENTS).toHaveLength(12);
    const dates = SEED_TOURNAMENTS.map((t) => t.date);
    expect(dates).toEqual(dates.slice().sort().reverse());
    expect(getTournament("hokage-cup-na-2026")?.players).toHaveLength(256);
    expect(getTournament("missing")).toBeUndefined();
  });
});
