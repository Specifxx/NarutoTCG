import { cache } from "react";
import { getMarketRepository } from "@/lib/market/repository";
import type { MarketStats } from "@/lib/market/types";

/**
 * Catalog-wide stats, read at most once per request: the root layout (footer), the
 * directory header and the card page all ask. Async so that a repository that fails
 * to construct rejects like one that fails to query.
 */
export const getMarketStats = cache(async (): Promise<MarketStats> => getMarketRepository().getStats());
