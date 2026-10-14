import { getSql } from "./db";
import { PostgresMarketRepository } from "./postgres-repository";
import { SeedMarketRepository } from "./seed-repository";
import type { MarketRepository } from "./types";

let repository: MarketRepository | undefined;

/**
 * The deployment's market data source: PostgreSQL / Supabase when DATABASE_URL is
 * set, otherwise the deterministic built-in demo catalog. Server-side only.
 */
export function getMarketRepository(): MarketRepository {
  repository ??= process.env.DATABASE_URL
    ? new PostgresMarketRepository(getSql())
    : new SeedMarketRepository();
  return repository;
}
