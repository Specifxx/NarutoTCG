/**
 * PostgresMarketRepository against a real PostgreSQL server: schema, parity with the
 * in-memory seed repository, and write semantics. Needs TEST_DATABASE_URL (a scratch
 * database); each run works in its own throwaway schema and drops it afterwards.
 *
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/compare_test npx vitest run lib/market/__tests__/postgres.integration.test.ts
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, aggregateMarket, roundMoney } from "../analytics";
import { CARRY_FORWARD_MAX_DAYS } from "../constants";
import { createSql, type Sql } from "../db";
import type { FxRates } from "../fx";
import { processIngest } from "../ingest";
import { SORT_OPTIONS } from "../labels";
import { cardRow, loadDataset, MarketDataPresentError } from "../pg-dataset";
import { PostgresMarketRepository } from "../postgres-repository";
import { resolveCardRef } from "../resolve";
import { generateSeedDataset } from "../seed/dataset";
import { SeedMarketRepository } from "../seed-repository";
import type {
  CardMarketDetail,
  CardRef,
  ChangeWindow,
  MarketCard,
  MarketDataset,
  MarketQuery,
  NormalizedVendorSnapshot,
  VendorId,
} from "../types";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const MIGRATION_FILE = fileURLToPath(new URL("../../../supabase/migrations/0001_market_schema.sql", import.meta.url));

const NOW = new Date("2026-10-14T12:00:00Z");
const TODAY = "2026-10-14";
const FX: FxRates = { USD: 1, EUR: 1.16 };
const MARKET_TABLES = [
  "market_cards",
  "market_price_daily",
  "market_sets",
  "price_history",
  "vendor_listings",
  "vendor_quotes",
];

const silent = () => {};

/** Directory filters crossed with every sort key and several pages. */
const FILTERS: MarketQuery[] = [
  {},
  { sets: ["NTG01"] },
  { sets: ["NTG02", "NTPR"] },
  { sets: ["NOPE"] },
  { rarities: ["parallel", "secret-rare", "promo"] },
  { finishes: ["foil"] },
  { finishes: ["textured-foil", "non-foil"] },
  { q: "naruto" },
  { q: "  Uchiha   CROW " },
  { q: "naruto ntg03" },
  // LIKE wildcards must match literally: "p_0" would match "p-0" (ntpr-p-001) if `_` were a wildcard.
  { q: "p_0" },
  { q: "%" },
  { q: "100%" },
  { q: "p-0" },
  { sets: ["NTG01", "NTG03"], rarities: ["rare", "super-rare"], finishes: ["foil"], q: "uchiha" },
];

const PAGING: MarketQuery[] = [
  {},
  { page: 0 },
  { page: -3 },
  { page: Number.NaN },
  { page: 2.7, pageSize: 2.5 },
  { pageSize: 0 },
  { pageSize: 500 },
  { pageSize: 1, page: 64 },
  { pageSize: 1, page: 65 },
  { q: "zzz-no-match", page: 3 },
];

const REFS: CardRef[] = [
  { id: "NTG01-001" },
  { id: "  ntg04-026  " },
  { id: "missing" },
  { id: "missing", setCode: "NTG02", number: "18", finish: "textured-foil" },
  { setCode: "NTG01", number: "1" },
  { setCode: "ntg01", number: "001", finish: "foil" },
  { setCode: "NTG01", number: "001", finish: "foil", rarity: "parallel" },
  { setCode: "NTG01", number: "NTG01-001", finish: "non-foil" },
  { setCode: "NTG01", number: "NTG01 081" },
  { setCode: "NTPR", number: "p-1" },
  { setCode: " ntpr ", number: "#P-005" },
  { setCode: "NTPR", number: "NTPR-P-003" },
  { setCode: "NTG09", number: "1" },
  { setCode: "NTG03", number: "999" },
  { number: "1" },
  { number: "P-001" },
  { number: "NTG02-001", rarity: "parallel" },
  { name: "naruto uzumaki, KNUCKLEHEAD genin!!", finish: "non-foil" },
  { name: "Naruto Uzumaki — Knucklehead Genin" },
  { name: "Kunai" },
  { name: "Gaara" },
  { name: "!!!" },
  { name: "Jiraiya, Toad Sage", number: "018", rarity: "super-rare" },
  { name: "Itachi Uchiha: Crow Illusion", rarity: "parallel" },
  {},
];

