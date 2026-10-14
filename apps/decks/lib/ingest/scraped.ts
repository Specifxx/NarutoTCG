import type { EventLocation, EventTier } from "@naruto-tcg/types";
import { z } from "zod";
import { EventLocationSchema, EventTierSchema, zodIssues } from "./schema";
import { normalizeDate, normalizeName } from "./text";
import type { EventMetaInput, IngestIssue, IngestSource, RawEvent, RawPairing, RawStanding } from "./types";

/**
 * The loose JSON a browser extension or scraper produces from a results page. Numbers may
 * arrive as strings, unknown keys are ignored and missing values may be null. Rows are
 * validated one by one, so a malformed row is skipped instead of failing the whole file.
 */

const Numberish = z.union([z.number(), z.string()]);

export const ScrapedDecklistSchema = z.union([
  z.string(),
  z.object({
    leader: z.string().nullish(),
    cards: z.array(z.object({ quantity: Numberish, name: z.string().nullish(), id: z.string().nullish() })),
  }),
]);

export const ScrapedStandingSchema = z.object({
  placement: Numberish.nullish(),
  player: z.string().trim().min(1),
  playerId: z.string().nullish(),
  country: z.string().nullish(),
  archetype: z.string().nullish(),
  record: z.union([z.string(), z.object({ wins: z.number(), losses: z.number(), draws: z.number().nullish() })]).nullish(),
  points: Numberish.nullish(),
  dropped: z.union([z.boolean(), z.string()]).nullish(),
  decklist: ScrapedDecklistSchema.nullish(),
});

export const ScrapedPairingSchema = z.object({
  round: Numberish,
  stage: z.string().nullish(),
  table: Numberish.nullish(),
  player1: z.string().trim().min(1),
  /** Null, empty or "BYE" for a bye. */
  player2: z.string().nullish(),
  result: z.string().nullish(),
  winner: z.string().nullish(),
});

export const ScrapedEventSchema = z.object({
  name: z.string().trim().min(1),
  date: z.string().trim().min(1),
  tier: z.string().nullish(),
  format: z.string().nullish(),
  location: z.union([z.string(), EventLocationSchema]).nullish(),
  organizer: z.string().nullish(),
  swissRounds: Numberish.nullish(),
  topCutSize: Numberish.nullish(),
  bestOf: Numberish.nullish(),
  sourceUrl: z.string().nullish(),
  notes: z.string().nullish(),
});

export const ScrapedTournamentSchema = z.object({
  event: ScrapedEventSchema,
  standings: z.array(ScrapedStandingSchema).nullish(),
  pairings: z.array(ScrapedPairingSchema).nullish(),
});

export type ScrapedTournament = z.infer<typeof ScrapedTournamentSchema>;
export type ScrapedStanding = z.infer<typeof ScrapedStandingSchema>;
export type ScrapedPairing = z.infer<typeof ScrapedPairingSchema>;

const EnvelopeSchema = z.object({
  event: ScrapedEventSchema,
  standings: z.array(z.unknown()).nullish(),
  pairings: z.array(z.unknown()).nullish(),
});

/**
 * Event tier from loose labels: "Regional", "RC", "Store Champ", "SC", "Nationals", "Online",
 * or the canonical ids. Null when unrecognized.
 */
export function parseTier(raw: string): EventTier | null {
  const key = normalizeName(raw);
  const exact = EventTierSchema.options.find((tier) => normalizeName(tier) === key);
  if (exact) return exact;
  if (/\b(national|nationals|nats|nc)\b/.test(key)) return "national-championship";
  if (/\b(regional|regionals|rc)\b/.test(key)) return "regional-championship";
  if (/\b(online|webcam|open)\b/.test(key)) return "online-open";
  if (/\b(store|sc|local|locals|shop)\b/.test(key)) return "store-championship";
  return null;
}

/**
 * Splits "Venue, City, Region, Country" from the right: one part is a city, two are city and
 * region, three add the country, and anything before those is the venue. "Online" (or a
 * label containing it) is an online event.
 */
export function parseLocation(text: string): EventLocation {
  if (/\b(online|webcam|remote)\b/i.test(text)) return { online: true };
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  const [city, region, country] = parts.length > 3 ? parts.slice(-3) : parts;
  const location: EventLocation = {};
  if (city) location.city = city;
  if (region) location.region = region;
  if (country) location.country = country;
  if (parts.length > 3) location.venue = parts.slice(0, -3).join(", ");
  return location;
}

