#!/usr/bin/env node
// Upsert scraped card records into public/data/cards.json.
//
//   pnpm --filter @naruto-tcg/cards merge:cards <incoming.json> [--dry-run]
//
// <incoming.json> holds an array of card objects (or { "cards": [...] }) in the
// DATA.md format. Existing cards are matched by `id`:
// - scraped values replace stored ones, but empty/missing values never wipe data
// - printings are unioned by setId + number + variant (an incoming imageUrl or
//   rarity correction is applied to the matching printing)
// - the earliest reveal is kept
// New cards are appended. Run `validate:data` afterwards; the merge itself only
// checks the shape it needs.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** @typedef {Record<string, unknown>} Json */

/** @param {unknown} value @returns {value is Json} */
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

/** @param {unknown} value */
const isEmpty = (value) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);

/** @param {Json} printing */
const printingId = (printing) => `${printing.setId}|${printing.number}|${printing.variant ?? "standard"}`;

/** @param {Json[]} current @param {Json[]} incoming */
function mergePrintings(current, incoming) {
  const merged = current.map((p) => ({ ...p }));
  for (const printing of incoming) {
    const match = merged.find((p) => printingId(p) === printingId(printing));
    if (!match) merged.push({ variant: "standard", ...printing });
    else for (const [key, value] of Object.entries(printing)) if (!isEmpty(value)) match[key] = value;
  }
  return merged;
}

/** @param {unknown} current @param {unknown} incoming */
function earlierReveal(current, incoming) {
  if (!isRecord(incoming) || isEmpty(incoming.date)) return current;
  if (!isRecord(current) || isEmpty(current.date)) return incoming;
  return String(incoming.date) < String(current.date) ? incoming : current;
}

/**
 * @param {Json[]} existing current cards.json contents
 * @param {unknown} incoming scraped records: an array or { cards: [...] }
 * @param {Json[]} sets sets.json contents, used for canonical ordering
 */
export function mergeCards(existing, incoming, sets) {
  const records = Array.isArray(incoming) ? incoming : isRecord(incoming) && Array.isArray(incoming.cards) ? incoming.cards : null;
  if (!records) throw new Error("Incoming data must be a JSON array of cards or { \"cards\": [...] }");

  const cards = existing.map((card) => ({ ...card }));
  const byId = new Map(cards.map((card) => [card.id, card]));
  /** @type {{ added: string[]; updated: string[]; unchanged: string[] }} */
  const report = { added: [], updated: [], unchanged: [] };

  records.forEach((record, i) => {
    if (!isRecord(record) || typeof record.id !== "string" || record.id.trim() === "") {
      throw new Error(`Incoming record ${i} has no string "id"`);
    }
    const id = record.id.trim();
    const current = byId.get(id);
    if (!current) {
      const card = { ...record, id };
      if (Array.isArray(card.printings)) card.printings = mergePrintings([], card.printings.filter(isRecord));
      cards.push(card);
      byId.set(id, card);
      report.added.push(id);
      return;
    }
    const before = JSON.stringify(current);
    for (const [key, value] of Object.entries(record)) {
      if (key === "id" || isEmpty(value)) continue;
      if (key === "printings" && Array.isArray(value)) {
        current.printings = mergePrintings(Array.isArray(current.printings) ? current.printings.filter(isRecord) : [], value.filter(isRecord));
      } else if (key === "reveal") {
        current.reveal = earlierReveal(current.reveal, value);
      } else {
        current[key] = value;
      }
    }
    (JSON.stringify(current) === before ? report.unchanged : report.updated).push(id);
  });

  // Canonical order: debut set release date, then natural collector number.
  const release = new Map(sets.filter(isRecord).map((set) => [set.id, String(set.releaseDate ?? "")]));
  /** @param {Json} card */
  const debut = (card) => {
    const printings = Array.isArray(card.printings) ? card.printings.filter(isRecord) : [];
    const dates = printings.map((p) => release.get(p.setId) ?? "9999-12-31").sort();
    return { date: dates[0] ?? "9999-12-31", number: String(printings[0]?.number ?? card.id) };
  };
  const natural = (/** @type {string} */ a, /** @type {string} */ b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
  cards.sort((a, b) => {
    const da = debut(a);
    const db = debut(b);
    return da.date.localeCompare(db.date) || natural(da.number, db.number) || natural(String(a.id), String(b.id));
  });

  return { cards, ...report };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error("Usage: merge-cards <incoming.json> [--dry-run]");
    process.exit(1);
  }
  const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data");
  const cardsPath = resolve(dataDir, "cards.json");
  // pnpm runs package scripts from the package dir; INIT_CWD is where the user ran it.
  const read = (/** @type {string} */ path) => JSON.parse(readFileSync(path, "utf8"));

  const { cards, added, updated, unchanged } = mergeCards(read(cardsPath), read(resolve(process.env.INIT_CWD ?? process.cwd(), file)), read(resolve(dataDir, "sets.json")));
  console.log(`added ${added.length}: ${added.join(", ") || "-"}`);
  console.log(`updated ${updated.length}: ${updated.join(", ") || "-"}`);
  console.log(`unchanged ${unchanged.length}`);
  if (dryRun) return console.log("Dry run: cards.json not written.");
  writeFileSync(cardsPath, `${JSON.stringify(cards, null, 2)}\n`);
  console.log(`Wrote ${cards.length} cards to ${cardsPath}. Next: pnpm --filter @naruto-tcg/cards validate:data`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
