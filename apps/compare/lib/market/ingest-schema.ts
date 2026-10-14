/**
 * Wire format for POST /api/prices/cron.
 *
 * The envelope is validated strictly; each item is validated on its own so one
 * malformed row (common with scraped data) is reported without rejecting the batch.
 * Scraper-friendly coercions: "$1,234.56" / "12,50 €" / "1.234,56" → number, "4" → 4,
 * "Near Mint" → "NM", "Foil" → "foil", "TCGplayer" → "tcgplayer", number 7 → "7".
 */
import { z } from "zod";
import { MAX_INGEST_ITEMS, MAX_LISTINGS_PER_ITEM } from "./constants";
import { CONDITION_ORDER, FINISH_ORDER, RARITY_ORDER } from "./labels";
import type { CardCondition, CardFinish, Rarity, VendorId } from "./types";
import { VENDOR_ORDER } from "./vendors";

const MAX_PRICE = 1_000_000;
const MIN_PRICE = 0.01;

const US_AMOUNT = /^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/;
/** Decimal comma, as Cardmarket prints it: "12,50", "1.234,56". Exactly 1-2 decimals, so "1,234" stays US thousands. */
const EU_AMOUNT = /^\d{1,3}(\.\d{3})+,\d{1,2}$|^\d+,\d{1,2}$/;

/** Accepts numbers and price strings in US or EU notation with an optional $ / € / USD / EUR marker. */
function coerceMoney(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const cleaned = value.replace(/\b(USD|EUR)\b/gi, "").replace(/[$€\s]/g, "");
  if (cleaned === "") return null;
  if (US_AMOUNT.test(cleaned)) return Number(cleaned.replace(/,/g, ""));
  if (EU_AMOUNT.test(cleaned)) return Number(cleaned.replace(/\./g, "").replace(",", "."));
  return value;
}

/** "4" → 4, so counts scraped as page text still validate. */
function coerceInteger(value: unknown): unknown {
  return typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : value;
}

/** 7 → "7": collector numbers are text, but a scraper may emit a bare number. */
function coerceText(value: unknown): unknown {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : value;
}

const slug = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase().replace(/[\s_]+/g, "-") : value;

const CONDITION_ALIASES: Record<string, string> = {
  "near-mint": "NM",
  mint: "NM",
  "lightly-played": "LP",
  "light-played": "LP",
  "moderately-played": "MP",
  "heavily-played": "HP",
  damaged: "DMG",
};

function coerceCondition(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const upper = value.trim().toUpperCase();
  if ((CONDITION_ORDER as string[]).includes(upper)) return upper;
  return CONDITION_ALIASES[slug(value) as string] ?? value;
}

function coerceFinish(value: unknown): unknown {
  const s = slug(value);
  if (s === "nonfoil" || s === "normal" || s === "regular") return "non-foil";
  if (s === "holo" || s === "holofoil") return "foil";
  return s;
}

const money = z.preprocess(coerceMoney, z.number().finite().nonnegative().max(MAX_PRICE));
const positiveMoney = z.preprocess(
  coerceMoney,
  z.number().finite().min(MIN_PRICE, "must be at least one cent").max(MAX_PRICE),
);
/** PostgreSQL text cannot hold U+0000; reject it here so one bad row never fails the batch's write. */
const NO_NUL = [(value: string) => !value.includes("\u0000"), "must not contain NUL characters"] as const;
const text = (max: number) => z.string().trim().min(1).max(max).refine(...NO_NUL);
const httpUrl = z.url({ protocol: /^https?$/ }).max(2048).refine(...NO_NUL);

export const VendorSchema = z.preprocess(slug, z.enum(VENDOR_ORDER as [VendorId, ...VendorId[]]));
export const CurrencySchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  z.enum(["USD", "EUR"]),
);
export const FinishSchema = z.preprocess(coerceFinish, z.enum(FINISH_ORDER as [CardFinish, ...CardFinish[]]));
export const RaritySchema = z.preprocess(slug, z.enum(RARITY_ORDER as [Rarity, ...Rarity[]]));
export const ConditionSchema = z.preprocess(coerceCondition, z.enum(CONDITION_ORDER as [CardCondition, ...CardCondition[]]));

