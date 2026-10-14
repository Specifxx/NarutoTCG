// Runtime validation for the JSON data files in public/data. Everything that
// reaches the UI passes through `validateDataset`, so scraped or hand-edited
// data can never violate the types in @naruto-tcg/types at runtime.
import {
  CARD_TYPES,
  CHAKRA_ELEMENTS,
  PRINTING_VARIANTS,
  RARITIES,
  SET_KINDS,
  type CardPrinting,
  type CardReveal,
  type CardSet,
  type Deck,
  type DeckEntry,
  type NarutoCard,
} from "@naruto-tcg/types";
import { printingKey } from "./meta";

export const DECK_SIZE = 50;
export const MAX_COPIES = 4;

export interface Dataset {
  cards: NarutoCard[];
  sets: CardSet[];
  decks: Deck[];
}

export interface ValidationResult {
  data: Dataset;
  /** Problems that make the data unusable; the build must fail. */
  errors: string[];
  /** Suspicious but renderable data, e.g. an incomplete set. */
  warnings: string[];
}

export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

class Issues {
  readonly errors: string[] = [];
  readonly warnings: string[] = [];
  error(path: string, message: string): void {
    this.errors.push(`${path}: ${message}`);
  }
  warn(path: string, message: string): void {
    this.warnings.push(`${path}: ${message}`);
  }
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function requiredString(obj: Json, key: string, path: string, issues: Issues): string | undefined {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    issues.error(`${path}.${key}`, "must be a non-empty string");
    return undefined;
  }
  return value.trim();
}

function optionalString(obj: Json, key: string, path: string, issues: Issues): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    issues.error(`${path}.${key}`, "must be a string when present");
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalInteger(
  obj: Json,
  key: string,
  path: string,
  issues: Issues,
  range: { min: number; max: number },
): number | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < range.min || value > range.max) {
    issues.error(`${path}.${key}`, `must be an integer between ${range.min} and ${range.max}`);
    return undefined;
  }
  return value;
}

function stringList(obj: Json, key: string, path: string, issues: Issues): string[] {
  const value = obj[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.error(`${path}.${key}`, "must be an array of strings");
    return [];
  }
  const out: string[] = [];
  value.forEach((item, i) => {
    if (typeof item !== "string" || item.trim() === "") {
      issues.error(`${path}.${key}[${i}]`, "must be a non-empty string");
      return;
    }
    const trimmed = item.trim();
    if (out.includes(trimmed)) issues.warn(`${path}.${key}`, `duplicate entry "${trimmed}"`);
    else out.push(trimmed);
  });
  return out;
}

/** Absolute http(s) URL or a root-relative path served from /public. */
function optionalImageUrl(obj: Json, key: string, path: string, issues: Issues): string | undefined {
  const value = optionalString(obj, key, path, issues);
  if (value === undefined) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (isHttpUrl(value)) return value;
  issues.error(`${path}.${key}`, `"${value}" must be an http(s) URL or a root-relative path`);
  return undefined;
}

function requiredId(obj: Json, key: string, path: string, issues: Issues): string | undefined {
  const value = requiredString(obj, key, path, issues);
  if (value !== undefined && !ID_PATTERN.test(value)) {
    issues.error(`${path}.${key}`, `"${value}" may only contain letters, digits, "-" and "_"`);
    return undefined;
  }
  return value;
}

function requiredIsoDate(obj: Json, key: string, path: string, issues: Issues): string | undefined {
  const value = requiredString(obj, key, path, issues);
  if (value !== undefined && !isValidIsoDate(value)) {
    issues.error(`${path}.${key}`, `"${value}" must be a valid YYYY-MM-DD date`);
    return undefined;
  }
  return value;
}

