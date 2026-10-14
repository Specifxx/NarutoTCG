import type { EventLocation, Tournament } from "@naruto-tcg/types";
import { z } from "zod";
import type { EventMetaInput, IngestIssue, IngestSource } from "./types";

/** Zod mirror of the canonical tournament record in `packages/types/src/competitive.ts`. */

export const EventTierSchema = z.enum(["store-championship", "online-open", "regional-championship", "national-championship"]);

export const EventLocationSchema = z.object({
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  venue: z.string().optional(),
  online: z.boolean().optional(),
});

export const DecklistSchema = z.object({
  leaderId: z.string().min(1),
  cards: z.array(z.object({ cardId: z.string().min(1), quantity: z.number().int().positive() })),
});

export const TournamentPlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  country: z.string().optional(),
  archetypeId: z.string().min(1),
  placement: z.number().int().positive(),
  dropped: z.boolean().optional(),
  decklist: DecklistSchema.optional(),
});

export const MatchRecordSchema = z.object({
  round: z.number().int().positive(),
  stage: z.enum(["swiss", "top-cut"]),
  table: z.number().int().positive().optional(),
  player1Id: z.string().min(1),
  player2Id: z.string().min(1).nullable(),
  outcome: z.enum(["p1", "p2", "draw", "bye"]),
  games: z.object({ p1: z.number().int().nonnegative(), p2: z.number().int().nonnegative() }).optional(),
  intentionalDraw: z.boolean().optional(),
});

export const BestOfSchema = z.union([z.literal(1), z.literal(3)]);

export const TournamentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: EventTierSchema,
  format: z.string(),
  date: z.string().min(1),
  location: EventLocationSchema,
  organizer: z.string(),
  swissRounds: z.number().int().nonnegative(),
  topCutSize: z.number().int().nonnegative(),
  bestOf: BestOfSchema,
  players: z.array(TournamentPlayerSchema),
  matches: z.array(MatchRecordSchema),
  source: z.enum(["seed", "import"]),
  importedAt: z.string().optional(),
  notes: z.string().optional(),
});

/** Event details for CSV imports (`--meta meta.json` in the CLI). Location and organizer may be omitted. */
export const EventMetaSchema = z.object({
  name: z.string().trim().min(1),
  date: z.string().trim().min(1),
  tier: EventTierSchema,
  format: z.string().optional(),
  location: EventLocationSchema.default({}),
  organizer: z.string().default(""),
  swissRounds: z.number().int().nonnegative().optional(),
  topCutSize: z.number().int().nonnegative().optional(),
  bestOf: BestOfSchema.optional(),
  notes: z.string().optional(),
});

/** Event fields that replace those of an imported JSON file; nothing is defaulted. */
export const EventMetaOverridesSchema = EventMetaSchema.extend({ location: EventLocationSchema, organizer: z.string() }).partial();

/**
 * True only when `A` and `B` are the same type. Unlike mutual assignability, it also fails when
 * one side lacks an optional key the other has.
 */
export type SameType<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// Compile-time guarantees that the schemas and the domain types stay in sync.
type Expect<T extends true> = T;
type SchemaTypeChecks = [
  Expect<SameType<z.infer<typeof TournamentSchema>, Tournament>>,
  Expect<SameType<z.infer<typeof EventLocationSchema>, EventLocation>>,
  Expect<SameType<z.infer<typeof EventMetaSchema>, EventMetaInput>>,
  Expect<SameType<z.infer<typeof EventMetaOverridesSchema>, Partial<EventMetaInput>>>,
];

export type JsonFormat = "canonical" | "scraped" | "unknown";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Canonical records have `players` and `matches` arrays; scraped exports have an `event` object. */
export function detectJsonFormat(value: unknown): JsonFormat {
  if (!isRecord(value)) return "unknown";
  if (Array.isArray(value.players) && Array.isArray(value.matches)) return "canonical";
  if (isRecord(value.event)) return "scraped";
  return "unknown";
}

/** "players[3].decklist.cards[0].quantity" */
export function formatIssuePath(path: readonly PropertyKey[]): string {
  return path
    .map((key, index) => (typeof key === "number" ? `[${key}]` : `${index === 0 ? "" : "."}${String(key)}`))
    .join("");
}

/** One error issue per schema violation, located by its JSON path. */
export function zodIssues(error: z.ZodError, source: IngestSource, prefix = ""): IngestIssue[] {
  return error.issues.map((issue) => {
    const path = formatIssuePath(issue.path);
    const field = prefix && path ? `${prefix}${path.startsWith("[") ? "" : "."}${path}` : prefix || path;
    return {
      severity: "error" as const,
      code: "schema",
      message: field ? `${field}: ${issue.message}` : issue.message,
      source,
      ...(field ? { field } : {}),
    };
  });
}
