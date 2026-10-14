/**
 * Loads the deterministic demo market (lib/market/seed) into the database and marks it as
 * demo data, so the UI labels its simulated prices.
 * Usage: DATABASE_URL=... pnpm db:seed [-- --replace] [-- --catalog-only]
 * Without --replace it refuses to write into a database that already holds market data.
 * --catalog-only upserts just the demo sets and cards (no prices), like db:catalog.
 */
import { createSql } from "../lib/market/db";
import { getFxRates } from "../lib/market/fx";
import { loadCatalog, loadDataset, MarketDataPresentError } from "../lib/market/pg-dataset";
import { SEED_CARDS, SEED_SETS } from "../lib/market/seed/catalog";
import { generateSeedDataset } from "../lib/market/seed/dataset";

const USAGE = "Usage: DATABASE_URL=... tsx scripts/seed-database.ts [--replace] [--catalog-only]";

async function main(): Promise<void> {
  // pnpm may forward its own "--" separator.
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const unknown = args.filter((arg) => arg !== "--replace" && arg !== "--catalog-only");
  if (unknown.length > 0) throw new Error(`Unknown argument ${unknown.join(" ")}\n${USAGE}`);
  const replace = args.includes("--replace");
  const catalogOnly = args.includes("--catalog-only");

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(`DATABASE_URL is not set\n${USAGE}`);

  const sql = createSql(url, { max: 1, onnotice: () => {} });
  if (catalogOnly) {
    try {
      const counts = await loadCatalog(sql, { sets: SEED_SETS, cards: SEED_CARDS }, { replace });
      console.log(`Loaded the demo catalog: ${counts.sets} sets, ${counts.cards} cards (no prices).`);
    } finally {
      await sql.end();
    }
    return;
  }
  const now = new Date();
  const dataset = generateSeedDataset({ now, fx: getFxRates() });
  try {
    const started = Date.now();
    const counts = await loadDataset(sql, dataset, { replace });
    console.log(`Seeded the demo market as of ${now.toISOString()} in ${Date.now() - started} ms${replace ? " (replaced existing data)" : ""}:`);
    console.table(counts);
  } catch (error) {
    if (error instanceof MarketDataPresentError) {
      throw new Error(`${error.message}\nRe-run with --replace to wipe the market tables and reseed.`);
    }
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seeding failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
