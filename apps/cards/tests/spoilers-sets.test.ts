// Pure helpers behind the spoiler feed and the set checklists.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateDataset } from "@/lib/schema";
import { primaryPrinting, printingKey } from "@/lib/meta";
import {
  addDaysIso,
  formatMonthDay,
  groupByRevealDate,
  isNewReveal,
  latestRevealDate,
  limitRevealDays,
  revealTimeline,
  showcaseEntries,
  summarizeSet,
} from "@/components/spoilers/reveals";
import {
  entryMatches,
  matchesQuery,
  normalizeSearch,
  searchHaystack,
  tallyByRarity,
  type ChecklistIndexEntry,
} from "@/components/sets/checklist-model";

const dataDir = resolve(__dirname, "../public/data");
const readJson = (file: string): unknown => JSON.parse(readFileSync(resolve(dataDir, file), "utf8"));
const { data } = validateDataset({ cards: readJson("cards.json"), sets: readJson("sets.json"), decks: [] });

describe("date helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysIso("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(formatMonthDay("2026-10-13")).toBe("Oct 13");
  });
  it("isNewReveal uses a 7-day inclusive window ending on the anchor date (pages pass today)", () => {
    expect(isNewReveal("2026-10-13", "2026-10-13")).toBe(true);
    expect(isNewReveal("2026-10-07", "2026-10-13")).toBe(true);
    expect(isNewReveal("2026-10-06", "2026-10-13")).toBe(false);
    expect(isNewReveal(undefined, "2026-10-13")).toBe(false);
    expect(isNewReveal("2026-10-14", "2026-10-13")).toBe(false);
    // Anchored to today, old reveals stop being NEW even when no newer reveal exists.
    expect(isNewReveal("2026-10-13", "2026-12-15")).toBe(false);
    expect(isNewReveal(undefined, undefined)).toBe(false);
  });
});

describe("public/data reveals and sets", () => {
  const revealed = data.cards.filter((c) => c.reveal).sort((a, b) => (b.reveal?.date ?? "").localeCompare(a.reveal?.date ?? ""));

  it("groups reveals newest first without losing cards", () => {
    const days = groupByRevealDate(revealed);
    expect(days.reduce((n, d) => n + d.cards.length, 0)).toBe(revealed.length);
    for (let i = 1; i < days.length; i++) expect(days[i - 1]!.date > days[i]!.date).toBe(true);
    const latest = latestRevealDate(revealed);
    if (revealed.length) expect(latest).toBe(days[0]?.date);
  });

  it("builds a bounded, continuous timeline", () => {
    const t = revealTimeline(revealed);
    expect(t.days.length).toBeLessThanOrEqual(42);
    for (let i = 1; i < t.days.length; i++) expect(t.days[i]!.date).toBe(addDaysIso(t.days[i - 1]!.date, 1));
    if (revealed.length) {
      expect(t.days.at(-1)?.date).toBe(latestRevealDate(revealed));
      expect(t.peak).toBe(Math.max(...t.days.map((d) => d.count)));
      expect(t.total).toBe(t.days.reduce((n, d) => n + d.count, 0));
    }
  });

  it("caps the feed on whole days", () => {
    const days = groupByRevealDate(revealed);
    const { shown, omitted } = limitRevealDays(days, 240);
    const shownCount = shown.reduce((n, d) => n + d.cards.length, 0);
    expect(shownCount + omitted).toBe(revealed.length);
    if (shown.length > 1) expect(shownCount).toBeLessThanOrEqual(240);
  });

  it("summarizes every set", () => {
    for (const set of data.sets) {
      const entries = data.cards.flatMap((card) =>
        card.printings.filter((p) => p.setId === set.id).map((printing) => ({ card, printing, key: printingKey(printing) })),
      );
      const s = summarizeSet(set, entries);
      expect(s.printings).toBe(entries.length);
      expect(s.knownNumbers).toBeLessThanOrEqual(entries.length);
      expect(s.completion).toBeGreaterThanOrEqual(0);
      expect(s.completion).toBeLessThanOrEqual(1);
      const showcase = showcaseEntries(entries, () => 0);
      expect(new Set(showcase.map((e) => e.card.id)).size).toBe(showcase.length);
      // Only cards that debut in the set lend it their reveal date.
      const debutReveals = entries
        .filter((e) => primaryPrinting(e.card).setId === set.id)
        .flatMap((e) => (e.card.reveal ? [e.card.reveal.date] : []));
      expect(s.latestReveal).toBe(debutReveals.length > 0 ? debutReveals.sort().at(-1) : undefined);
    }
  });

  it("attributes a card's reveal to its debut set, not to sets that reprint it", () => {
    const card = revealed.find((c) => c.printings.length > 1);
    expect(card).toBeDefined();
    if (!card) return;
    const debut = primaryPrinting(card);
    const parallel = card.printings.find((p) => p !== debut && p.setId === debut.setId);
    const reprint = { ...debut, setId: "PR99", number: "PR99-001" };
    const withReprint = { ...card, printings: [...card.printings, reprint] };
    const entry = (printing: typeof debut) => ({ card: withReprint, printing, key: printingKey(printing) });

    expect(summarizeSet({ totalCards: 30 }, [entry(debut)]).latestReveal).toBe(card.reveal?.date);
    // The debut set's own parallels still count.
    if (parallel) expect(summarizeSet({ totalCards: 30 }, [entry(parallel)]).latestReveal).toBe(card.reveal?.date);
    // A later promo that reprints the card lists it, but it was not revealed for that set.
    const promo = summarizeSet({ totalCards: 8 }, [entry(reprint)]);
    expect(promo.knownNumbers).toBe(1);
    expect(promo.latestReveal).toBeUndefined();
  });
});

