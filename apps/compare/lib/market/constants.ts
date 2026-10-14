import type { ChangeWindow } from "./types";

/** Longest range on the card page chart. */
export const HISTORY_DAYS = 90;
/** Daily points getCardDetail returns: HISTORY_DAYS plus the base day the 90-day change compares against. */
export const HISTORY_POINTS = HISTORY_DAYS + 1;
/** Days of aggregate prices behind each directory sparkline. */
export const SPARKLINE_DAYS = 30;
export const CHANGE_WINDOW_DAYS: Record<ChangeWindow, number> = { "7d": 7, "30d": 30, "90d": 90 };
export const CHANGE_WINDOWS: ChangeWindow[] = ["7d", "30d", "90d"];

/**
 * Rollup carries a vendor's current snapshot into a day's history only if it was captured
 * within this many days; an older quote is stale, so history shows a gap, not a flat line.
 */
export const CARRY_FORWARD_MAX_DAYS = 7;

/** Cards below this USD market price are excluded from gainers / losers (penny noise). */
export const MOVER_MIN_PRICE = 1;
export const MOVERS_LIMIT = 5;

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;
export const MAX_QUERY_LENGTH = 100;

/** Ingestion guard rails. */
export const MAX_INGEST_BODY_BYTES = 1_000_000;
export const MAX_INGEST_ITEMS = 500;
export const MAX_LISTINGS_PER_ITEM = 200;

/** Fallback EUR→USD rate when FX_EUR_USD is unset. Override per deployment or per payload. */
export const DEFAULT_EUR_USD = 1.16;
