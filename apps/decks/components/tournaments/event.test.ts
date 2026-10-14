import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { OTHER_SERIES_ID } from "@/lib/meta/share";
import { buildStandings, eventMetaBreakdown, tournamentFileName } from "./event";
import { fixtureTournament } from "./test-fixtures";

describe("buildStandings", () => {
  it("lists players by final placement with Swiss tiebreakers", () => {
    const rows = buildStandings(fixtureTournament());
    expect(rows.map((r) => r.playerId)).toEqual(["ann-a", "ben-b", "dee-d", "gus-g", "fay-f", "cal-c", "eve-e", "hal-h"]);
    const ann = rows[0]!;
    expect(ann).toMatchObject({
      name: "Ann Aoki",
      country: "US",
      swissRank: 1,
      swissRecord: "2-0-1",
      overallRecord: "4-0-1",
      matchPoints: 7,
      inTopCut: true,
      dropped: false,
      deckId: "fixture-open--ann-a",
    });
    expect(ann.omw).toBeCloseTo((0.33 + 6 / 9 + 7 / 9) / 3, 6);
    expect(ann.oomw).toBeGreaterThan(0);
  });

  it("marks byes as wins, drops and unpublished lists", () => {
    const rows = buildStandings(fixtureTournament());
    const fay = rows.find((r) => r.playerId === "fay-f")!;
    expect(fay).toMatchObject({ swissRecord: "1-1-1", matchPoints: 4, inTopCut: false, deckId: null, country: null });
    expect(rows.find((r) => r.playerId === "hal-h")!.dropped).toBe(true);
  });

  it("leaves results empty for an event without matches", () => {
    const rows = buildStandings(fixtureTournament({ matches: [] }));
    expect(rows[0]).toMatchObject({ swissRank: null, swissRecord: null, overallRecord: null, matchPoints: null, omw: null });
  });

  it("covers every player of a 256-player seed event", () => {
    const t = SEED_TOURNAMENTS.find((x) => x.players.length >= 256)!;
    const rows = buildStandings(t);
    expect(rows).toHaveLength(t.players.length);
    expect(rows.filter((r) => r.inTopCut)).toHaveLength(t.topCutSize);
    expect(rows.filter((r) => r.deckId).length).toBe(t.players.filter((p) => p.decklist).length);
  });
});

describe("eventMetaBreakdown", () => {
  it("counts entries and top cut per series, Other last", () => {
    const t = fixtureTournament();
    const rows = eventMetaBreakdown(t.players, t.topCutSize);
    expect(rows.map((r) => [r.seriesId, r.entries, r.topCut])).toEqual([
      ["uchiha-avenger", 2, 1],
      ["medical-ninja", 2, 1],
      ["akatsuki-pain", 2, 2],
      [OTHER_SERIES_ID, 2, 0],
    ]);
    expect(rows[0]).toMatchObject({ label: "Avenger", share: 0.25, conversion: 0.5 });
    expect(rows.at(-1)).toMatchObject({ label: "Other", conversion: 0 });
  });

  it("sorts by entries and has no conversion without a cut", () => {
    const rows = eventMetaBreakdown(
      [
        { archetypeId: "sand-gaara", placement: 1 },
        { archetypeId: "sand-gaara", placement: 2 },
        { archetypeId: "leaf-jonin", placement: 3 },
      ],
      0,
    );
    expect(rows.map((r) => r.seriesId)).toEqual(["sand-gaara", "leaf-jonin"]);
    expect(rows.every((r) => r.conversion === null && r.topCut === 0)).toBe(true);
  });

  it("accounts for every entry of every seed event", () => {
    for (const t of SEED_TOURNAMENTS) {
      const rows = eventMetaBreakdown(t.players, t.topCutSize);
      expect(rows.reduce((sum, r) => sum + r.entries, 0)).toBe(t.players.length);
      expect(rows.reduce((sum, r) => sum + r.topCut, 0)).toBe(t.topCutSize);
    }
  });
});

describe("tournamentFileName", () => {
  it("is the id with a json extension", () => {
    expect(tournamentFileName("local-my-event")).toBe("local-my-event.json");
    expect(tournamentFileName("a/b c")).toBe("a-b-c.json");
  });
});
