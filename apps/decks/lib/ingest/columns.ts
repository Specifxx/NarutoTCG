import { foldDiacritics } from "./text";
import type { ColumnMapping, CsvKind } from "./types";

/** A canonical column the pipeline reads, with the header spellings TOs' tools export. */
export interface ColumnField {
  key: string;
  label: string;
  synonyms: readonly string[];
  hint: string;
}

export const CSV_KINDS: readonly CsvKind[] = ["standings", "pairings", "decklists"];

export const COLUMN_FIELDS: Readonly<Record<CsvKind, readonly ColumnField[]>> = {
  standings: [
    { key: "placement", label: "Placement", synonyms: ["rank", "place", "standing", "#", "position", "finish", "pos"], hint: "Final standing, 1 = winner." },
    { key: "player", label: "Player", synonyms: ["name", "player name", "competitor", "full name"], hint: "Display name." },
    { key: "playerId", label: "Player ID", synonyms: ["id", "handle", "username", "player id", "user id"], hint: "Stable handle; matched against the pairings." },
    { key: "country", label: "Country", synonyms: ["nation", "nationality"], hint: "ISO country code." },
    { key: "archetype", label: "Archetype", synonyms: ["deck", "deck archetype", "deck name"], hint: 'Deck name, e.g. "Pain" or "Sage Naruto".' },
    { key: "record", label: "Record", synonyms: ["w-l-d", "w/l/d", "w-l", "match record"], hint: 'Final record, e.g. "5-1-1".' },
    { key: "wins", label: "Wins", synonyms: ["w", "win", "match wins"], hint: "Match wins." },
    { key: "losses", label: "Losses", synonyms: ["l", "loss", "match losses"], hint: "Match losses." },
    { key: "draws", label: "Draws", synonyms: ["d", "t", "draw", "ties", "tie"], hint: "Match draws." },
    { key: "points", label: "Points", synonyms: ["pts", "match points", "mp"], hint: "Swiss match points." },
    { key: "dropped", label: "Dropped", synonyms: ["drop", "dropped?"], hint: 'Any non-empty value other than "no" marks a drop.' },
    { key: "decklist", label: "Decklist", synonyms: ["list", "deck list", "cards"], hint: 'Full list, cards separated by ";" or "|".' },
  ],
  pairings: [
    { key: "round", label: "Round", synonyms: ["rd", "round #", "rnd", "r"], hint: 'Round number, or a cut label such as "Top 8".' },
    { key: "table", label: "Table", synonyms: ["tbl", "table #", "table number"], hint: "Table number." },
    { key: "player1", label: "Player 1", synonyms: ["p1", "player a", "player one"], hint: "First player's name or handle." },
    { key: "player2", label: "Player 2", synonyms: ["p2", "player b", "player two", "opponent"], hint: 'Blank or "BYE" for a bye.' },
    { key: "result", label: "Result", synonyms: ["score", "outcome", "game score", "match result"], hint: 'Player 1\'s view: "2-1", "W", "ID", "bye".' },
    { key: "winner", label: "Winner", synonyms: ["won by", "match winner"], hint: "Winner's name, when there is no result column." },
    { key: "stage", label: "Stage", synonyms: ["phase", "bracket", "round type"], hint: '"Swiss" or "Top cut".' },
  ],
  decklists: [
    { key: "player", label: "Player", synonyms: ["name", "player name", "pilot", "player id"], hint: "Name or handle, as in the standings." },
    { key: "quantity", label: "Quantity", synonyms: ["qty", "count", "copies", "#", "amount"], hint: "Copies of the card." },
    { key: "card", label: "Card", synonyms: ["card name", "name"], hint: "Card name." },
    { key: "cardId", label: "Card ID", synonyms: ["id", "code", "card code", "card number", "set number"], hint: "Card id, e.g. NT02-009." },
    { key: "section", label: "Section", synonyms: ["type", "category", "card type"], hint: '"Leader", "Character", "Jutsu", …' },
  ],
};