function parsePrinting(raw: unknown, path: string, issues: Issues): CardPrinting | undefined {
  if (!isRecord(raw)) {
    issues.error(path, "must be an object");
    return undefined;
  }
  const setId = requiredId(raw, "setId", path, issues);
  const number = requiredString(raw, "number", path, issues);
  const rarity = raw.rarity;
  if (!isOneOf(RARITIES, rarity)) issues.error(`${path}.rarity`, `must be one of ${RARITIES.join(", ")}`);
  // Scrapers usually only see the base printing, so default the variant.
  const variant = raw.variant ?? "standard";
  if (!isOneOf(PRINTING_VARIANTS, variant)) {
    issues.error(`${path}.variant`, `must be one of ${PRINTING_VARIANTS.join(", ")}`);
  }
  const imageUrl = optionalImageUrl(raw, "imageUrl", path, issues);
  if (setId === undefined || number === undefined || !isOneOf(RARITIES, rarity) || !isOneOf(PRINTING_VARIANTS, variant)) {
    return undefined;
  }
  return { setId, number, rarity, variant, ...(imageUrl && { imageUrl }) };
}

function parseReveal(raw: unknown, path: string, issues: Issues): CardReveal | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    issues.error(path, "must be an object when present");
    return undefined;
  }
  const date = requiredIsoDate(raw, "date", path, issues);
  const source = requiredString(raw, "source", path, issues);
  const url = requiredString(raw, "url", path, issues);
  if (url !== undefined && !isHttpUrl(url)) issues.error(`${path}.url`, `"${url}" must be an http(s) URL`);
  if (date === undefined || source === undefined || url === undefined || !isHttpUrl(url)) return undefined;
  return { date, source, url };
}

function parseCard(raw: unknown, path: string, issues: Issues): NarutoCard | undefined {
  if (!isRecord(raw)) {
    issues.error(path, "must be an object");
    return undefined;
  }
  const id = requiredId(raw, "id", path, issues);
  const label = id ? `cards[${id}]` : path;
  const name = requiredString(raw, "name", label, issues);
  const title = optionalString(raw, "title", label, issues);

  const type = raw.type;
  if (!isOneOf(CARD_TYPES, type)) issues.error(`${label}.type`, `must be one of ${CARD_TYPES.join(", ")}`);
  const element = raw.element;
  if (!isOneOf(CHAKRA_ELEMENTS, element)) {
    issues.error(`${label}.element`, `must be one of ${CHAKRA_ELEMENTS.join(", ")}`);
  }

  const cost = optionalInteger(raw, "cost", label, issues, { min: 0, max: 20 });
  const power = optionalInteger(raw, "power", label, issues, { min: 0, max: 100_000 });
  if (type === "leader" && cost !== undefined) issues.error(`${label}.cost`, "leaders must not have a cost");
  // Missing (not malformed) values; malformed ones were reported above.
  if (type !== "leader" && isOneOf(CARD_TYPES, type) && (raw.cost === undefined || raw.cost === null)) {
    issues.error(`${label}.cost`, `${type} cards require a cost`);
  }
  if ((type === "leader" || type === "character") && (raw.power === undefined || raw.power === null)) {
    issues.error(`${label}.power`, `${type} cards require power`);
  }

  const traits = stringList(raw, "traits", label, issues);
  const keywords = stringList(raw, "keywords", label, issues);
  const effectRaw = raw.effect ?? "";
  if (typeof effectRaw !== "string") issues.error(`${label}.effect`, "must be a string");
  const effect = typeof effectRaw === "string" ? effectRaw.trim() : "";
  const flavor = optionalString(raw, "flavor", label, issues);
  const artist = optionalString(raw, "artist", label, issues);
  const imageUrl = optionalImageUrl(raw, "imageUrl", label, issues);

  const printings: CardPrinting[] = [];
  if (!Array.isArray(raw.printings) || raw.printings.length === 0) {
    issues.error(`${label}.printings`, "must be a non-empty array");
  } else {
    raw.printings.forEach((p, i) => {
      const parsed = parsePrinting(p, `${label}.printings[${i}]`, issues);
      if (parsed) printings.push(parsed);
    });
  }
  const reveal = parseReveal(raw.reveal, `${label}.reveal`, issues);

  if (
    id === undefined ||
    name === undefined ||
    !isOneOf(CARD_TYPES, type) ||
    !isOneOf(CHAKRA_ELEMENTS, element) ||
    printings.length === 0
  ) {
    return undefined;
  }

  return {
    id,
    name,
    ...(title && { title }),
    type,
    element,
    ...(cost !== undefined && { cost }),
    ...(power !== undefined && { power }),
    traits,
    keywords,
    effect,
    ...(flavor && { flavor }),
    ...(artist && { artist }),
    ...(imageUrl && { imageUrl }),
    printings,
    ...(reveal && { reveal }),
  };
}

