import { describe, expect, it } from "vitest";
import { CHARTED_ARCHETYPES, ROGUE_ID } from "@/lib/data/archetypes";
import { emptyCounts, mergeAggregates } from "./aggregate";
import {
  OTHER_SERIES_ID,
  chartSeriesIds,
  fieldVsTopCut,
  metaShareByEvent,
  overallShare,
  seriesIdFor,
  seriesLabel,
  shortEventLabel,
} from "./share";
import type { ArchetypeCounts, TournamentAggregate } from "./types";

const counts = (partial: Partial<ArchetypeCounts>): ArchetypeCounts => ({ ...emptyCounts(), ...partial });

const AVENGER = "uchiha-avenger";
const SAGE = "uzumaki-sage";
const JIRAIYA = "sannin-summons";

const eventAgg = (
  id: string,
  name: string,
  date: string,
  archetypes: Record<string, Partial<ArchetypeCounts>>,
  topCutSlots = 0,
): TournamentAggregate => ({
  tournamentId: id,
  name,
  date,
  tier: "store-championship",
  format: "Standard (NT01–NT03)",
  playerCount: Object.values(archetypes).reduce((s, c) => s + (c.entries ?? 0), 0),
  topCutSize: topCutSlots,
  topCutSlots,
  winnerArchetypeId: null,
  archetypes: Object.fromEntries(Object.entries(archetypes).map(([k, v]) => [k, counts(v)])),
  matchups: {},
});

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

const EVENTS = [
  eventAgg(
    "late",
    "Store Championship — Riverside",
    "2026-06-20",
    { [AVENGER]: { entries: 6, topCut: 2 }, [JIRAIYA]: { entries: 3, topCut: 1 }, [ROGUE_ID]: { entries: 3, topCut: 1 } },
    4,
  ),
  eventAgg("early", "Online Open #3", "2026-02-10", { [AVENGER]: { entries: 10, topCut: 4 }, [SAGE]: { entries: 30, topCut: 4 } }, 8),
  eventAgg("empty", "Online Open #4", "2026-04-01", {}),
];

describe("chart series", () => {
  it("lists charted archetypes in slot order, then other", () => {
    const ids = chartSeriesIds();
    expect(ids).toEqual([...CHARTED_ARCHETYPES.map((a) => a.id), OTHER_SERIES_ID]);
    expect(ids[0]).toBe(AVENGER);
    expect(ids).not.toContain(ROGUE_ID);
  });

  it("folds uncharted archetypes and rogue into other", () => {
    expect(seriesIdFor(AVENGER)).toBe(AVENGER);
    expect(seriesIdFor(JIRAIYA)).toBe(OTHER_SERIES_ID);
    expect(seriesIdFor(ROGUE_ID)).toBe(OTHER_SERIES_ID);
    expect(seriesLabel(AVENGER)).toBe("Avenger");
    expect(seriesLabel(OTHER_SERIES_ID)).toBe("Other");
  });
});

describe("shortEventLabel", () => {
  it("keeps the distinguishing part of an event name", () => {
    expect(shortEventLabel("Store Championship — Riverside")).toBe("Riverside");
    expect(shortEventLabel("Paper Lantern Games Store Championship — Riverside")).toBe("Riverside");
    expect(shortEventLabel("Mistvale Regional Championship – Port Kestrel 2026")).toBe("Port Kestrel");
    expect(shortEventLabel("National Championship: Season 2")).toBe("Season 2");
    expect(shortEventLabel("Kage Cup — Northern National Championship 2026")).toBe("Kage Cup");
    expect(shortEventLabel("Riverside Store Championship")).toBe("Riverside");
    expect(shortEventLabel("Shinobi Online Open #3")).toBe("Shinobi Online Open #3");
    expect(shortEventLabel("Store Championship")).toBe("Store Championship");
  });
});

describe("metaShareByEvent", () => {
  const rows = metaShareByEvent(EVENTS);

  it("sorts events oldest first with short labels", () => {
    expect(rows.map((r) => r.tournamentId)).toEqual(["early", "empty", "late"]);
    expect(rows.map((r) => r.label)).toEqual(["Online Open #3", "Online Open #4", "Riverside"]);
    expect(rows[0]).toMatchObject({ date: "2026-02-10", playerCount: 40 });
  });

  it("covers every series and sums to 1 for events with players", () => {
    for (const row of rows) expect(Object.keys(row.shares)).toEqual(chartSeriesIds());
    expect(rows[0]!.shares[AVENGER]).toBe(0.25);
    expect(rows[0]!.shares[SAGE]).toBe(0.75);
    expect(rows[2]!.shares[OTHER_SERIES_ID]).toBe(0.5);
    expect(sum(Object.values(rows[0]!.shares))).toBeCloseTo(1, 10);
    expect(sum(Object.values(rows[2]!.shares))).toBeCloseTo(1, 10);
    expect(sum(Object.values(rows[1]!.shares))).toBe(0);
  });
});

describe("fieldVsTopCut and overallShare", () => {
  const meta = mergeAggregates(EVENTS);

  it("compares field share with top cut share per series", () => {
    const rows = fieldVsTopCut(meta);
    expect(rows.map((r) => r.seriesId)).toEqual(chartSeriesIds());
    expect(sum(rows.map((r) => r.fieldShare))).toBeCloseTo(1, 10);
    expect(sum(rows.map((r) => r.topCutShare))).toBeCloseTo(1, 10);
    expect(rows.find((r) => r.seriesId === AVENGER)).toMatchObject({ label: "Avenger", fieldShare: 16 / 52, topCutShare: 6 / 12 });
    expect(rows.find((r) => r.seriesId === OTHER_SERIES_ID)).toMatchObject({ fieldShare: 6 / 52, topCutShare: 2 / 12 });
  });

  it("gives pie rows that add up to the field", () => {
    const rows = overallShare(meta);
    expect(sum(rows.map((r) => r.entries))).toBe(meta.playerCount);
    expect(sum(rows.map((r) => r.share))).toBeCloseTo(1, 10);
    expect(rows.find((r) => r.seriesId === SAGE)).toMatchObject({ entries: 30, share: 30 / 52 });
  });

  it("returns zeros for an empty meta", () => {
    const empty = mergeAggregates([]);
    expect(fieldVsTopCut(empty).every((r) => r.fieldShare === 0 && r.topCutShare === 0)).toBe(true);
    expect(overallShare(empty).every((r) => r.entries === 0 && r.share === 0)).toBe(true);
    expect(metaShareByEvent([])).toEqual([]);
  });
});
