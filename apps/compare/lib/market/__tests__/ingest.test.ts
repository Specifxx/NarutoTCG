import { describe, expect, it } from "vitest";
import { roundMoney } from "../analytics";
import { DEFAULT_EUR_USD, MAX_INGEST_ITEMS } from "../constants";
import { getFxRates } from "../fx";
import { normalizeItem, processIngest, processRollup, type IngestDeps, type IngestOutcome } from "../ingest";
import { IngestItemSchema, type IngestResponse } from "../ingest-schema";
import { resolveCardRef } from "../resolve";
import type {
  CardRef,
  CardResolution,
  MarketCard,
  MarketRepository,
  NormalizedVendorSnapshot,
  RepositoryMode,
} from "../types";

const NOW = new Date("2026-10-14T12:00:00Z");
const CAPTURED = "2026-10-14T11:55:00Z";
const MINUTE = 60_000;
const DAY = 86_400_000;

/** Mirrors the seed catalog's id scheme: `<set>-<number>` plus `-f` / `-p` for foil and parallel printings. */
function card(id: string, name: string, fields: Pick<MarketCard, "number" | "finish" | "rarity">): MarketCard {
  return { id, name, character: name.split(",")[0] ?? name, set: "Scroll of Beginnings", setCode: "NTG01", type: "character", ...fields };
}

const CARDS: MarketCard[] = [
  card("ntg01-001", "Naruto Uzumaki, Knucklehead Genin", { number: "001", finish: "non-foil", rarity: "rare" }),
  card("ntg01-001-f", "Naruto Uzumaki, Knucklehead Genin", { number: "001", finish: "foil", rarity: "rare" }),
  card("ntg01-001-p", "Naruto Uzumaki, Knucklehead Genin", { number: "001", finish: "foil", rarity: "parallel" }),
  card("ntg01-002", "Sasuke Uchiha, Last of the Clan", { number: "002", finish: "non-foil", rarity: "rare" }),
  card("ntg01-002-p", "Sasuke Uchiha, Last of the Clan", { number: "002", finish: "textured-foil", rarity: "parallel" }),
];

function fakeRepo(mode: RepositoryMode = "seed") {
  const calls = { ingest: [] as NormalizedVendorSnapshot[][], resolve: [] as CardRef[], rollup: [] as string[] };
  const unused = () => Promise.reject(new Error("not used by ingestion"));
  const repo: MarketRepository = {
    mode,
    listSets: unused,
    getStats: unused,
    getFacets: unused,
    queryCards: unused,
    getMovers: unused,
    getCardDetail: unused,
    async resolveCard(ref) {
      calls.resolve.push(ref);
      return resolveCardRef(CARDS, ref);
    },
    async ingest(snapshots) {
      calls.ingest.push(snapshots);
      return {
        persisted: mode === "postgres",
        vendorQuotes: snapshots.length,
        listings: snapshots.reduce((n, s) => n + (s.listings?.length ?? 0), 0),
        historyPoints: snapshots.length,
        marketPoints: new Set(snapshots.map((s) => `${s.cardId}/${s.day}`)).size,
      };
    },
    async rollup(day) {
      calls.rollup.push(day);
      return { persisted: mode === "postgres", day, carriedForward: 4, marketPoints: 2 };
    },
  };
  return { repo, calls };
}

function envelope(items: unknown[], extra: Record<string, unknown> = {}) {
  return { source: "test-suite", capturedAt: CAPTURED, items, ...extra };
}

/** A minimal valid TCGplayer item for the non-foil Naruto. */
function tcg(overrides: Record<string, unknown> = {}) {
  return { card: { id: "ntg01-001" }, vendor: "tcgplayer", prices: { market: 10 }, ...overrides };
}

async function ingest(body: unknown, options: { mode?: RepositoryMode; env?: IngestDeps["env"] } = {}) {
  const { repo, calls } = fakeRepo(options.mode);
  const outcome = await processIngest(body, { repo, env: options.env ?? {}, now: () => NOW });
  return { outcome, calls, response: asIngestResponse(outcome), snapshots: calls.ingest[0] ?? [] };
}

function asIngestResponse(outcome: IngestOutcome): IngestResponse {
  const { body } = outcome;
  if (!("mode" in body)) throw new Error(`expected an IngestResponse, got ${JSON.stringify(body)}`);
  return body;
}

