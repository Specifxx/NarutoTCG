import { describe, expect, it } from "vitest";
import { ARCHETYPES, ROGUE_ID } from "@/lib/data/archetypes";
import { createRng } from "@/lib/random";
import { templateDecklist } from "./__fixtures__/lists";
import { classifyDecklist, CLASSIFY_THRESHOLD, MAX_LABEL_LENGTH, resolveArchetypeLabel } from "./archetypes";

const TRACKED = ARCHETYPES.filter((a) => a.id !== ROGUE_ID);

describe("resolveArchetypeLabel", () => {
  it.each([
    ["akatsuki-pain", "akatsuki-pain", "id"],
    ["Akatsuki Pain", "akatsuki-pain", "id"],
    ["Six Paths of Pain", "akatsuki-pain", "name"],
    ["Lee Rush", "taijutsu-lee", "name"],
    ["pain", "akatsuki-pain", "name"],
    ["deva path", "akatsuki-pain", "alias"],
    ["TAIJUTSU", "taijutsu-lee", "alias"],
    ["Sage Naruto", "uzumaki-sage", "name"],
    ["Rogue", ROGUE_ID, "id"],
    ["homebrew", ROGUE_ID, "alias"],
    ["Tsunade — Fifth Hokage", "medical-ninja", "alias"],
    ["Naruto Uzumaki — Kurama Link Mode", "uzumaki-sage", "alias"],
    ["Zabuza Momochi — Demon of the Mist", ROGUE_ID, "alias"],
    ["Lightning Sasuke Tempo", "uchiha-avenger", "fuzzy"],
    ["Gaara Control (Suna)", "sand-gaara", "fuzzy"],
    ["Puppet Brigad", "puppet-brigade", "fuzzy"],
    ["Itachii", "itachi-tsukuyomi", "fuzzy"],
  ])("%s → %s (%s)", (label, archetypeId, method) => {
    expect(resolveArchetypeLabel(label)).toMatchObject({ archetypeId, method });
  });

  it("resolves every archetype's own id, name, short name and aliases", () => {
    for (const archetype of ARCHETYPES) {
      for (const label of [archetype.id, archetype.name, archetype.shortName, ...archetype.aliases]) {
        expect(resolveArchetypeLabel(label).archetypeId).toBe(archetype.id);
      }
    }
  });

  it("maps unknown labels to rogue with zero confidence", () => {
    expect(resolveArchetypeLabel("Banana Shuffle")).toEqual({ archetypeId: ROGUE_ID, method: "unknown", confidence: 0 });
    expect(resolveArchetypeLabel("")).toMatchObject({ method: "unknown" });
  });

  it("does not guess when a label names two archetypes equally", () => {
    expect(resolveArchetypeLabel("Sasuke Naruto")).toMatchObject({ method: "unknown" });
  });
});

describe("classifyDecklist", () => {
  it("covers all 12 tracked archetypes", () => {
    expect(TRACKED).toHaveLength(12);
  });

  it.each(TRACKED.map((a) => [a.id]))("classifies the %s template with every Leader", (archetypeId) => {
    const archetype = TRACKED.find((a) => a.id === archetypeId)!;
    for (const leaderId of archetype.leaderIds) {
      const result = classifyDecklist(templateDecklist(archetypeId, { leaderId }));
      expect(result.archetypeId).toBe(archetypeId);
      expect(result.confidence).toBe(1);
      expect(Object.keys(result.scores)).toHaveLength(12);
    }
  });

  it.each(TRACKED.map((a) => [a.id]))("classifies randomly filled %s lists", (archetypeId) => {
    for (let seed = 0; seed < 10; seed++) {
      const list = templateDecklist(archetypeId, { rng: createRng(`${archetypeId}-${seed}`) });
      expect(classifyDecklist(list).archetypeId).toBe(archetypeId);
    }
  });

  it("classifies the rogue template as rogue", () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = classifyDecklist(templateDecklist(ROGUE_ID, { rng: createRng(`rogue-${seed}`) }));
      expect(result.archetypeId).toBe(ROGUE_ID);
      expect(result.confidence).toBe(1);
    }
  });

  it("names an archetype from its Leader alone, or from its signature cards alone", () => {
    const generic = templateDecklist(ROGUE_ID);
    expect(classifyDecklist({ ...generic, leaderId: "NT02-L02" })).toMatchObject({ archetypeId: "akatsuki-pain", confidence: 0.5 });
    const painCards = templateDecklist("akatsuki-pain").cards;
    expect(classifyDecklist({ leaderId: "NT02-L05", cards: painCards }).archetypeId).toBe("akatsuki-pain");
  });

  it("calls a light splash under a rogue Leader rogue", () => {
    const generic = templateDecklist(ROGUE_ID);
    const splash = [...generic.cards.slice(0, -2), { cardId: "NT02-009", quantity: 4 }, { cardId: "NT02-014", quantity: 4 }];
    const result = classifyDecklist({ leaderId: "NT02-L05", cards: splash });
    expect(result.archetypeId).toBe(ROGUE_ID);
    expect(result.scores["akatsuki-pain"]).toBeLessThan(CLASSIFY_THRESHOLD);
  });

  it("handles an empty main deck", () => {
    expect(classifyDecklist({ leaderId: "NT01-L02", cards: [] })).toMatchObject({ archetypeId: "medical-ninja", confidence: 0.5 });
    expect(classifyDecklist({ leaderId: "NT04-L03", cards: [] }).archetypeId).toBe(ROGUE_ID);
  });
});

describe("resolveArchetypeLabel on pathological labels", () => {
  const elapsed = (fn: () => unknown) => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  };

  it.each([
    ["an id-like label padded with spaces", `nt1${" ".repeat(10_000)}x`],
    ["a 200,000-character label", "a".repeat(200_000)],
    ["a long label of real words", "Pain ".repeat(2_000)],
  ])("reads %s quickly as unknown", (_, label) => {
    let result: ReturnType<typeof resolveArchetypeLabel> | undefined;
    expect(elapsed(() => (result = resolveArchetypeLabel(label)))).toBeLessThan(50);
    expect(result!.method).toBe("unknown");
  });

  it("still reads labels up to the length limit", () => {
    const long = `Pain ${"deck ".repeat(30)}`.trim();
    expect(long.length).toBeLessThanOrEqual(MAX_LABEL_LENGTH);
    expect(resolveArchetypeLabel(long).archetypeId).toBe("akatsuki-pain");
    expect(resolveArchetypeLabel(`Pain ${"deck ".repeat(50)}`).method).toBe("unknown");
    expect(resolveArchetypeLabel("Lightning Sasuke Tempo").method).toBe("fuzzy");
  });
});
