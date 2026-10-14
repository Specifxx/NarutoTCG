import postgres from "postgres";

export type Sql = postgres.Sql;
export type TransactionSql = postgres.TransactionSql;
/** A composable SQL fragment (`sql\`...\`` nested inside another query). */
export type Fragment = postgres.Fragment;
export type SqlOptions = postgres.Options<{}>;

const DEFAULT_POOL_MAX = 5;

const store = globalThis as typeof globalThis & { __narutoCompareSql?: Sql };

const LOCAL_HOSTS = new Set(["", "localhost", "127.0.0.1", "[::1]"]);

/**
 * postgres.js connects in plaintext unless told otherwise, and Supabase's dashboard URLs
 * carry no sslmode. Require TLS for any non-local host; an explicit sslmode / ssl in the
 * URL (e.g. sslmode=disable for a trusted private network) still wins.
 */
export function defaultSsl(url: string): "require" | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.searchParams.has("sslmode") || parsed.searchParams.has("ssl")) return undefined;
  return LOCAL_HOSTS.has(parsed.hostname) ? undefined : "require";
}

/**
 * A postgres.js client. Prepared statements are off because Supabase's pooler
 * (Supavisor in transaction mode, port 6543) cannot keep named statements across
 * transactions.
 */
export function createSql(url: string, options: SqlOptions = {}): Sql {
  const ssl = defaultSsl(url);
  return postgres(url, { prepare: false, ...(ssl && { ssl }), ...options });
}

function poolMax(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_POOL_MAX;
  const max = Number(value);
  if (!Number.isInteger(max) || max < 1) {
    throw new Error(`DATABASE_POOL_MAX must be a positive integer, got "${value}"`);
  }
  return max;
}

/**
 * The app's shared connection pool, built from DATABASE_URL on first use. Kept on
 * globalThis so Next.js dev hot reloads reuse it instead of leaking connections.
 */
export function getSql(): Sql {
  if (!store.__narutoCompareSql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set: point it at PostgreSQL / Supabase (pooled connection string, port 6543).",
      );
    }
    store.__narutoCompareSql = createSql(url, {
      max: poolMax(process.env.DATABASE_POOL_MAX),
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return store.__narutoCompareSql;
}
