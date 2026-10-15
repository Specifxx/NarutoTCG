import type { EmblemName, Rank, Side } from "@/lib/game/types";

/**
 * Tutorial content schema (v1). Lessons are plain JSON files in
 * `content/lessons/*.json`, validated by `parseLesson` at build time, so
 * imported rulebook text (see `content/README.md`) fails the build loudly
 * instead of rendering a broken page.
 *
 * Text fields support a small markup:
 *   **bold**            → strong text
 *   [[AMBUSH]]          → keyword chip with a hover tooltip (matches term, id or alias)
 *   [[AMBUSH|ambushes]] → keyword chip with custom display text
 */

export const SCHEMA_VERSION = 1;

export const WIDGET_IDS = [
  "deck-forge",
  "chakra-charger",
  "hidden-card-sim",
  "mission-evaluator",
  "edge-duel",
] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export const ACCENTS = ["gold", "energy", "mist", "blood", "chakra", "leaf"] as const;
export type Accent = (typeof ACCENTS)[number];

export const EMBLEMS: readonly EmblemName[] = [
  "spiral",
  "leaf",
  "shuriken",
  "kunai",
  "scroll",
  "flame",
  "wave",
  "bolt",
  "gourd",
  "eye",
  "seal",
  "edge",
  "mask",
  "cloud",
  "kage",
  "fist",
  "fang",
  "lotus",
  "target",
  "chakra",
];

export const PHASES = ["start", "action", "mission", "end"] as const;
export type Phase = (typeof PHASES)[number];

export const TURN_ACTIONS = ["play", "hidden", "reveal", "upgrade", "pass"] as const;
export type TurnAction = (typeof TURN_ACTIONS)[number];

/** Animated illustration shown beside a step. */
export type StepVisual =
  | { kind: "phase-track"; active: Phase }
  | { kind: "deck-stack"; deckSize: number; missions: number; hand: number }
  | { kind: "chakra-formula"; base: number; characters: number; bonus?: number }
  | { kind: "card"; cardId: string; face?: "up" | "hidden" | "flip"; tokens?: number }
  | { kind: "mission-ladder"; highlight?: Rank }
  | { kind: "power-clash"; you: number; opp: number; edge: Side; label?: string }
  | { kind: "edge-token"; holder: Side; caption?: string }
  | { kind: "upgrade-stack"; fromCardId: string; toCardId: string }
  | { kind: "turn-order"; sequence: Array<{ side: Side; action: TurnAction }> };

export const VISUAL_KINDS = [
  "phase-track",
  "deck-stack",
  "chakra-formula",
  "card",
  "mission-ladder",
  "power-clash",
  "edge-token",
  "upgrade-stack",
  "turn-order",
] as const satisfies ReadonlyArray<StepVisual["kind"]>;

export interface SourceRef {
  /** e.g. "NARUTO Mythos TCG Rulebook (EN)" */
  document: string;
  page?: number | string;
  section?: string;
  url?: string;
}

export type CalloutTone = "tip" | "rule" | "warning";

