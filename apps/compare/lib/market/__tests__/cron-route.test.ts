import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/prices/cron/route";
import { MAX_INGEST_BODY_BYTES } from "@/lib/market/constants";
import type { MarketRepository, NormalizedVendorSnapshot } from "@/lib/market/types";

const state = vi.hoisted(() => ({ repo: undefined as MarketRepository | undefined }));

vi.mock("@/lib/market/repository", () => ({
  getMarketRepository: () => {
    if (!state.repo) throw new Error("repository unavailable: postgres://admin:hunter2@db.internal:5432");
    return state.repo;
  },
}));

const SECRET = "route-test-secret";
const NOW = new Date("2026-10-14T12:00:00Z");
const ENDPOINT = "https://compare.example/api/prices/cron";

function fakeRepo() {
  const calls = { ingest: [] as NormalizedVendorSnapshot[][], rollup: [] as string[] };
  const unused = () => Promise.reject(new Error("not used by the cron route"));
  const repo: MarketRepository = {
    mode: "seed",
    listSets: unused,
    getStats: unused,
    listCardIds: unused,
    getFacets: unused,
    queryCards: unused,
    getMovers: unused,
    getCardDetail: unused,
    resolveCard: async (ref) =>
      ref.id === "ntg01-001" ? { status: "matched", cardId: "ntg01-001" } : { status: "not-found" },
    async ingest(snapshots) {
      calls.ingest.push(snapshots);
      return { persisted: false, vendorQuotes: snapshots.length, listings: 0, historyPoints: snapshots.length, marketPoints: 1 };
    },
    async rollup(day) {
      calls.rollup.push(day);
      return { persisted: false, day, carriedForward: 3, marketPoints: 1 };
    },
  };
  return { repo, calls };
}

const VALID_BODY = JSON.stringify({
  source: "route-test",
  capturedAt: "2026-10-14T11:58:00Z",
  items: [{ card: { id: "ntg01-001" }, vendor: "tcgplayer", prices: { market: 12.5 } }],
});

function post(body: BodyInit | null, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json", ...headers },
    body,
  });
}

function get(query = "", headers: Record<string, string> = { authorization: `Bearer ${SECRET}` }): Request {
  return new Request(`${ENDPOINT}${query}`, { headers });
}

let fake: ReturnType<typeof fakeRepo>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("CRON_SECRET", SECRET);
  fake = fakeRepo();
  state.repo = fake.repo;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function expectJson(response: Response, status: number, body: unknown) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual(body);
}