/** The single snapshot written for item `index`, looked up through the response. */
function snapshotOf(result: Awaited<ReturnType<typeof ingest>>, index: number): NormalizedVendorSnapshot {
  const accepted = result.response.accepted.find((a) => a.index === index);
  const snapshot = result.snapshots.find((s) => s.cardId === accepted?.cardId && s.vendor === accepted?.vendor);
  if (!snapshot) throw new Error(`item ${index} was not written: ${JSON.stringify(result.response.rejected)}`);
  return snapshot;
}

function reasonFor(response: IngestResponse, index: number): string | undefined {
  return response.rejected.find((r) => r.index === index)?.reason;
}

const iso = (ms: number) => new Date(ms).toISOString();

describe("processIngest: envelope", () => {
  it.each([
    ["a non-object body", "not json"],
    ["a missing capturedAt", { items: [tcg()] }],
    ["an empty items array", envelope([])],
    ["too many items", envelope(Array.from({ length: MAX_INGEST_ITEMS + 1 }, () => tcg()))],
    ["a non-positive EUR rate", envelope([tcg()], { fxRates: { EUR: 0 } })],
    ["a capturedAt without offset", envelope([tcg()], { capturedAt: "2026-10-14T11:55:00" })],
  ])("rejects %s with 422 and never writes", async (_label, body) => {
    const { repo, calls } = fakeRepo();
    const outcome = await processIngest(body, { repo, env: {}, now: () => NOW });
    expect(outcome.status).toBe(422);
    expect(outcome.body).toMatchObject({ ok: false, error: "Invalid payload" });
    expect("details" in outcome.body && outcome.body.details?.length).toBeGreaterThan(0);
    expect(calls.resolve).toHaveLength(0);
    expect(calls.ingest).toHaveLength(0);
  });

  it("names the failing envelope fields", async () => {
    const { repo } = fakeRepo();
    const outcome = await processIngest({ source: "x", items: [] }, { repo, env: {}, now: () => NOW });
    expect(outcome.body).toMatchObject({ details: expect.arrayContaining([expect.stringMatching(/^capturedAt: /)]) });
    expect(outcome.body).toMatchObject({ details: expect.arrayContaining([expect.stringMatching(/^items: /)]) });
  });

  it("defaults source to 'unknown'", async () => {
    const { response } = await ingest({ capturedAt: CAPTURED, items: [tcg()] });
    expect(response.source).toBe("unknown");
  });
});

describe("processIngest: per-item validation", () => {
  it("rejects bad rows and still accepts the rest of the batch", async () => {
    const result = await ingest(
      envelope([
        tcg(),
        { card: {}, vendor: "amazon", prices: { market: 5 } },
        null,
        tcg({ vendor: "ebay", prices: { market: 11 } }),
        tcg({ prices: {} }),
      ]),
    );
    expect(result.outcome.status).toBe(200);
    expect(result.response.ok).toBe(true);
    expect(result.response.received).toBe(5);
    expect(result.response.accepted).toEqual([
      { index: 0, cardId: "ntg01-001", vendor: "tcgplayer" },
      { index: 3, cardId: "ntg01-001", vendor: "ebay" },
    ]);
    expect(result.response.rejected.map((r) => r.index)).toEqual([1, 2, 4]);
    expect(reasonFor(result.response, 1)).toMatch(/^card: card needs an id, a name, or a setCode \+ number; vendor: /);
    expect(reasonFor(result.response, 4)).toContain("at least one price of one cent or more");
    expect(result.calls.ingest).toHaveLength(1);
  });

  it("applies the schema's scraper-friendly coercions", async () => {
    const result = await ingest(
      envelope([
        {
          card: { setCode: "ntg01", number: "1", finish: "Foil", rarity: "Parallel" },
          vendor: " TCGplayer ",
          prices: { market: "$1,234.56", low: "1,000" },
          listings: [{ seller: "Hidden Leaf Games", condition: "Near Mint", price: "1,100.00", shipping: "$0.99" }],
        },
      ]),
    );
    expect(result.response.accepted).toEqual([{ index: 0, cardId: "ntg01-001-p", vendor: "tcgplayer" }]);
    const snapshot = snapshotOf(result, 0);
    expect(snapshot.native).toEqual({ low: 1000, mid: 1100, high: 1100, market: 1234.56 });
    expect(snapshot.listings).toEqual([
      expect.objectContaining({ condition: "NM", price: 1100, shipping: 0.99, totalUsd: 1100.99 }),
    ]);
  });

  it("reads Cardmarket's decimal-comma prices, digit-string counts and numeric collector numbers", async () => {
    const result = await ingest(
      envelope([
        {
          card: { setCode: "NTG01", number: 2, finish: "non-foil" },
          vendor: "cardmarket",
          prices: { low: "12,50 €", market: "1.234,5" },
          listingsCount: "37",
          listings: [{ seller: "Kiri Cards", price: "13,00", shipping: "1,20", quantity: "3" }],
        },
      ]),
    );
    expect(result.response.accepted).toEqual([{ index: 0, cardId: "ntg01-002", vendor: "cardmarket" }]);
    const snapshot = snapshotOf(result, 0);
    expect(snapshot.native).toMatchObject({ low: 12.5, market: 1234.5 });
    expect(snapshot.listingsCount).toBe(37);
    expect(snapshot.listings).toEqual([expect.objectContaining({ price: 13, shipping: 1.2, quantity: 3 })]);
  });

  it("keeps US thousands separators distinct from decimal commas", async () => {
    const result = await ingest(envelope([tcg({ prices: { market: "1,234" } }), tcg({ vendor: "ebay", prices: { market: "1,23" } })]));
    expect(snapshotOf(result, 0).native.market).toBe(1234);
    expect(snapshotOf(result, 1).native.market).toBe(1.23);
  });

  it("rejects ambiguous or malformed price text instead of guessing", async () => {
    const result = await ingest(envelope([tcg({ prices: { market: "12.345,6789" } }), tcg({ vendor: "ebay", prices: { market: "about 5" } })]));
    expect(result.response.rejected.map((r) => r.index)).toEqual([0, 1]);
  });
});