export interface TutorialStep {
  /** Unique within the lesson, kebab-case. */
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  callout?: { tone: CalloutTone; text: string };
  visual?: StepVisual;
  source?: SourceRef;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  /** 2–4 choices. */
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export interface TutorialLesson {
  schemaVersion: typeof SCHEMA_VERSION;
  /** URL slug, kebab-case. */
  id: string;
  order: number;
  title: string;
  subtitle: string;
  summary: string;
  emblem: EmblemName;
  accent: Accent;
  estMinutes: number;
  steps: TutorialStep[];
  widget: { id: WidgetId; title: string; brief: string };
  quiz: QuizQuestion[];
  sources?: SourceRef[];
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

type Json = unknown;

class ContentError extends Error {
  constructor(file: string, path: string, message: string) {
    super(`[content] ${file} → ${path}: ${message}`);
    this.name = "ContentError";
  }
}

const isObj = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function makeChecker(file: string) {
  const fail = (path: string, message: string): never => {
    throw new ContentError(file, path, message);
  };
  const str = (v: Json, path: string, opts: { kebab?: boolean; optional?: boolean } = {}) => {
    if (v === undefined && opts.optional) return undefined;
    if (typeof v !== "string" || v.trim() === "") return fail(path, "expected a non-empty string");
    if (opts.kebab && !KEBAB.test(v)) return fail(path, `expected kebab-case, got "${v}"`);
    return v;
  };
  const num = (v: Json, path: string, opts: { min?: number; optional?: boolean; int?: boolean } = {}) => {
    if (v === undefined && opts.optional) return undefined;
    if (typeof v !== "number" || !Number.isFinite(v)) return fail(path, "expected a number");
    if (opts.int && !Number.isInteger(v)) return fail(path, "expected an integer");
    if (opts.min !== undefined && v < opts.min) return fail(path, `expected ≥ ${opts.min}`);
    return v;
  };
  const oneOf = <T extends string>(v: Json, allowed: readonly T[], path: string): T => {
    if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
      return fail(path, `expected one of ${allowed.join(", ")}; got ${JSON.stringify(v)}`);
    }
    return v as T;
  };
  const arr = (v: Json, path: string, opts: { min?: number; max?: number } = {}): Json[] => {
    if (!Array.isArray(v)) return fail(path, "expected an array");
    if (opts.min !== undefined && v.length < opts.min) return fail(path, `expected at least ${opts.min} items`);
    if (opts.max !== undefined && v.length > opts.max) return fail(path, `expected at most ${opts.max} items`);
    return v;
  };
  const obj = (v: Json, path: string): Record<string, Json> => (isObj(v) ? v : fail(path, "expected an object"));
  return { fail, str, num, oneOf, arr, obj };
}

const SIDE_VALUES = ["you", "opp"] as const;
const RANK_VALUES = ["D", "C", "B", "A"] as const;

function parseSource(c: ReturnType<typeof makeChecker>, v: Json, path: string): SourceRef {
  const o = c.obj(v, path);
  const page = o.page;
  if (page !== undefined && typeof page !== "number" && typeof page !== "string") c.fail(`${path}.page`, "expected number or string");
  return {
    document: c.str(o.document, `${path}.document`)!,
    ...(page !== undefined ? { page: page as number | string } : {}),
    ...(o.section !== undefined ? { section: c.str(o.section, `${path}.section`)! } : {}),
    ...(o.url !== undefined ? { url: c.str(o.url, `${path}.url`)! } : {}),
  };
}

function parseVisual(c: ReturnType<typeof makeChecker>, v: Json, path: string, knownCards: ReadonlySet<string>): StepVisual {
  const o = c.obj(v, path);
  const kind = c.oneOf(o.kind, VISUAL_KINDS, `${path}.kind`);
  const card = (value: Json, p: string) => {
    const id = c.str(value, p)!;
    if (!knownCards.has(id)) c.fail(p, `unknown practice card "${id}"`);
    return id;
  };
  switch (kind) {
    case "phase-track":
      return { kind, active: c.oneOf(o.active, PHASES, `${path}.active`) };
    case "deck-stack":
      return {
        kind,
        deckSize: c.num(o.deckSize, `${path}.deckSize`, { min: 1, int: true })!,
        missions: c.num(o.missions, `${path}.missions`, { min: 0, int: true })!,
        hand: c.num(o.hand, `${path}.hand`, { min: 0, int: true })!,
      };
    case "chakra-formula":
      return {
        kind,
        base: c.num(o.base, `${path}.base`, { min: 0, int: true })!,
        characters: c.num(o.characters, `${path}.characters`, { min: 0, int: true })!,
        ...(o.bonus !== undefined ? { bonus: c.num(o.bonus, `${path}.bonus`, { min: 0, int: true })! } : {}),
      };
    case "card":
      return {
        kind,
        cardId: card(o.cardId, `${path}.cardId`),
        ...(o.face !== undefined ? { face: c.oneOf(o.face, ["up", "hidden", "flip"] as const, `${path}.face`) } : {}),
        ...(o.tokens !== undefined ? { tokens: c.num(o.tokens, `${path}.tokens`, { min: 0, int: true })! } : {}),
      };
    case "mission-ladder":
      return {
        kind,
        ...(o.highlight !== undefined ? { highlight: c.oneOf(o.highlight, RANK_VALUES, `${path}.highlight`) } : {}),
      };
    case "power-clash":
      return {
        kind,
        you: c.num(o.you, `${path}.you`, { min: 0 })!,
        opp: c.num(o.opp, `${path}.opp`, { min: 0 })!,
        edge: c.oneOf(o.edge, SIDE_VALUES, `${path}.edge`),
        ...(o.label !== undefined ? { label: c.str(o.label, `${path}.label`)! } : {}),
      };
    case "edge-token":
      return {
        kind,
        holder: c.oneOf(o.holder, SIDE_VALUES, `${path}.holder`),
        ...(o.caption !== undefined ? { caption: c.str(o.caption, `${path}.caption`)! } : {}),
      };
    case "upgrade-stack":
      return { kind, fromCardId: card(o.fromCardId, `${path}.fromCardId`), toCardId: card(o.toCardId, `${path}.toCardId`) };
    case "turn-order":
      return {
        kind,
        sequence: c.arr(o.sequence, `${path}.sequence`, { min: 1, max: 12 }).map((s, i) => {
          const so = c.obj(s, `${path}.sequence[${i}]`);
          return {
            side: c.oneOf(so.side, SIDE_VALUES, `${path}.sequence[${i}].side`),
            action: c.oneOf(so.action, TURN_ACTIONS, `${path}.sequence[${i}].action`),
          };
        }),
      };
  }
}

/**
 * Validates raw JSON as a TutorialLesson. Throws a descriptive error naming the
 * file and field on the first problem.
 */
export function parseLesson(raw: Json, file: string, knownCards: ReadonlySet<string>): TutorialLesson {
  const c = makeChecker(file);
  const o = c.obj(raw, "$");
  if (o.schemaVersion !== SCHEMA_VERSION) c.fail("$.schemaVersion", `expected ${SCHEMA_VERSION}`);
  const header = {
    id: c.str(o.id, "$.id", { kebab: true })!,
    order: c.num(o.order, "$.order", { min: 1, int: true })!,
    title: c.str(o.title, "$.title")!,
    subtitle: c.str(o.subtitle, "$.subtitle")!,
    summary: c.str(o.summary, "$.summary")!,
    emblem: c.oneOf(o.emblem, EMBLEMS, "$.emblem"),
    accent: c.oneOf(o.accent, ACCENTS, "$.accent"),
    estMinutes: c.num(o.estMinutes, "$.estMinutes", { min: 1, int: true })!,
  };

  const stepIds = new Set<string>();
  const steps = c.arr(o.steps, "$.steps", { min: 1 }).map((s, i): TutorialStep => {
    const p = `$.steps[${i}]`;
    const so = c.obj(s, p);
    const id = c.str(so.id, `${p}.id`, { kebab: true })!;
    if (stepIds.has(id)) c.fail(`${p}.id`, `duplicate step id "${id}"`);
    stepIds.add(id);
    let callout: TutorialStep["callout"];
    if (so.callout !== undefined) {
      const co = c.obj(so.callout, `${p}.callout`);
      callout = {
        tone: c.oneOf(co.tone, ["tip", "rule", "warning"] as const, `${p}.callout.tone`),
        text: c.str(co.text, `${p}.callout.text`)!,
      };
    }
    return {
      id,
      title: c.str(so.title, `${p}.title`)!,
      body: c.str(so.body, `${p}.body`)!,
      ...(so.bullets !== undefined
        ? { bullets: c.arr(so.bullets, `${p}.bullets`, { max: 8 }).map((b, j) => c.str(b, `${p}.bullets[${j}]`)!) }
        : {}),
      ...(callout ? { callout } : {}),
      ...(so.visual !== undefined ? { visual: parseVisual(c, so.visual, `${p}.visual`, knownCards) } : {}),
      ...(so.source !== undefined ? { source: parseSource(c, so.source, `${p}.source`) } : {}),
    };
  });

  const w = c.obj(o.widget, "$.widget");
  const quizIds = new Set<string>();
  const quiz = c.arr(o.quiz, "$.quiz", { min: 1, max: 6 }).map((q, i): QuizQuestion => {
    const p = `$.quiz[${i}]`;
    const qo = c.obj(q, p);
    const id = c.str(qo.id, `${p}.id`, { kebab: true })!;
    if (quizIds.has(id)) c.fail(`${p}.id`, `duplicate quiz id "${id}"`);
    quizIds.add(id);
    const choices = c.arr(qo.choices, `${p}.choices`, { min: 2, max: 4 }).map((ch, j) => c.str(ch, `${p}.choices[${j}]`)!);
    const answerIndex = c.num(qo.answerIndex, `${p}.answerIndex`, { min: 0, int: true })!;
    if (answerIndex >= choices.length) c.fail(`${p}.answerIndex`, "out of range");
    return {
      id,
      prompt: c.str(qo.prompt, `${p}.prompt`)!,
      choices,
      answerIndex,
      explanation: c.str(qo.explanation, `${p}.explanation`)!,
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    ...header,
    steps,
    widget: {
      id: c.oneOf(w.id, WIDGET_IDS, "$.widget.id"),
      title: c.str(w.title, "$.widget.title")!,
      brief: c.str(w.brief, "$.widget.brief")!,
    },
    quiz,
    ...(o.sources !== undefined
      ? { sources: c.arr(o.sources, "$.sources").map((s, i) => parseSource(c, s, `$.sources[${i}]`)) }
      : {}),
  };
}