describe("checklist model", () => {
  const index: ChecklistIndexEntry[] = [
    { key: "a", rarity: "common", search: searchHaystack(["Naruto Uzumaki", "Number One Hyperactive Ninja", "ST01-001"]) },
    { key: "b", rarity: "rare", search: searchHaystack(["Sasuke Uchiha", undefined, "ST01-002"]) },
    { key: "c", rarity: "rare", search: searchHaystack(["Kakuzu Ōtsutsuki", "Keeper", "NR03-009"]) },
  ];
  it("normalizes search text and queries", () => {
    expect(normalizeSearch("  Ōtsutsuki—KEKKEI  ")).toBe("otsutsuki kekkei");
    expect(matchesQuery(index[2]!.search, normalizeSearch("otsutsuki"))).toBe(true);
    expect(matchesQuery(index[0]!.search, normalizeSearch("st01-001"))).toBe(true);
    expect(matchesQuery(index[0]!.search, normalizeSearch("001"))).toBe(true);
    expect(matchesQuery(index[0]!.search, normalizeSearch("naruto ninja"))).toBe(true);
    expect(matchesQuery(index[0]!.search, normalizeSearch("naruto sasuke"))).toBe(false);
    expect(matchesQuery(index[0]!.search, "")).toBe(true);
  });
  it("drops invisible format characters instead of splitting words", () => {
    expect(normalizeSearch("Naruto Uzu­maki")).toBe("naruto uzumaki");
    expect(normalizeSearch("Sasuke Uchi​ha")).toBe("sasuke uchiha");
    expect(normalizeSearch("‮Kakashi‬ Hatake﻿")).toBe("kakashi hatake");
    expect(matchesQuery(searchHaystack(["Naruto Uzu­maki", undefined, "ST01-001"]), normalizeSearch("uzumaki"))).toBe(true);
  });
  it("filters by status, rarity and query", () => {
    const owned = new Set(["b"]);
    const f = (status: "all" | "owned" | "missing", rarities: ("common" | "rare")[], query = "") =>
      index.filter((e) => entryMatches(e, { status, rarities, query }, normalizeSearch(query), owned)).map((e) => e.key);
    expect(f("all", [])).toEqual(["a", "b", "c"]);
    expect(f("owned", [])).toEqual(["b"]);
    expect(f("missing", [])).toEqual(["a", "c"]);
    expect(f("missing", ["rare"])).toEqual(["c"]);
    expect(f("all", [], "uchiha")).toEqual(["b"]);
    expect(tallyByRarity(index, owned, ["common", "rare", "promo"])).toEqual([
      { rarity: "common", total: 1, owned: 0 },
      { rarity: "rare", total: 2, owned: 1 },
    ]);
  });
});