describe("processIngest: currency", () => {
  const cardmarket = { card: { id: "ntg01-002" }, vendor: "cardmarket", prices: { low: 10, mid: 12, high: 20, market: 11 } };

  it("converts Cardmarket EUR with the payload's fxRates, which beat FX_EUR_USD", async () => {
    const result = await ingest(envelope([cardmarket], { fxRates: { EUR: 1.2 } }), { env: { FX_EUR_USD: "1.1" } });
    const snapshot = snapshotOf(result, 0);
    expect(snapshot.currency).toBe("EUR");
    expect(snapshot.native).toEqual({ low: 10, mid: 12, high: 20, market: 11 });
    expect(snapshot.usd).toEqual({ low: 12, mid: 14.4, high: 24, market: 13.2 });
  });

  it("falls back to FX_EUR_USD, then to the default rate", async () => {
    const fromEnv = await ingest(envelope([cardmarket]), { env: { FX_EUR_USD: "1.1" } });
    expect(snapshotOf(fromEnv, 0).usd.market).toBe(12.1);
    const fallback = await ingest(envelope([cardmarket]));
    expect(snapshotOf(fallback, 0).usd.market).toBe(roundMoney(11 * DEFAULT_EUR_USD));
  });

  it("honours an explicit item currency", async () => {
    const usd = await ingest(envelope([{ ...cardmarket, currency: "usd" }], { fxRates: { EUR: 1.2 } }));
    expect(snapshotOf(usd, 0).currency).toBe("USD");
    expect(snapshotOf(usd, 0).usd).toEqual(snapshotOf(usd, 0).native);

    const ebayEur = await ingest(
      envelope(
        [{ card: { id: "ntg01-002" }, vendor: "ebay", currency: "EUR", listings: [{ seller: "s", price: 10, shipping: 2 }] }],
        { fxRates: { EUR: 1.2 } },
      ),
    );
    expect(snapshotOf(ebayEur, 0).listings).toEqual([
      expect.objectContaining({ currency: "EUR", price: 10, shipping: 2, priceUsd: 12, shippingUsd: 2.4, totalUsd: 14.4 }),
    ]);
  });
});