function parseSet(raw: unknown, path: string, issues: Issues): CardSet | undefined {
  if (!isRecord(raw)) {
    issues.error(path, "must be an object");
    return undefined;
  }
  const id = requiredId(raw, "id", path, issues);
  const label = id ? `sets[${id}]` : path;
  const name = requiredString(raw, "name", label, issues);
  const shortName = optionalString(raw, "shortName", label, issues) ?? name;
  const kind = raw.kind;
  if (!isOneOf(SET_KINDS, kind)) issues.error(`${label}.kind`, `must be one of ${SET_KINDS.join(", ")}`);
  const releaseDate = requiredIsoDate(raw, "releaseDate", label, issues);
  const totalCards = optionalInteger(raw, "totalCards", label, issues, { min: 0, max: 10_000 });
  if (raw.totalCards === undefined) issues.error(`${label}.totalCards`, "is required");
  const description = optionalString(raw, "description", label, issues);
  if (
    id === undefined ||
    name === undefined ||
    shortName === undefined ||
    !isOneOf(SET_KINDS, kind) ||
    releaseDate === undefined ||
    totalCards === undefined
  ) {
    return undefined;
  }
  return { id, name, shortName, kind, releaseDate, totalCards, ...(description && { description }) };
}

function parseDeck(raw: unknown, path: string, issues: Issues): Deck | undefined {
  if (!isRecord(raw)) {
    issues.error(path, "must be an object");
    return undefined;
  }
  const id = requiredId(raw, "id", path, issues);
  const label = id ? `decks[${id}]` : path;
  const name = requiredString(raw, "name", label, issues);
  const owner = optionalString(raw, "owner", label, issues);
  const description = optionalString(raw, "description", label, issues);
  const leaderId = optionalString(raw, "leaderId", label, issues);
  const archetype = optionalString(raw, "archetype", label, issues);
  const createdAt = requiredString(raw, "createdAt", label, issues);
  const updatedAt = requiredString(raw, "updatedAt", label, issues);
  for (const [key, value] of [
    ["createdAt", createdAt],
    ["updatedAt", updatedAt],
  ] as const) {
    if (value !== undefined && !ISO_DATETIME_PATTERN.test(value)) {
      issues.error(`${label}.${key}`, `"${value}" must be an ISO date or datetime`);
    }
  }

  const cards: DeckEntry[] = [];
  if (!Array.isArray(raw.cards)) {
    issues.error(`${label}.cards`, "must be an array");
  } else {
    raw.cards.forEach((entry, i) => {
      const entryPath = `${label}.cards[${i}]`;
      if (!isRecord(entry)) {
        issues.error(entryPath, "must be an object");
        return;
      }
      const cardId = requiredId(entry, "cardId", entryPath, issues);
      const quantity = optionalInteger(entry, "quantity", entryPath, issues, { min: 1, max: MAX_COPIES });
      if (entry.quantity === undefined) issues.error(`${entryPath}.quantity`, "is required");
      if (cardId !== undefined && quantity !== undefined) cards.push({ cardId, quantity });
    });
  }

  if (id === undefined || name === undefined || createdAt === undefined || updatedAt === undefined) return undefined;
  return {
    id,
    name,
    ...(owner && { owner }),
    ...(description && { description }),
    ...(leaderId && { leaderId }),
    ...(archetype && { archetype }),
    cards,
    createdAt,
    updatedAt,
  };
}

