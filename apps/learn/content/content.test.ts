import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PRACTICE_CARDS } from "../lib/game/cards";
import { keywordRefs, plainText, tokenize } from "../lib/rich-text";
import { findKeyword, KEYWORDS } from "./keywords";
import { LESSONS } from "./lessons";
import { PUZZLES } from "./puzzles";
import { ACCENTS, EMBLEMS, parseLesson, PHASES, TURN_ACTIONS, VISUAL_KINDS, WIDGET_IDS } from "./schema";

function lessonText(): Array<[where: string, text: string]> {
  const out: Array<[string, string]> = [];
  for (const l of LESSONS) {
    out.push([`${l.id}.summary`, l.summary], [`${l.id}.subtitle`, l.subtitle], [`${l.id}.widget.brief`, l.widget.brief]);
    for (const s of l.steps) {
      out.push([`${l.id}/${s.id}.body`, s.body]);
      s.bullets?.forEach((b, i) => out.push([`${l.id}/${s.id}.bullets[${i}]`, b]));
      if (s.callout) out.push([`${l.id}/${s.id}.callout`, s.callout.text]);
    }
    for (const q of l.quiz) {
      out.push([`${l.id}/quiz/${q.id}.prompt`, q.prompt], [`${l.id}/quiz/${q.id}.explanation`, q.explanation]);
      q.choices.forEach((c, i) => out.push([`${l.id}/quiz/${q.id}.choices[${i}]`, c]));
    }
  }
  for (const p of PUZZLES) {
    out.push([`puzzle ${p.id}.briefing`, p.briefing]);
    p.hints.forEach((h, i) => out.push([`puzzle ${p.id}.hints[${i}]`, h]));
    p.solution.forEach((s, i) => out.push([`puzzle ${p.id}.solution[${i}]`, s.why]));
  }
  return out;
}

describe("lessons", () => {
  it("has five lessons in order, one per widget", () => {
    assert.equal(LESSONS.length, 5);
    assert.deepEqual(
      LESSONS.map((l) => l.order),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(new Set(LESSONS.map((l) => l.widget.id)), new Set(WIDGET_IDS));
  });

  it("has unique lesson ids", () => {
    assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
  });

  it("rejects malformed lessons with a precise path", () => {
    assert.throws(() => parseLesson({ schemaVersion: 1, id: "Bad Id" }, "x.json", new Set()), /x\.json → \$\.id/);
    assert.throws(() => parseLesson({}, "y.json", new Set()), /schemaVersion/);
  });
});

describe("rich text", () => {
  it("tokenizes bold and keywords", () => {
    const tokens = tokenize("Pay **1 Chakra** to go [[hidden]], then [[AMBUSH|ambush]].");
    assert.equal(tokens.filter((t) => t.type === "keyword").length, 2);
    assert.equal(tokens.filter((t) => t.type === "bold").length, 1);
    assert.equal(plainText("[[AMBUSH|ambush]] **now**"), "ambush now");
  });

  it("every [[keyword]] in lessons and puzzles resolves", () => {
    const missing: string[] = [];
    for (const [where, text] of lessonText()) {
      for (const ref of keywordRefs(text)) if (!findKeyword(ref)) missing.push(`${where}: [[${ref}]]`);
    }
    assert.deepEqual(missing, []);
  });
});

describe("keywords", () => {
  it("has no alias collisions", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const k of KEYWORDS) {
      for (const key of new Set([k.id, k.term, ...k.aliases].map((x) => x.toLowerCase()))) {
        const owner = seen.get(key);
        if (owner && owner !== k.id) clashes.push(`"${key}" used by ${owner} and ${k.id}`);
        seen.set(key, k.id);
      }
    }
    assert.deepEqual(clashes, []);
  });

  it("related ids exist", () => {
    const ids = new Set(KEYWORDS.map((k) => k.id));
    const broken = KEYWORDS.flatMap((k) => k.related.filter((r) => !ids.has(r)).map((r) => `${k.id} → ${r}`));
    assert.deepEqual(broken, []);
  });

  it("includes the featured AMBUSH, POWERUP and EXHAUST entries", () => {
    for (const term of ["AMBUSH", "POWERUP", "EXHAUST"]) assert.ok(findKeyword(term)?.featured, term);
    assert.equal(findKeyword("EXHAUST")?.source.kind, "platform");
  });
});

describe("puzzles", () => {
  it("has unique ids and teaches known keywords", () => {
    assert.equal(new Set(PUZZLES.map((p) => p.id)).size, PUZZLES.length);
    for (const p of PUZZLES) for (const t of p.teaches) assert.ok(findKeyword(t), `${p.id} teaches unknown ${t}`);
  });
});

describe("JSON Schema", () => {
  const schema = JSON.parse(readFileSync(new URL("./tutorial-lesson.schema.json", import.meta.url), "utf8")) as {
    $defs: Record<string, { enum?: string[]; examples?: string[] } & Record<string, unknown>>;
  };
  const sorted = (xs: readonly string[]) => [...xs].sort();
  const defEnum = (name: string) => sorted(schema.$defs[name]?.enum ?? []);

  it("mirrors the TypeScript enums in content/schema.ts", () => {
    assert.deepEqual(defEnum("emblem"), sorted(EMBLEMS));
    assert.deepEqual(defEnum("accent"), sorted(ACCENTS));
    assert.deepEqual(defEnum("widgetId"), sorted(WIDGET_IDS));
    assert.deepEqual(defEnum("phase"), sorted(PHASES));
    assert.deepEqual(defEnum("turnAction"), sorted(TURN_ACTIONS));
  });

  it("lists every visual kind and every practice card", () => {
    const visual = schema.$defs.visual as { oneOf: Array<{ properties: { kind: { const: string } } }> };
    assert.deepEqual(sorted(visual.oneOf.map((v) => v.properties.kind.const)), sorted(VISUAL_KINDS));
    // Card ids are listed as examples (parseLesson enforces them against PRACTICE_CARDS).
    assert.deepEqual(sorted(schema.$defs.practiceCardId?.examples ?? []), sorted(Object.keys(PRACTICE_CARDS)));
  });
});