describe("processIngest: price stats", () => {
  const listings = [20, 5, 7].map((price) => ({ seller: `seller-${price}`, price }));

  it("fills missing low / mid / high from listing prices, excluding shipping", async () => {
    const result = await ingest(
      envelope([tcg({ prices: { market: 9 }, listings: listings.map((l) => ({ ...l, shipping: 50 })) })]),
    );
    expect(snapshotOf(result, 0).native).toEqual({ low: 5, mid: 7, high: 20, market: 9 });
  });

  it("prefers supplied values over listing-derived ones", async () => {
    const result = await ingest(envelope([tcg({ prices: { low: 4, high: 25 }, listings })]));
    expect(snapshotOf(result, 0).native).toEqual({ low: 4, mid: 7, high: 25, market: 7 });
  });

  it.each([
    ["market", { market: 9, mid: 8 }, undefined, 9],
    ["mid", { mid: 8 }, undefined, 8],
    ["supplied mid over listing mid", { mid: 8 }, listings, 8],
    ["listing-derived mid", undefined, listings, 7],
    ["nothing (low only)", { low: 5 }, undefined, null],
  ])("market falls back to %s", async (_label, prices, rows, expected) => {
    const result = await ingest(envelope([tcg({ prices, listings: rows })]));
    expect(snapshotOf(result, 0).native.market).toBe(expected);
  });

  it("treats zero and null as unknown and rounds to cents", async () => {
    const result = await ingest(envelope([tcg({ prices: { low: 0, mid: null, high: 7.499, market: 1.005 } })]));
    expect(snapshotOf(result, 0).native).toEqual({ low: null, mid: null, high: 7.5, market: 1.01 });
  });

  it("rejects low above high, including after filling from listings", async () => {
    const result = await ingest(
      envelope([tcg({ prices: { low: 10, high: 5 } }), tcg({ vendor: "ebay", prices: { low: 30, market: 25 }, listings })]),
    );
    expect(result.outcome.status).toBe(422);
    expect(result.response.rejected).toEqual([
      { index: 0, reason: "prices.low exceeds prices.high" },
      { index: 1, reason: "prices.low exceeds prices.high" },
    ]);
  });

  it("rejects prices that round to zero", async () => {
    const result = await ingest(
      envelope([tcg({ prices: { market: 0.004 } }), tcg({ vendor: "ebay", prices: undefined, listings: [{ price: 0.004 }] })]),
    );
    expect(result.response.rejected).toEqual([
      { index: 0, reason: "item needs at least one price of one cent or more in `prices`, or at least one listing" },
      { index: 1, reason: "listings.0.price: must be at least one cent" },
    ]);
  });
});

describe("processIngest: listings", () => {
  it("leaves stored listings untouched when omitted", async () => {
    const result = await ingest(envelope([tcg({ listingsCount: 12 })]));
    const snapshot = snapshotOf(result, 0);
    expect("listings" in snapshot).toBe(false);
    expect(snapshot.listingsCount).toBe(12);
  });

  it("clears stored listings with an empty array", async () => {
    const result = await ingest(envelope([tcg({ listings: [] })]));
    expect(snapshotOf(result, 0).listings).toEqual([]);
    expect(snapshotOf(result, 0).listingsCount).toBe(0);
  });

  it("prices listings in USD with shipping and sorts them cheapest delivered first", async () => {
    const result = await ingest(
      envelope([
        tcg({
          listings: [
            { seller: "Ichiraku", price: 10, shipping: 5, url: "https://example.com/a" },
            { seller: "Konoha", condition: "lp", quantity: 3, price: 12, shipping: 0 },
            { price: 11 },
          ],
        }),
      ]),
    );
    expect(snapshotOf(result, 0).listings).toEqual([
      {
        seller: "Unknown seller",
        condition: "NM",
        quantity: 1,
        currency: "USD",
        price: 11,
        shipping: null,
        priceUsd: 11,
        shippingUsd: null,
        totalUsd: 11,
        url: null,
      },
      {
        seller: "Konoha",
        condition: "LP",
        quantity: 3,
        currency: "USD",
        price: 12,
        shipping: 0,
        priceUsd: 12,
        shippingUsd: 0,
        totalUsd: 12,
        url: null,
      },
      {
        seller: "Ichiraku",
        condition: "NM",
        quantity: 1,
        currency: "USD",
        price: 10,
        shipping: 5,
        priceUsd: 10,
        shippingUsd: 5,
        totalUsd: 15,
        url: "https://example.com/a",
      },
    ]);
  });

  it.each([
    [3, 40, 40],
    [3, 1, 3],
    [3, undefined, 3],
    [undefined, undefined, 0],
  ])("with %s listings and listingsCount %s counts %s", async (rows, listingsCount, expected) => {
    const listings = rows === undefined ? undefined : Array.from({ length: rows }, (_, i) => ({ price: 5 + i }));
    const result = await ingest(envelope([tcg({ listings, listingsCount })]));
    expect(snapshotOf(result, 0).listingsCount).toBe(expected);
  });
});