function parseArray<T>(
  raw: unknown,
  name: string,
  parse: (item: unknown, path: string, issues: Issues) => T | undefined,
  issues: Issues,
): T[] {
  if (!Array.isArray(raw)) {
    issues.error(name, "must be a JSON array");
    return [];
  }
  const out: T[] = [];
  raw.forEach((item, i) => {
    const parsed = parse(item, `${name}[${i}]`, issues);
    if (parsed !== undefined) out.push(parsed);
  });
  return out;
}

/** Cross-record checks: uniqueness and referential integrity. */
function checkIntegrity(data: Dataset, issues: Issues): void {
  const setIds = new Set<string>();
  for (const set of data.sets) {
    if (setIds.has(set.id)) issues.error(`sets[${set.id}]`, "duplicate set id");
    setIds.add(set.id);
  }

  const cardsById = new Map<string, NarutoCard>();
  const printingOwners = new Map<string, string>();
  const numbersBySet = new Map<string, Set<string>>();
  for (const card of data.cards) {
    if (cardsById.has(card.id)) issues.error(`cards[${card.id}]`, "duplicate card id");
    cardsById.set(card.id, card);
    for (const printing of card.printings) {
      if (!setIds.has(printing.setId)) {
        issues.error(`cards[${card.id}].printings`, `unknown setId "${printing.setId}"`);
      }
      const key = printingKey(printing);
      const owner = printingOwners.get(key);
      if (owner !== undefined) issues.error(`cards[${card.id}].printings`, `printing ${key} is also listed on ${owner}`);
      printingOwners.set(key, card.id);
      const numbers = numbersBySet.get(printing.setId) ?? new Set<string>();
      numbers.add(printing.number);
      numbersBySet.set(printing.setId, numbers);
    }
  }

  for (const set of data.sets) {
    const known = numbersBySet.get(set.id)?.size ?? 0;
    if (known > set.totalCards) {
      issues.warn(`sets[${set.id}]`, `${known} collector numbers known but totalCards is ${set.totalCards}`);
    }
  }

  const deckIds = new Set<string>();
  for (const deck of data.decks) {
    const label = `decks[${deck.id}]`;
    if (deckIds.has(deck.id)) issues.error(label, "duplicate deck id");
    deckIds.add(deck.id);
    if (deck.leaderId !== undefined) {
      const leader = cardsById.get(deck.leaderId);
      if (!leader) issues.error(`${label}.leaderId`, `unknown card "${deck.leaderId}"`);
      else if (leader.type !== "leader") issues.error(`${label}.leaderId`, `"${deck.leaderId}" is not a leader`);
    }
    const seen = new Set<string>();
    let total = 0;
    for (const entry of deck.cards) {
      const card = cardsById.get(entry.cardId);
      if (!card) issues.error(`${label}.cards`, `unknown card "${entry.cardId}"`);
      else if (card.type === "leader") issues.error(`${label}.cards`, `leader "${entry.cardId}" belongs in leaderId`);
      if (seen.has(entry.cardId)) issues.error(`${label}.cards`, `"${entry.cardId}" is listed more than once`);
      seen.add(entry.cardId);
      total += entry.quantity;
    }
    if (total !== DECK_SIZE) issues.warn(`${label}.cards`, `deck has ${total} cards (expected ${DECK_SIZE})`);
  }
}

export function validateDataset(raw: { cards: unknown; sets: unknown; decks: unknown }): ValidationResult {
  const issues = new Issues();
  const data: Dataset = {
    sets: parseArray(raw.sets, "sets", parseSet, issues),
    cards: parseArray(raw.cards, "cards", parseCard, issues),
    decks: parseArray(raw.decks, "decks", parseDeck, issues),
  };
  checkIntegrity(data, issues);
  return { data, errors: issues.errors, warnings: issues.warnings };
}
