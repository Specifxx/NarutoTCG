import { readFileSync } from "node:fs";
import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { OTHER_SERIES_ID } from "@/lib/meta/share";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { ingestJson } from "@/lib/ingest/pipeline";
import { archetypeBreakdown, cliCommand, normalizedFileName, normalizedJson, previewPlayers, seedTwinOf, standingsPreview, topCutPreview } from "./preview";

const sample = (): Tournament =>
  JSON.parse(readFileSync(new URL("../../public/templates/tournament-template.json", import.meta.url), "utf8")) as Tournament;

describe("previewPlayers", () => {
  it("orders by placement with overall records", () => {
    const players = previewPlayers(sample());
    expect(players.map((p) => p.placement)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(players[0]).toMatchObject({ name: "Kenji Morrow", record: "4-1", hasDecklist: true, dropped: false });
    expect(players[1]!.record).toBe("3-1-1");
    expect(players[7]).toMatchObject({ dropped: true, hasDecklist: false });
  });

  it("shows a dash without pairings and limits the standings", () => {
    const t = { ...sample(), matches: [] };
    expect(previewPlayers(t)[0]!.record).toBe("—");
    expect(standingsPreview(sample(), 3)).toHaveLength(3);
  });

  it("lists the top cut, champion first", () => {
    expect(topCutPreview(sample()).map((p) => p.name)).toEqual(["Kenji Morrow", "Priya Castellane", "Juniper Aldana", "Odette Nwosu"]);
    expect(topCutPreview({ ...sample(), topCutSize: 0 })).toEqual([]);
  });
});

describe("archetypeBreakdown", () => {
  it("groups by chart series, most played first, Other last", () => {
    const t = sample();
    t.players[4]!.archetypeId = "akatsuki-pain";
    const rows = archetypeBreakdown(t);
    expect(rows[0]).toMatchObject({ seriesId: "akatsuki-pain", players: 2, share: 0.25, topCut: 1 });
    expect(rows.reduce((sum, row) => sum + row.players, 0)).toBe(8);
    const other = rows.find((row) => row.seriesId === OTHER_SERIES_ID);
    if (other) {
      expect(rows.at(-1)).toBe(other);
      expect(other.label).toBe("Other");
      expect(other.members.some((m) => m.archetypeId === "rogue")).toBe(true);
    }
  });
});

describe("download helpers", () => {
  it("names the file after the id and prints the CLI command", () => {
    expect(normalizedFileName("local-riverbend-2026-09-12")).toBe("local-riverbend-2026-09-12.json");
    expect(normalizedFileName("odd/id")).toBe("odd-id.json");
    expect(normalizedJson(sample()).endsWith("}\n")).toBe(true);
    expect(cliCommand("x.json")).toBe("pnpm --filter @naruto-tcg/decks ingest -- path/to/x.json");
  });
});

describe("seedTwinOf", () => {
  const seeds = SEED_TOURNAMENTS.map(({ id, name, date }) => ({ id, name, date }));
  const seed = SEED_TOURNAMENTS.find((t) => t.id === "leaf-village-sc-chicago-2026-10")!;

  it("spots a tracked event re-imported from its own Download JSON", () => {
    const imported = ingestJson(JSON.stringify(seed), { now: "2026-10-14T00:00:00.000Z" }).tournament!;
    expect(imported.id).toBe(`local-${seed.id}`);
    expect(seedTwinOf(imported, seeds)).toEqual({ id: seed.id, name: seed.name, date: seed.date });
  });

  it("spots the same event from other exports by name and date, ignoring case and punctuation", () => {
    const fromCsv = { id: "local-whatever-2026-10-03", name: `  ${seed.name.toUpperCase()}!`, date: seed.date };
    expect(seedTwinOf(fromCsv, seeds)?.id).toBe(seed.id);
    expect(seedTwinOf({ ...fromCsv, date: "2025-01-01" }, seeds)).toBeNull();
  });

  it("leaves other events alone", () => {
    expect(seedTwinOf(sample(), seeds)).toBeNull();
    expect(seedTwinOf({ ...sample(), id: `local-${seed.id}-2` }, seeds)).toBeNull();
    expect(seedTwinOf({ id: `local-${seed.id}`, name: seed.name, date: seed.date }, [])).toBeNull();
  });
});