describe("processIngest: card resolution", () => {
  it("reports unknown and ambiguous cards", async () => {
    const result = await ingest(
      envelope([
        tcg({ card: { setCode: "NTG09", number: "999" } }),
        tcg({ card: { setCode: "NTG01", number: "001", finish: "foil" } }),
        tcg({ card: { setCode: "NTG01", number: "001", finish: "foil", rarity: "parallel" } }),
      ]),
    );
    expect(result.response.rejected).toEqual([
      { index: 0, reason: "unknown card (setCode=NTG09, number=999)" },
      { index: 1, reason: "ambiguous card: matches ntg01-001-f, ntg01-001-p; add finish or rarity" },
    ]);
    expect(result.response.accepted).toEqual([{ index: 2, cardId: "ntg01-001-p", vendor: "tcgplayer" }]);
  });

  it("caps the candidates listed for a very ambiguous card", async () => {
    const { repo } = fakeRepo();
    const candidates = ["a", "b", "c", "d", "e", "f", "g"];
    repo.resolveCard = async (): Promise<CardResolution> => ({ status: "ambiguous", candidates });
    const outcome = await processIngest(envelope([tcg({ card: { name: "Naruto" } })]), { repo, env: {}, now: () => NOW });
    expect(asIngestResponse(outcome).rejected).toEqual([
      { index: 0, reason: "ambiguous card: matches a, b, c, d, e (+2 more); add finish or rarity" },
    ]);
  });

  it("asks the repository once per distinct card ref in a batch", async () => {
    const ref = { setCode: "NTG01", number: "002", finish: "non-foil" };
    const result = await ingest(
      envelope([
        tcg({ card: ref }),
        tcg({ card: { ...ref }, vendor: "ebay" }),
        tcg({ card: ref, vendor: "cardmarket" }),
        tcg({ card: { id: "ntg01-002" }, capturedAt: iso(NOW.getTime() - DAY) }),
      ]),
    );
    expect(result.calls.resolve).toEqual([ref, { id: "ntg01-002" }]);
    expect(result.response.accepted.map((a) => a.cardId)).toEqual(["ntg01-002", "ntg01-002", "ntg01-002", "ntg01-002"]);
  });
});

describe("processIngest: duplicates", () => {
  it("keeps the last snapshot per card, vendor and day", async () => {
    const result = await ingest(
      envelope([
        tcg({ prices: { market: 10 } }),
        tcg({ vendor: "ebay", prices: { market: 11 } }),
        tcg({ card: { setCode: "NTG01", number: "001", finish: "non-foil" }, prices: { market: 12 } }),
        tcg({ prices: { market: 13 } }),
      ]),
    );
    expect(result.response.accepted.map((a) => a.index)).toEqual([1, 3]);
    expect(result.response.rejected).toEqual([
      { index: 0, reason: "superseded by item 3" },
      { index: 2, reason: "superseded by item 3" },
    ]);
    expect(result.snapshots.find((s) => s.vendor === "tcgplayer")?.native.market).toBe(13);
  });

  it("keeps one snapshot per day and writes them oldest first", async () => {
    const yesterday = iso(NOW.getTime() - DAY);
    const result = await ingest(envelope([tcg({ prices: { market: 12 } }), tcg({ capturedAt: yesterday, prices: { market: 11 } })]));
    expect(result.response.accepted.map((a) => a.index)).toEqual([0, 1]);
    expect(result.snapshots.map((s) => [s.day, s.native.market])).toEqual([
      ["2026-10-13", 11],
      ["2026-10-14", 12],
    ]);
  });
});