describe("POST /api/prices/cron", () => {
  it("ingests a valid payload", async () => {
    const response = await POST(post(VALID_BODY, { "content-type": "application/json; charset=utf-8" }));
    await expectJson(response, 200, {
      ok: true,
      mode: "dry-run",
      source: "route-test",
      received: 1,
      accepted: [{ index: 0, cardId: "ntg01-001", vendor: "tcgplayer" }],
      rejected: [],
      written: { vendorQuotes: 1, listings: 0, historyPoints: 1, marketPoints: 1 },
    });
    expect(fake.calls.ingest).toHaveLength(1);
  });

  it("passes validation failures through as 422", async () => {
    const response = await POST(post(JSON.stringify({ items: [] })));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ ok: false, error: "Invalid payload" });
  });

  it.each([
    ["no bearer token", {}],
    ["a wrong bearer token", { authorization: "Bearer not-the-secret" }],
  ])("rejects %s with 401", async (_label, auth) => {
    const request = new Request(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: VALID_BODY,
    });
    const response = await POST(request);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expectJson(response, 401, { ok: false, error: "Unauthorized" });
    expect(fake.calls.ingest).toHaveLength(0);
  });

  it("fails closed with 503 when CRON_SECRET is missing in production", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(post(VALID_BODY));
    expect(response.headers.get("www-authenticate")).toBeNull();
    await expectJson(response, 503, { ok: false, error: "CRON_SECRET is not configured" });
  });

  it("is open without CRON_SECRET outside production", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const response = await POST(post(VALID_BODY, { authorization: "" }));
    expect(response.status).toBe(200);
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", ""])("rejects content type %j with 415", async (type) => {
    const response = await POST(post(VALID_BODY, { "content-type": type }));
    await expectJson(response, 415, { ok: false, error: "Content-Type must be application/json" });
  });

  it("rejects a declared Content-Length over the limit with 413", async () => {
    const response = await POST(post(VALID_BODY, { "content-length": String(MAX_INGEST_BODY_BYTES + 1) }));
    await expectJson(response, 413, { ok: false, error: `Body exceeds ${MAX_INGEST_BODY_BYTES} bytes` });
    expect(fake.calls.ingest).toHaveLength(0);
  });

  it("measures the actual body in bytes, not characters, with 413", async () => {
    const body = JSON.stringify({ padding: "é".repeat(Math.ceil(MAX_INGEST_BODY_BYTES / 2) + 1) });
    expect(body.length).toBeLessThan(MAX_INGEST_BODY_BYTES);
    const response = await POST(post(body));
    await expectJson(response, 413, { ok: false, error: `Body exceeds ${MAX_INGEST_BODY_BYTES} bytes` });
  });

  it("accepts a body of exactly the limit", async () => {
    const body = VALID_BODY + " ".repeat(MAX_INGEST_BODY_BYTES - Buffer.byteLength(VALID_BODY));
    const response = await POST(post(body));
    expect(response.status).toBe(200);
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["an empty body", null],
    // `"\xff"` would parse as a JSON string if decoded leniently; invalid UTF-8 must be refused.
    ["invalid UTF-8", new Uint8Array([0x22, 0xff, 0x22])],
  ])("rejects %s with 400", async (_label, body) => {
    const response = await POST(post(body));
    await expectJson(response, 400, { ok: false, error: "Body is not valid JSON" });
  });

  it("returns 500 without leaking internals when the repository throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("insert failed: password=hunter2 host=db.internal");
    fake.repo.ingest = () => Promise.reject(failure);
    const response = await POST(post(VALID_BODY));
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({ ok: false, error: "Ingestion failed" });
    expect(text).not.toContain("hunter2");
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("returns 500 when the repository cannot be created", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.repo = undefined;
    const response = await POST(post(VALID_BODY));
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).not.toContain("hunter2");
  });
});

describe("GET /api/prices/cron (Vercel Cron rollup)", () => {
  it("rolls up today by default", async () => {
    const response = await GET(get());
    await expectJson(response, 200, {
      ok: true,
      mode: "dry-run",
      persisted: false,
      day: "2026-10-14",
      carriedForward: 3,
      marketPoints: 1,
    });
    expect(fake.calls.rollup).toEqual(["2026-10-14"]);
  });

  it("rolls up an explicit day", async () => {
    const response = await GET(get("?day=2026-10-01"));
    expect(response.status).toBe(200);
    expect(fake.calls.rollup).toEqual(["2026-10-01"]);
  });

  it("rejects an invalid day with 400", async () => {
    const response = await GET(get("?day=2026-10-15"));
    await expectJson(response, 400, {
      ok: false,
      error: "Invalid day",
      details: ["day must be a YYYY-MM-DD date on or before 2026-10-14"],
    });
    expect(fake.calls.rollup).toHaveLength(0);
  });

  it("requires the bearer secret", async () => {
    const response = await GET(get("", {}));
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expectJson(response, 401, { ok: false, error: "Unauthorized" });
    expect(fake.calls.rollup).toHaveLength(0);
  });

  it("returns 500 without leaking internals when the rollup throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fake.repo.rollup = () => Promise.reject(new Error("deadlock on market_price_daily"));
    const response = await GET(get());
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ ok: false, error: "Ingestion failed" });
    expect(text).not.toContain("deadlock");
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
