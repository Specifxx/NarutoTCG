import { MAX_QUERY_LENGTH } from "./constants";
import { DEFAULT_SORT, isFinish, isRarity, isSortKey } from "./labels";
import type { ChangeWindow, MarketQuery } from "./types";

/** Next.js `searchParams` shape. */
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Accepts repeated params (`?set=a&set=b`) and comma lists (`?set=a,b`). Dedupes, keeps order. */
export function readList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const out: string[] = [];
  for (const part of raw.flatMap((v) => v.split(","))) {
    const trimmed = part.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

function readOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse URL params into a validated query. Unknown enum values are dropped, never thrown. */
export function parseMarketQuery(params: SearchParamsRecord): MarketQuery {
  const q = readOne(params.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  const sort = readOne(params.sort);
  const page = Number.parseInt(readOne(params.page) ?? "", 10);
  return {
    q: q || undefined,
    sets: readList(params.set).map((s) => s.toUpperCase()).slice(0, 50),
    rarities: readList(params.rarity).filter(isRarity),
    finishes: readList(params.finish).filter(isFinish),
    sort: isSortKey(sort) ? sort : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function parseChangeWindow(value: string | string[] | undefined, fallback: ChangeWindow = "7d"): ChangeWindow {
  const v = readOne(value);
  return v === "7d" || v === "30d" || v === "90d" ? v : fallback;
}

/**
 * Serialize a query back to URL params, omitting defaults so URLs stay short.
 * Lists use comma form: `?set=NTG01,NTG02`.
 */
export function toSearchParams(query: MarketQuery, extra: Record<string, string | undefined> = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sets?.length) params.set("set", query.sets.join(","));
  if (query.rarities?.length) params.set("rarity", query.rarities.join(","));
  if (query.finishes?.length) params.set("finish", query.finishes.join(","));
  if (query.sort && query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  return params;
}

/** `/` plus the serialized query, e.g. `/?set=NTG01,NTG02&page=2` (commas kept readable; they are legal in a query). */
export function directoryHref(query: MarketQuery, extra?: Record<string, string | undefined>): string {
  const qs = toSearchParams(query, extra).toString().replace(/%2C/gi, ",");
  return qs ? `/?${qs}` : "/";
}

export function cardHref(cardId: string): string {
  return `/card/${encodeURIComponent(cardId)}`;
}
