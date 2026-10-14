/**
 * Applies supabase/migrations/*.sql in filename order, each once, each in its own
 * transaction, and records them in schema_migrations. Usage: DATABASE_URL=... pnpm db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSql } from "../lib/market/db";

const MIGRATIONS_DIR = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
  const sql = createSql(url, { max: 1, onnotice: () => {} });
  try {
    await sql`
      create table if not exists schema_migrations (
        version    text primary key,
        applied_at timestamptz not null default now()
      )`;
    // Supabase exposes tables in public to its API roles; RLS without policies hides this one.
    await sql`alter table schema_migrations enable row level security`;

    const applied: string[] = [];
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      const text = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const ran = await sql.begin(async (tx) => {
        // Concurrent runs queue here; whoever comes second sees the version recorded and skips it.
        await tx`select pg_advisory_xact_lock(hashtext('naruto-tcg/compare:migrations'))`;
        const [done] = await tx`select 1 from schema_migrations where version = ${version}`;
        if (done) return false;
        // No parameters: postgres.js uses the simple query protocol, so multi-statement files work.
        await tx.unsafe(text);
        await tx`insert into schema_migrations (version) values (${version})`;
        return true;
      });
      if (ran) {
        applied.push(file);
        console.log(`applied ${file}`);
      }
    }
    console.log(
      applied.length === 0
        ? `Database is up to date (${files.length} migration${files.length === 1 ? "" : "s"}).`
        : `Applied ${applied.length} of ${files.length} migration${files.length === 1 ? "" : "s"}.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