/** Header comparison key: lowercase ASCII letters, digits and "#" only ("Round #" → "round#"). */
const compact = (text: string) => foldDiacritics(text).toLowerCase().replace(/[^a-z0-9#]+/g, "");
/** Synonyms shorter than this ("id", "w", "p1") only match whole headers. */
const MIN_CONTAINED_LENGTH = 3;

/**
 * Maps each field of `kind` to a header. Exact matches (ignoring case, spacing and punctuation)
 * win, a field's own key or label before its synonyms; remaining fields then take a header that
 * contains one of their synonyms, longest synonym first. Each header maps to at most one field.
 */
export function autoMapColumns(kind: CsvKind, headers: readonly string[]): ColumnMapping {
  const fields = COLUMN_FIELDS[kind];
  const candidates: Array<{ field: string; header: string; score: number; order: number }> = [];
  fields.forEach((field, order) => {
    const own = new Set([compact(field.key), compact(field.label)]);
    const synonyms = field.synonyms.map(compact);
    for (const header of headers) {
      const key = compact(header);
      if (!key) continue;
      let score = 0;
      if (own.has(key)) score = 3;
      else if (synonyms.includes(key)) score = 2;
      else {
        const contained = [...own, ...synonyms].filter((s) => s.length >= MIN_CONTAINED_LENGTH && key.includes(s));
        if (contained.length > 0) score = 1 + Math.max(...contained.map((s) => s.length)) / 1000;
      }
      if (score > 0) candidates.push({ field: field.key, header, score, order });
    }
  });
  candidates.sort((a, b) => b.score - a.score || a.order - b.order);

  const mapping: ColumnMapping = Object.fromEntries(fields.map((field) => [field.key, null]));
  const usedHeaders = new Set<string>();
  for (const { field, header } of candidates) {
    if (mapping[field] !== null || usedHeaders.has(header)) continue;
    mapping[field] = header;
    usedHeaders.add(header);
  }
  return mapping;
}

/** Required fields as groups: each group needs at least one mapped field. */
export function requiredFields(kind: CsvKind): string[][] {
  switch (kind) {
    case "standings":
      return [["player"]];
    case "pairings":
      return [["round"], ["player1"], ["result", "winner"]];
    case "decklists":
      return [["player"], ["quantity"], ["card", "cardId"]];
  }
}

/** The required groups `mapping` leaves unsatisfied. */
export function missingRequiredFields(kind: CsvKind, mapping: ColumnMapping): string[][] {
  return requiredFields(kind).filter((group) => !group.some((field) => Boolean(mapping[field])));
}

/** "Result or Winner" for a group of field keys. */
export function describeFields(kind: CsvKind, keys: readonly string[]): string {
  const labels = keys.map((key) => COLUMN_FIELDS[kind].find((field) => field.key === key)?.label ?? key);
  return labels.join(" or ");
}

/**
 * Guesses what a file holds from its headers: required fields covered (60%) plus the share of
 * headers that map to a field (40%). `confidence` is the winning score, 0..1.
 */
export function detectCsvKind(headers: readonly string[]): { kind: CsvKind; confidence: number } {
  let best: { kind: CsvKind; confidence: number } = { kind: "standings", confidence: 0 };
  for (const kind of CSV_KINDS) {
    const mapping = autoMapColumns(kind, headers);
    const groups = requiredFields(kind);
    const covered = groups.length - missingRequiredFields(kind, mapping).length;
    const mapped = Object.values(mapping).filter(Boolean).length;
    const confidence = Math.round((0.6 * (covered / groups.length) + 0.4 * (headers.length === 0 ? 0 : mapped / headers.length)) * 100) / 100;
    if (confidence > best.confidence) best = { kind, confidence };
  }
  return best;
}

/**
 * Trimmed value of `field` in `row` under `mapping`; "" when unmapped or absent. Only the row's
 * own string values are read, so a header named like an Object member ("toString") is never
 * mistaken for one.
 */
export function cell(row: Record<string, string>, mapping: ColumnMapping, field: string): string {
  const header = Object.hasOwn(mapping, field) ? mapping[field] : null;
  const value = typeof header === "string" && Object.hasOwn(row, header) ? row[header] : undefined;
  return typeof value === "string" ? value.trim() : "";
}