export const CardRefSchema = z
  .object({
    id: text(64).optional(),
    name: text(200).optional(),
    setCode: text(32).optional(),
    number: z.preprocess(coerceText, text(32)).optional(),
    finish: FinishSchema.optional(),
    /** Narrows ambiguous matches only, e.g. a foil vs a parallel sharing one collector number. */
    rarity: RaritySchema.optional(),
  })
  .refine((ref) => Boolean(ref.id || ref.name || (ref.setCode && ref.number)), {
    message: "card needs an id, a name, or a setCode + number",
  });

export const PriceValuesSchema = z.object({
  low: money.nullable().optional(),
  mid: money.nullable().optional(),
  high: money.nullable().optional(),
  market: money.nullable().optional(),
});

export const ListingSchema = z.object({
  seller: text(120).catch("Unknown seller"),
  condition: ConditionSchema.default("NM"),
  quantity: z.preprocess(coerceInteger, z.number().int().min(1).max(100_000)).default(1),
  price: positiveMoney,
  /** Null or omitted = shipping not stated. 0 = free shipping. */
  shipping: money.nullable().default(null),
  url: httpUrl.nullable().optional(),
});

export const IngestItemSchema = z
  .object({
    card: CardRefSchema,
    vendor: VendorSchema,
    /** Defaults to the vendor's home currency (Cardmarket EUR, others USD). */
    currency: CurrencySchema.optional(),
    url: httpUrl.nullable().optional(),
    /** Per-item override of the envelope's capturedAt. */
    capturedAt: z.iso.datetime({ offset: true }).optional(),
    prices: PriceValuesSchema.optional(),
    /** Total listings on the vendor page when individual listings were not captured. */
    listingsCount: z.preprocess(coerceInteger, z.number().int().nonnegative().max(1_000_000)).optional(),
    /** Omit to leave stored listings unchanged; send [] to clear them. */
    listings: z.array(ListingSchema).max(MAX_LISTINGS_PER_ITEM).optional(),
  })
  .refine(
    (item) =>
      Object.values(item.prices ?? {}).some((v) => typeof v === "number" && v >= MIN_PRICE) ||
      (item.listings?.length ?? 0) > 0,
    { message: "item needs at least one price of one cent or more in `prices`, or at least one listing" },
  );

export const IngestEnvelopeSchema = z.object({
  source: z.string().trim().min(1).max(100).default("unknown"),
  capturedAt: z.iso.datetime({ offset: true }),
  fxRates: z.object({ EUR: z.number().positive().max(10).optional() }).optional(),
  items: z.array(z.unknown()).min(1).max(MAX_INGEST_ITEMS),
});

export type IngestEnvelope = z.infer<typeof IngestEnvelopeSchema>;
export type IngestItem = z.infer<typeof IngestItemSchema>;
export type IngestListing = z.infer<typeof ListingSchema>;

/** Compact "path: message" lines for API error responses. */
export function describeZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export interface IngestRejection {
  /** Position in the request's `items` array. */
  index: number;
  reason: string;
}

export interface IngestAccepted {
  index: number;
  cardId: string;
  vendor: VendorId;
}

/** Response body of POST /api/prices/cron. (GET, the daily rollup, returns ingest.ts `RollupResponse`.) */
export interface IngestResponse {
  ok: boolean;
  /** "dry-run" when no database is configured: validated and normalized, nothing stored. */
  mode: "persisted" | "dry-run";
  source: string;
  received: number;
  accepted: IngestAccepted[];
  rejected: IngestRejection[];
  written: { vendorQuotes: number; listings: number; historyPoints: number; marketPoints: number };
}

export interface ApiError {
  ok: false;
  error: string;
  details?: string[];
}
