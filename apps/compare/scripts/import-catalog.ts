/**
 * Upserts a card catalog (sets + printings) so ingestion can price those cards.
 * Usage: DATABASE_URL=... pnpm db:catalog path/to/catalog.json [-- --replace]
 * --replace empties every market table first (prices included) and clears the demo-data flag.
 */
import { readFile } from "node:fs/promises";
import { CatalogSchema, toCatalog } from "../lib/market/catalog-schema";
import { createSql } from "../lib/market/db";
import { describeZodError } from "../lib/market/ingest-schema";
import { loadCatalog } from "../lib/market/pg-dataset";

const USAGE = "Usage: DATABASE_URL=... tsx scripts/import-catalog.ts <catalog.json> [--replace]";

async function main(): Promise<void> {
  // pnpm may forward its own "--" separator.
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const replace = args.includes("--replace");
  const files = args.filter((arg) => arg !== "--replace");
  if (files.length !== 1 || files[0]!.startsWith("--")) throw new Error(USAGE);

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(`DATABASE_URL is not set\n${USAGE}`);

  const parsed = CatalogSchema.safeParse(JSON.parse(await readFile(files[0]!, "utf8")));
  if (!parsed.success) throw new Error(`Invalid catalog:\n  ${describeZodError(parsed.error).join("\n  ")}`);

  const sql = createSql(url, { max: 1, onnotice: () => {} });
  try {
    const counts = await loadCatalog(sql, toCatalog(parsed.data), { replace });
    console.log(`Imported ${counts.sets} sets and ${counts.cards} cards${replace ? " (market data replaced)" : ""}.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Catalog import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