describe("processIngest: capturedAt", () => {
  it.each([
    [9 * MINUTE, true],
    [11 * MINUTE, false],
    [-399 * DAY, true],
    [-401 * DAY, false],
  ])("capture offset %s ms accepted: %s", async (offset, accepted) => {
    const result = await ingest(envelope([tcg({ capturedAt: iso(NOW.getTime() + offset) })]));
    expect(result.response.accepted).toHaveLength(accepted ? 1 : 0);
  });

  it("explains future and stale captures", async () => {
    const future = iso(NOW.getTime() + 11 * MINUTE);
    const stale = iso(NOW.getTime() - 401 * DAY);
    const result = await ingest(envelope([tcg({ capturedAt: future }), tcg({ vendor: "ebay", capturedAt: stale })]));
    expect(result.response.rejected).toEqual([
      { index: 0, reason: `capturedAt ${future} is more than 10 minutes in the future` },
      { index: 1, reason: `capturedAt ${stale} is more than 400 days old` },
    ]);
  });

  it("applies the envelope's capturedAt to items without their own", async () => {
    const result = await ingest(envelope([tcg()], { capturedAt: iso(NOW.getTime() + 20 * MINUTE) }));
    expect(result.response.rejected[0]?.reason).toContain("in the future");
  });

  it("files snapshots under the UTC day and stores capturedAt in UTC", async () => {
    const result = await ingest(
      envelope([
        tcg({ capturedAt: "2026-10-13T23:30:00-02:00" }),
        tcg({ vendor: "ebay", capturedAt: "2026-10-14T00:30:00+02:00" }),
      ]),
    );
    expect(snapshotOf(result, 0)).toMatchObject({ day: "2026-10-14", capturedAt: "2026-10-14T01:30:00.000Z" });
    expect(snapshotOf(result, 1)).toMatchObject({ day: "2026-10-13", capturedAt: "2026-10-13T22:30:00.000Z" });
  });
});

describe("processIngest: write and response", () => {
  it.each([
    ["seed", "dry-run"],
    ["postgres", "persisted"],
  ] as const)("reports a %s repository write as %s", async (mode, expected) => {
    const result = await ingest(envelope([tcg({ listings: [{ price: 9 }, { price: 10 }] })]), { mode });
    expect(result.outcome.status).toBe(200);
    expect(result.response).toMatchObject({
      ok: true,
      mode: expected,
      written: { vendorQuotes: 1, listings: 2, historyPoints: 1, marketPoints: 1 },
    });
  });

  it.each([
    ["seed", "dry-run"],
    ["postgres", "persisted"],
  ] as const)("returns 422 without writing when nothing is accepted (%s)", async (mode, expected) => {
    const result = await ingest(envelope([tcg({ card: { id: "missing" } }), { vendor: "tcgplayer" }]), { mode });
    expect(result.outcome.status).toBe(422);
    expect(result.calls.ingest).toHaveLength(0);
    expect(result.response).toEqual({
      ok: false,
      mode: expected,
      source: "test-suite",
      received: 2,
      accepted: [],
      rejected: [
        { index: 0, reason: "unknown card (id=missing)" },
        { index: 1, reason: expect.stringContaining("card: ") },
      ],
      written: { vendorQuotes: 0, listings: 0, historyPoints: 0, marketPoints: 0 },
    });
  });

  it("lets repository failures propagate", async () => {
    const { repo } = fakeRepo();
    repo.ingest = () => Promise.reject(new Error("connection refused"));
    await expect(processIngest(envelope([tcg()]), { repo, env: {}, now: () => NOW })).rejects.toThrow("connection refused");

    const lookup = fakeRepo().repo;
    lookup.resolveCard = () => Promise.reject(new Error("lookup failed"));
    await expect(processIngest(envelope([tcg()]), { repo: lookup, env: {}, now: () => NOW })).rejects.toThrow("lookup failed");
  });

  it("accepts the documented example payload", async () => {
    const body = {
      source: "chrome-extension/1.0.0",
      capturedAt: "2026-10-14T11:55:00Z",
      fxRates: { EUR: 1.17 },
      items: [
        {
          card: { setCode: "NTG01", number: "NTG01-001", finish: "foil", rarity: "parallel" },
          vendor: "tcgplayer",
          url: "https://www.tcgplayer.com/product/512345/naruto-tcg-scroll-of-beginnings-naruto-uzumaki-knucklehead-genin-parallel",
          prices: { low: "$39.99", mid: 48.25, high: 89.99, market: 46.1 },
          listingsCount: 37,
          listings: [
            { seller: "Hidden Leaf Games", condition: "Near Mint", quantity: 2, price: "$41.50", shipping: 1.31, url: "https://www.tcgplayer.com/product/512345?seller=hidden-leaf" },
            { seller: "Akatsuki Cards", condition: "Lightly Played", quantity: 1, price: 39.99, shipping: "4.99" },
            { seller: "Konoha Collectibles", condition: "NM", quantity: 1, price: 44, shipping: 0 },
          ],
        },
        {
          card: { setCode: "NTG01", number: "002", finish: "non-foil" },
          vendor: "Cardmarket",
          capturedAt: "2026-10-14T13:40:00+02:00",
          url: "https://www.cardmarket.com/en/NarutoTCG/Products/Singles/Scroll-of-Beginnings/Sasuke-Uchiha-Last-of-the-Clan-V1",
          prices: { low: 52, mid: 58.4, high: 75, market: 56.9 },
          listingsCount: 18,
        },
      ],
    };
    const result = await ingest(body);
    expect(result.outcome.status).toBe(200);
    expect(result.response).toEqual({
      ok: true,
      mode: "dry-run",
      source: "chrome-extension/1.0.0",
      received: 2,
      accepted: [
        { index: 0, cardId: "ntg01-001-p", vendor: "tcgplayer" },
        { index: 1, cardId: "ntg01-002", vendor: "cardmarket" },
      ],
      rejected: [],
      written: { vendorQuotes: 2, listings: 3, historyPoints: 2, marketPoints: 2 },
    });
    expect(snapshotOf(result, 0)).toMatchObject({
      day: "2026-10-14",
      native: { low: 39.99, mid: 48.25, high: 89.99, market: 46.1 },
      listingsCount: 37,
    });
    expect(snapshotOf(result, 0).listings?.map((l) => [l.seller, l.condition, l.totalUsd])).toEqual([
      ["Hidden Leaf Games", "NM", 42.81],
      ["Konoha Collectibles", "NM", 44],
      ["Akatsuki Cards", "LP", 44.98],
    ]);
    expect(snapshotOf(result, 1)).toMatchObject({
      currency: "EUR",
      capturedAt: "2026-10-14T11:40:00.000Z",
      usd: { low: 60.84, mid: 68.33, high: 87.75, market: 66.57 },
      listingsCount: 18,
    });
    expect("listings" in snapshotOf(result, 1)).toBe(false);
  });
});