/** First whole number in a value ("Top 8" → 8, "5 rounds" → 5), or undefined. */
function toCount(value: number | string | null | undefined): number | undefined {
  if (typeof value === "number") return Number.isInteger(value) && value >= 0 ? value : undefined;
  const match = (value ?? "").match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

const text = (value: number | string | null | undefined) =>
  value === null || value === undefined || String(value).trim() === "" ? undefined : String(value).trim();

function decklistToText(list: NonNullable<ScrapedStanding["decklist"]>): string {
  if (typeof list === "string") return list;
  const lines = list.leader ? [`Leader: ${list.leader}`] : [];
  for (const card of list.cards) {
    const label = [card.name?.trim(), card.id ? `(${card.id.trim()})` : undefined].filter(Boolean).join(" ");
    lines.push(`${String(card.quantity).trim()} ${label}`);
  }
  return lines.join("\n");
}

function parseRows<T>(items: readonly unknown[], schema: z.ZodType<T>, source: IngestSource, issues: IngestIssue[]) {
  const rows: Array<{ row: number; value: T }> = [];
  items.forEach((item, index) => {
    const parsed = schema.safeParse(item);
    if (parsed.success) rows.push({ row: index + 1, value: parsed.data });
    else {
      for (const issue of zodIssues(parsed.error, source, `${source}[${index}]`)) {
        issues.push({ ...issue, row: index + 1, message: `${issue.message} (row skipped)` });
      }
    }
  });
  return rows;
}

function toMeta(event: z.infer<typeof ScrapedEventSchema>, issues: IngestIssue[]): EventMetaInput {
  const tier = event.tier ? parseTier(event.tier) : null;
  if (!tier) {
    issues.push({
      severity: "warning",
      code: event.tier ? "unknown-tier" : "missing-tier",
      message: event.tier
        ? `Unrecognized event tier "${event.tier}"; recorded as a Store Championship.`
        : "No event tier; recorded as a Store Championship.",
      source: "meta",
      field: "tier",
    });
  }
  const bestOf = toCount(event.bestOf);
  if (event.bestOf !== null && event.bestOf !== undefined && bestOf !== 1 && bestOf !== 3) {
    issues.push({ severity: "warning", code: "best-of-ignored", message: `Best-of "${event.bestOf}" is not 1 or 3; ignored, so the event defaults to best-of-3.`, source: "meta", field: "bestOf" });
  }
  const location = typeof event.location === "string" ? parseLocation(event.location) : (event.location ?? {});
  const notes = [event.notes?.trim(), event.sourceUrl ? `Source: ${event.sourceUrl.trim()}` : undefined].filter(Boolean).join(" ");
  return {
    name: event.name,
    date: normalizeDate(event.date) ?? event.date,
    tier: tier ?? "store-championship",
    ...(event.format?.trim() ? { format: event.format.trim() } : {}),
    location,
    organizer: event.organizer?.trim() ?? "",
    ...(toCount(event.swissRounds) !== undefined ? { swissRounds: toCount(event.swissRounds) } : {}),
    ...(toCount(event.topCutSize) !== undefined ? { topCutSize: toCount(event.topCutSize) } : {}),
    ...(bestOf === 1 || bestOf === 3 ? { bestOf } : {}),
    ...(notes ? { notes } : {}),
  };
}

function toStanding({ row, value }: { row: number; value: ScrapedStanding }): RawStanding {
  const record = typeof value.record === "object" && value.record !== null
    ? `${value.record.wins}-${value.record.losses}-${value.record.draws ?? 0}`
    : text(value.record);
  const dropped = typeof value.dropped === "boolean" ? (value.dropped ? "yes" : undefined) : text(value.dropped);
  return {
    row,
    name: value.player,
    playerId: text(value.playerId),
    placement: text(value.placement),
    country: text(value.country),
    archetype: text(value.archetype),
    record,
    points: text(value.points),
    dropped,
    decklist: value.decklist ? decklistToText(value.decklist) : undefined,
  };
}

function toPairing({ row, value }: { row: number; value: ScrapedPairing }): RawPairing {
  return {
    row,
    round: String(value.round).trim(),
    stage: text(value.stage),
    table: text(value.table),
    player1: value.player1,
    player2: value.player2?.trim() ?? "",
    result: text(value.result),
    winner: text(value.winner),
  };
}

/**
 * Converts scraped JSON into pipeline rows. Returns `raw: null` (with schema errors) only when
 * the `event` block is unusable; malformed rows are skipped with an error each. A missing or
 * unknown tier defaults to store championship with a warning; dates are normalized when the
 * spelling is unambiguous; a `sourceUrl` is kept in the notes.
 */
export function convertScraped(value: unknown): { raw: RawEvent | null; issues: IngestIssue[] } {
  const envelope = EnvelopeSchema.safeParse(value);
  if (!envelope.success) return { raw: null, issues: zodIssues(envelope.error, "json") };
  const issues: IngestIssue[] = [];
  const meta = toMeta(envelope.data.event, issues);
  const standings = parseRows(envelope.data.standings ?? [], ScrapedStandingSchema, "standings", issues).map(toStanding);
  const pairings = parseRows(envelope.data.pairings ?? [], ScrapedPairingSchema, "pairings", issues).map(toPairing);
  return { raw: { meta, standings, pairings, decklistRows: [] }, issues };
}