describe.skipIf(!TEST_DATABASE_URL)("PostgresMarketRepository on PostgreSQL", { timeout: 60_000 }, () => {
  const schema = `compare_it_${Date.now().toString(36)}_${process.pid}`;
  let admin: Sql | undefined;
  let sql: Sql;
  let migration: string;
  let dataset: MarketDataset;
  let pg: PostgresMarketRepository;
  let seed: SeedMarketRepository;

  beforeAll(async () => {
    const url = TEST_DATABASE_URL ?? "";
    admin = createSql(url, { max: 1, onnotice: silent });
    await admin`create schema ${admin(schema)}`;
    sql = createSql(url, { max: 4, onnotice: silent, connection: { search_path: schema } });
    migration = await readFile(MIGRATION_FILE, "utf8");
    await sql.unsafe(migration);
    dataset = generateSeedDataset({ now: NOW, fx: FX });
    await loadDataset(sql, dataset, { replace: false });
    pg = new PostgresMarketRepository(sql);
    seed = new SeedMarketRepository({ now: () => NOW, fx: FX });
  }, 120_000);

  afterAll(async () => {
    await sql?.end();
    if (admin) {
      await admin`drop schema if exists ${admin(schema)} cascade`;
      await admin.end();
    }
  });

  async function tableCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const table of MARKET_TABLES) {
      const [row] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql(table)}`;
      counts[table] = row?.n ?? -1;
    }
    return counts;
  }

  /** Everything the migration defines in the test schema, for idempotency checks. */
  async function catalog() {
    const [relations, constraints, indexes, policies, view] = await Promise.all([
      sql`select relname, relkind, relrowsecurity from pg_class where relnamespace = ${schema}::regnamespace order by relname`,
      sql`select conrelid::regclass::text as rel, conname, pg_get_constraintdef(oid) as def
          from pg_constraint where connamespace = ${schema}::regnamespace order by 1, 2`,
      sql`select indexname, indexdef from pg_indexes where schemaname = ${schema} order by 1`,
      sql`select tablename, policyname from pg_policies where schemaname = ${schema} order by 1, 2`,
      sql`select pg_get_viewdef('card_market_summary'::regclass) as def`,
    ]);
    return { relations: [...relations], constraints: [...constraints], indexes: [...indexes], policies: [...policies], view: [...view] };
  }

  describe("schema", () => {
    it("loads the seed dataset into every table", async () => {
      expect(await tableCounts()).toEqual({
        market_cards: dataset.cards.length,
        market_price_daily: dataset.marketDaily.length,
        market_sets: dataset.sets.length,
        price_history: dataset.vendorHistory.length,
        vendor_listings: dataset.listings.length,
        vendor_quotes: dataset.quotes.length,
      });
    });

    it("re-applies the migration without changing schema or data, with RLS on every table", async () => {
      const before = await catalog();
      const counts = await tableCounts();
      await sql.unsafe(migration);
      expect(await catalog()).toEqual(before);
      expect(await tableCounts()).toEqual(counts);
      const tables = before.relations.filter((r) => r.relkind === "r");
      expect(tables.map((r) => r.relname).sort()).toEqual(MARKET_TABLES);
      expect(tables.every((r) => r.relrowsecurity === true)).toBe(true);
    });

    it("creates read-only policies when Supabase's API roles exist", async (ctx) => {
      if (!admin) throw new Error("admin connection missing");
      const [me] = await admin<{ can: boolean }[]>`select rolsuper or rolcreaterole as can from pg_roles where rolname = current_user`;
      const missing = (await admin<{ name: string }[]>`
        select name from unnest(array['anon', 'authenticated']) as name
        where not exists (select 1 from pg_roles where rolname = name)`).map((r) => r.name);
      if (missing.length > 0 && !me?.can) ctx.skip();
      // Roles (if missing) and a probe schema exist only inside this transaction, which is rolled back.
      const conn = await admin.reserve();
      try {
        await conn`begin`;
        for (const role of missing) await conn`create role ${conn(role)} nologin`;
        const probe = `${schema}_rls`;
        await conn`create schema ${conn(probe)}`;
        await conn`set local search_path to ${conn(probe)}`;
        await conn.unsafe(migration);
        await conn.unsafe(migration);
        const policies = await conn<{ tablename: string; cmd: string; roles: string[] }[]>`
          select tablename, cmd, roles::text[] as roles from pg_policies where schemaname = ${probe} order by tablename`;
        expect(policies.map((p) => p.tablename)).toEqual(MARKET_TABLES);
        for (const policy of policies) {
          expect(policy.cmd).toBe("SELECT");
          expect([...policy.roles].sort()).toEqual(["anon", "authenticated"]);
        }
        const [writes] = await conn<{ n: number }[]>`
          select count(*)::int as n from information_schema.role_table_grants
          where table_schema = ${probe} and grantee in ('anon', 'authenticated') and privilege_type <> 'SELECT'`;
        expect(writes?.n).toBe(0);
      } finally {
        await conn`rollback`;
        conn.release();
      }
    });
  });

  describe("parity with the seed repository", () => {
    it("lists sets and facets identically", async () => {
      expect(await pg.listSets()).toEqual(await seed.listSets());
      expect(await pg.getFacets()).toEqual(await seed.getFacets());
      expect(await pg.getStats()).toEqual(await seed.getStats());
    });

    it.each(SORT_OPTIONS.map((option) => option.value))("pages the directory identically, sorted by %s", async (sort) => {
      for (const filter of FILTERS) {
        for (const page of [1, 2, 999]) {
          const query: MarketQuery = { ...filter, sort, page, pageSize: 7 };
          expect(await pg.queryCards(query), JSON.stringify(query)).toEqual(await seed.queryCards(query));
        }
      }
    });

    it("clamps pages and page sizes identically", async () => {
      for (const query of PAGING) {
        expect(await pg.queryCards(query), JSON.stringify(query)).toEqual(await seed.queryCards(query));
      }
      expect((await pg.queryCards({ q: "p_0" })).total).toBe(0);
      expect((await pg.queryCards({ q: "p-0" })).total).toBeGreaterThan(0);
    });

    it.each(["7d", "30d", "90d"] satisfies ChangeWindow[])("ranks %s movers identically", async (window) => {
      for (const limit of [0, 5, 50, Number.POSITIVE_INFINITY]) {
        expect(await pg.getMovers(window, limit), `limit ${limit}`).toEqual(await seed.getMovers(window, limit));
      }
      const movers = await pg.getMovers(window, 50);
      expect(movers.gainers.length).toBeGreaterThan(0);
      expect(movers.losers.length).toBeGreaterThan(0);
    });

    it("returns identical detail for every card", async () => {
      for (const card of dataset.cards) {
        expect(await pg.getCardDetail(card.id), card.id).toEqual(await seed.getCardDetail(card.id));
      }
      for (const id of ["does-not-exist", "NTG01-001", ""]) {
        expect(await seed.getCardDetail(id)).toBeNull();
        expect(await pg.getCardDetail(id)).toBeNull();
      }
    });

    it("resolves card references identically", async () => {
      const statuses = new Set<string>();
      for (const ref of REFS) {
        const expected = await seed.resolveCard(ref);
        statuses.add(expected.status);
        expect(await pg.resolveCard(ref), JSON.stringify(ref)).toEqual(expected);
      }
      expect([...statuses].sort()).toEqual(["ambiguous", "matched", "not-found"]);
    });

    it("never narrows resolveCardRef's candidates for unusual ids, numbers and names", async () => {
      const base = { set: "Scroll of Beginnings", setCode: "NTG01", type: "character", rarity: "rare", finish: "non-foil" } as const;
      const extra: MarketCard[] = [
        { ...base, id: "NTG01-Upper", name: "Upper Case Id", character: "Upper Case Id", number: "777" },
        { ...base, id: "ntg01-Ü", name: "Hinata Hyūga, Byakugan Princess", character: "Hinata Hyuga", number: "0100" },
        { ...base, id: "ntg01-prefixed", name: "Prefixed Number", character: "Prefixed Number", number: "NTG01-099" },
        { ...base, id: "ntg01-runs", name: "Many Runs", character: "Many Runs", number: "A-12-003" },
        { ...base, id: "ntg01-long", name: "Long Number", character: "Long Number", number: "12345678901234567890" },
      ];
      await sql`insert into market_cards ${sql(extra.map(cardRow), "id", "name", "character", "set_code", "number", "type", "rarity", "finish")}`;
      try {
        const cards = [...dataset.cards, ...extra];
        const refs: CardRef[] = [
          { id: "ntg01-upper" },
          { id: "NTG01-ü" },
          { name: "hinata hyuga byakugan princess" },
          { setCode: "NTG01", number: "100" },
          { setCode: "NTG01", number: "99" },
          { setCode: "NTG01", number: "NTG01-099" },
          { number: "a-12-3" },
          { setCode: "NTG01", number: "12345678901234567890" },
          { setCode: "NTG01", number: "12345678901234567891" },
          { number: "777", name: "UPPER-CASE ID" },
        ];
        for (const ref of refs) {
          const expected = resolveCardRef(cards, ref);
          expect(expected.status, JSON.stringify(ref)).not.toBe("not-found");
          expect(await pg.resolveCard(ref), JSON.stringify(ref)).toEqual(expected);
        }
      } finally {
        await sql`delete from market_cards where id in ${sql(extra.map((card) => card.id))}`;
      }
    });
  });

  describe("writes", () => {
    const CARD = "ntg01-001";

    async function cardState(cardId: string) {
      const [quotes, listings, history, daily] = await Promise.all([
        sql`select * from vendor_quotes where card_id = ${cardId} order by vendor`,
        sql`select * from vendor_listings where card_id = ${cardId} order by id`,
        sql`select * from price_history where card_id = ${cardId} order by vendor, day`,
        sql`select * from market_price_daily where card_id = ${cardId} order by day`,
      ]);
      return { quotes: [...quotes], listings: [...listings], history: [...history], daily: [...daily] };
    }

    async function detail(cardId: string): Promise<CardMarketDetail> {
      const found = await pg.getCardDetail(cardId);
      if (!found) throw new Error(`card ${cardId} not found`);
      return found;
    }

    const vendorListings = (d: CardMarketDetail, vendor: VendorId) => d.listings.filter((l) => l.vendor === vendor);
    const point = (d: CardMarketDetail, day: string) => d.history.find((p) => p.date === day);

    const tcgToday: NormalizedVendorSnapshot = {
      cardId: CARD,
      vendor: "tcgplayer",
      currency: "USD",
      day: TODAY,
      capturedAt: "2026-10-14T11:00:00.000Z",
      native: { low: 4.1, mid: 5.25, high: 9.99, market: 5.5 },
      usd: { low: 4.1, mid: 5.25, high: 9.99, market: 5.5 },
      url: "https://www.tcgplayer.com/product/424242",
      listings: [
        { seller: "KonohaCards", condition: "NM", quantity: 2, currency: "USD", price: 4.1, shipping: 0, priceUsd: 4.1, shippingUsd: 0, totalUsd: 4.1, url: null },
        { seller: "MistHarbor", condition: "LP", quantity: 1, currency: "USD", price: 4.5, shipping: 1.25, priceUsd: 4.5, shippingUsd: 1.25, totalUsd: 5.75, url: "https://www.tcgplayer.com/product/424242?l=2" },
      ],
      listingsCount: 2,
    };

    const cardmarketBackfill: NormalizedVendorSnapshot = {
      cardId: CARD,
      vendor: "cardmarket",
      currency: "EUR",
      day: "2026-10-01",
      capturedAt: "2026-10-01T09:00:00.000Z",
      native: { low: 2.5, mid: 2.9, high: 3.4, market: 3 },
      usd: { low: 2.9, mid: 3.36, high: 3.94, market: 3.48 },
      url: null,
      listings: [
        { seller: "SandVillageVault", condition: "NM", quantity: 1, currency: "EUR", price: 2.5, shipping: 1.2, priceUsd: 2.9, shippingUsd: 1.39, totalUsd: 4.29, url: null },
      ],
      listingsCount: 1,
    };

    it("ingests today's snapshot: quote, listings, history, market price and summary", async () => {
      const before = await detail(CARD);
      const result = await pg.ingest([tcgToday]);
      expect(result).toEqual({ persisted: true, vendorQuotes: 1, listings: 2, historyPoints: 1, marketPoints: 1 });

      const after = await detail(CARD);
      expect(after.quotes.find((q) => q.vendor === "tcgplayer")).toEqual({
        cardId: CARD,
        vendor: "tcgplayer",
        currency: "USD",
        native: tcgToday.native,
        usd: tcgToday.usd,
        listingsCount: 2,
        url: tcgToday.url,
        updatedAt: tcgToday.capturedAt,
      });
      expect(vendorListings(after, "tcgplayer")).toEqual(
        (tcgToday.listings ?? []).map((listing, i) => ({
          ...listing,
          id: `${CARD}:tcgplayer:${i + 1}`,
          cardId: CARD,
          vendor: "tcgplayer",
          updatedAt: tcgToday.capturedAt,
        })),
      );
      expect(vendorListings(after, "ebay")).toEqual(vendorListings(before, "ebay"));

      const previous = point(before, TODAY);
      const expectedMarket = aggregateMarket([5.5, previous?.ebay, previous?.cardmarket]);
      expect(point(after, TODAY)).toEqual({ ...previous, tcgplayer: 5.5, market: expectedMarket });
      expect(after.summary.marketPrice).toBe(expectedMarket);
      expect(after.summary.lowestPrice).toBe(4.1);
      expect(after.summary.lowestVendor).toBe("tcgplayer");
      expect(after.summary.updatedAt).toBe(tcgToday.capturedAt);
      const from = before.summary.changes["7d"]?.from ?? Number.NaN;
      expect(after.summary.changes["7d"]).toEqual({
        from,
        to: expectedMarket,
        abs: roundMoney((expectedMarket ?? 0) - from),
        pct: (((expectedMarket ?? 0) - from) / from) * 100,
      });
    });

    it("files a backfill in history without replacing the current quote or listings", async () => {
      const before = await detail(CARD);
      const result = await pg.ingest([cardmarketBackfill]);
      expect(result).toEqual({ persisted: true, vendorQuotes: 0, listings: 0, historyPoints: 1, marketPoints: 1 });

      const after = await detail(CARD);
      expect(after.quotes).toEqual(before.quotes);
      expect(after.listings).toEqual(before.listings);
      const previous = point(before, "2026-10-01");
      expect(point(after, "2026-10-01")).toEqual({
        ...previous,
        cardmarket: 3.48,
        market: aggregateMarket([previous?.tcgplayer, previous?.ebay, 3.48]),
      });
      const [daily] = await sql<{ vendor_count: number }[]>`
        select vendor_count from market_price_daily where card_id = ${CARD} and day = '2026-10-01'`;
      expect(daily?.vendor_count).toBe(3);
    });

    it("is idempotent when the same snapshots arrive again", async () => {
      const before = await cardState(CARD);
      const result = await pg.ingest([cardmarketBackfill, tcgToday]);
      expect(result).toEqual({ persisted: true, vendorQuotes: 1, listings: 2, historyPoints: 2, marketPoints: 2 });
      expect(await cardState(CARD)).toEqual(before);
    });

    it("ignores an older capture of a day it already holds", async () => {
      const before = await cardState(CARD);
      const stale = { ...tcgToday, capturedAt: "2026-10-14T10:00:00.000Z", native: { ...tcgToday.native, market: 1 }, usd: { ...tcgToday.usd, market: 1 } };
      const result = await pg.ingest([stale]);
      expect(result).toEqual({ persisted: true, vendorQuotes: 0, listings: 0, historyPoints: 0, marketPoints: 0 });
      expect(await cardState(CARD)).toEqual(before);
    });

    it("keeps listings when a snapshot has none and clears them on an empty list", async () => {
      const before = await detail(CARD);
      await pg.ingest([{ ...tcgToday, capturedAt: "2026-10-14T11:30:00.000Z", listings: undefined, listingsCount: 9 }]);
      const kept = await detail(CARD);
      expect(vendorListings(kept, "tcgplayer")).toEqual(vendorListings(before, "tcgplayer"));
      expect(kept.quotes.find((q) => q.vendor === "tcgplayer")?.listingsCount).toBe(9);
      expect(kept.quotes.find((q) => q.vendor === "tcgplayer")?.updatedAt).toBe("2026-10-14T11:30:00.000Z");

      await pg.ingest([{ ...tcgToday, capturedAt: "2026-10-14T11:45:00.000Z", listings: [], listingsCount: 0 }]);
      const cleared = await detail(CARD);
      expect(vendorListings(cleared, "tcgplayer")).toEqual([]);
      expect(vendorListings(cleared, "ebay")).toEqual(vendorListings(before, "ebay"));
      expect(vendorListings(cleared, "cardmarket")).toEqual(vendorListings(before, "cardmarket"));
    });

    it("persists a scraped payload end to end through processIngest", async () => {
      const outcome = await processIngest(
        {
          source: "integration-test",
          capturedAt: "2026-10-14T11:50:00Z",
          items: [
            {
              card: { setCode: "NTG02", number: "18", finish: "Textured Foil" },
              vendor: "eBay",
              prices: { market: "$123.45" },
              listings: [{ seller: "SageModeSingles", condition: "Near Mint", price: "120.00", shipping: 0 }],
            },
            { card: { setCode: "NTG01", number: "1" }, vendor: "tcgplayer", prices: { market: 5 } },
          ],
        },
        { repo: pg, env: {}, now: () => NOW },
      );
      expect(outcome.status).toBe(200);
      expect(outcome.body).toMatchObject({
        ok: true,
        mode: "persisted",
        accepted: [{ index: 0, cardId: "ntg02-018-tf", vendor: "ebay" }],
        rejected: [{ index: 1 }],
        written: { vendorQuotes: 1, listings: 1, historyPoints: 1, marketPoints: 1 },
      });
      const quote = (await detail("ntg02-018-tf")).quotes.find((q) => q.vendor === "ebay");
      expect(quote).toMatchObject({ native: { low: 120, mid: 120, high: 120, market: 123.45 }, listingsCount: 1 });
    });

    it("rolls up a day: carries missing vendor rows forward once, recomputes the aggregate", async () => {
      // A past day: today's quotes were captured after it ended, so nothing is carried,
      // and recomputing the aggregate reproduces the generator's values.
      const yesterday = "2026-10-13";
      const priced = new Set(dataset.vendorHistory.filter((h) => h.day === yesterday).map((h) => h.cardId));
      expect(await pg.rollup(yesterday)).toEqual({
        persisted: true,
        day: yesterday,
        carriedForward: 0,
        marketPoints: priced.size,
      });
      const daily = await sql<{ card_id: string; market_usd: string | null; vendor_count: number }[]>`
        select card_id, market_usd, vendor_count from market_price_daily where day = ${yesterday} order by card_id collate "C"`;
      const expected = dataset.marketDaily
        .filter((row) => row.day === yesterday)
        .sort((a, b) => (a.cardId < b.cardId ? -1 : 1))
        .map((row) => ({ card_id: row.cardId, market_usd: row.marketUsd, vendor_count: row.vendorCount }));
      expect(daily.map((row) => ({ ...row, market_usd: row.market_usd === null ? null : Number(row.market_usd) }))).toEqual(expected);

      // Today: quotes without a history row (eBay days without a market price) are carried first.
      const [gaps] = await sql<{ n: number }[]>`
        select count(*)::int as n from vendor_quotes q
        where not exists (select 1 from price_history h where h.card_id = q.card_id and h.vendor = q.vendor and h.day = ${TODAY})`;
      const first = await pg.rollup(TODAY);
      expect(first.carriedForward).toBe(gaps?.n);
      expect(first.carriedForward).toBeGreaterThan(0);

      await sql`delete from price_history where card_id = 'ntg02-001' and vendor = 'cardmarket' and day = ${TODAY}`;
      const [pricedToday] = await sql<{ n: number }[]>`
        select count(distinct card_id)::int as n from price_history where day = ${TODAY}`;
      const second = await pg.rollup(TODAY);
      expect(second).toEqual({ persisted: true, day: TODAY, carriedForward: 1, marketPoints: pricedToday?.n });
      const [restored] = await sql<{ same: boolean }[]>`
        select (h.currency, h.low, h.mid, h.high, h.market, h.low_usd, h.mid_usd, h.high_usd, h.market_usd,
                h.listings_count, h.captured_at)
               is not distinct from
               (q.currency, q.low, q.mid, q.high, q.market, q.low_usd, q.mid_usd, q.high_usd, q.market_usd,
                q.listings_count, q.updated_at) as same
        from price_history h
        join vendor_quotes q on q.card_id = h.card_id and q.vendor = h.vendor
        where h.card_id = 'ntg02-001' and h.vendor = 'cardmarket' and h.day = ${TODAY}`;
      expect(restored?.same).toBe(true);

      expect((await pg.rollup(TODAY)).carriedForward).toBe(0);

      // A quote not refreshed within CARRY_FORWARD_MAX_DAYS is stale: the day gets a gap, not a flat line.
      const fresh = `${addDays(TODAY, -CARRY_FORWARD_MAX_DAYS)}T00:00:00.000Z`;
      const stale = `${addDays(TODAY, -CARRY_FORWARD_MAX_DAYS - 1)}T23:59:59.000Z`;
      await sql`delete from price_history where card_id = 'ntg02-001' and vendor in ('cardmarket', 'tcgplayer') and day = ${TODAY}`;
      await sql`update vendor_quotes set updated_at = ${stale}::timestamptz where card_id = 'ntg02-001' and vendor = 'cardmarket'`;
      await sql`update vendor_quotes set updated_at = ${fresh}::timestamptz where card_id = 'ntg02-001' and vendor = 'tcgplayer'`;
      expect((await pg.rollup(TODAY)).carriedForward).toBe(1);
      const [carried] = await sql<{ vendor: string }[]>`
        select vendor from price_history where card_id = 'ntg02-001' and vendor in ('cardmarket', 'tcgplayer') and day = ${TODAY}`;
      expect(carried?.vendor).toBe("tcgplayer");
    });

    it("refuses to load over existing data unless replacing, and replacing restores parity", async () => {
      await expect(loadDataset(sql, dataset, { replace: false })).rejects.toBeInstanceOf(MarketDataPresentError);
      expect(await loadDataset(sql, dataset, { replace: true })).toEqual({
        sets: dataset.sets.length,
        cards: dataset.cards.length,
        quotes: dataset.quotes.length,
        listings: dataset.listings.length,
        vendorHistory: dataset.vendorHistory.length,
        marketDaily: dataset.marketDaily.length,
      });
      expect(await pg.getCardDetail(CARD)).toEqual(await seed.getCardDetail(CARD));
      expect(await pg.queryCards({})).toEqual(await seed.queryCards({}));
    });
  });
});