describe("normalizeItem", () => {
  it("normalizes a validated item without a card id", () => {
    const item = IngestItemSchema.parse({ card: { id: "x" }, vendor: "ebay", prices: { market: "12.50" }, url: null });
    const result = normalizeItem(item, { capturedAt: CAPTURED, fx: getFxRates({}), now: NOW });
    expect(result).toEqual({
      ok: true,
      snapshot: {
        vendor: "ebay",
        currency: "USD",
        day: "2026-10-14",
        capturedAt: "2026-10-14T11:55:00.000Z",
        native: { low: null, mid: null, high: null, market: 12.5 },
        usd: { low: null, mid: null, high: null, market: 12.5 },
        url: null,
        listingsCount: 0,
      },
    });
  });
});

describe("processRollup", () => {
  async function rollup(day: string | null, mode?: RepositoryMode) {
    const { repo, calls } = fakeRepo(mode);
    const outcome = await processRollup(day, { repo, now: () => NOW });
    return { outcome, calls };
  }

  it("defaults to today (UTC)", async () => {
    const { outcome, calls } = await rollup(null);
    expect(calls.rollup).toEqual(["2026-10-14"]);
    expect(outcome).toEqual({
      status: 200,
      body: { ok: true, mode: "dry-run", persisted: false, day: "2026-10-14", carriedForward: 4, marketPoints: 2 },
    });
  });

  it.each(["2026-10-01", "2026-10-14"])("rolls up an explicit day %s", async (day) => {
    const { outcome, calls } = await rollup(day, "postgres");
    expect(calls.rollup).toEqual([day]);
    expect(outcome.body).toMatchObject({ ok: true, mode: "persisted", day });
  });

  it.each(["2026-10-15", "2026-02-30", "yesterday", "", "2026-10-14T00:00:00Z"])("rejects day %j", async (day) => {
    const { outcome, calls } = await rollup(day);
    expect(outcome).toEqual({
      status: 400,
      body: { ok: false, error: "Invalid day", details: ["day must be a YYYY-MM-DD date on or before 2026-10-14"] },
    });
    expect(calls.rollup).toHaveLength(0);
  });
});
