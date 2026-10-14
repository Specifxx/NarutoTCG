import { MAX_INGEST_BODY_BYTES } from "@/lib/market/constants";
import { authorizeCron, type CronAuthResult } from "@/lib/market/cron-auth";
import { processIngest, processRollup } from "@/lib/market/ingest";
import { getMarketRepository } from "@/lib/market/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function fail(status: number, error: string, headers?: Record<string, string>): Response {
  return json({ ok: false, error }, status, headers);
}

function unauthorized(auth: Extract<CronAuthResult, { ok: false }>): Response {
  return fail(auth.status, auth.error, auth.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined);
}

function serverError(error: unknown): Response {
  console.error("[api/prices/cron]", error);
  return fail(500, "Ingestion failed");
}

/** Reads the body but stops as soon as it exceeds `limit` bytes; null when it does. */
async function readBodyWithin(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

function parseJson(bytes: Uint8Array): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false };
  }
}

/** Price push from the browser-extension scraper or any other collector. */
export async function POST(request: Request): Promise<Response> {
  const auth = authorizeCron(request);
  if (!auth.ok) return unauthorized(auth);

  // Compare the media type itself: "text/plain;charset=application/json" is still a CORS-simple
  // text/plain request that a hostile page could send without a preflight.
  const mediaType = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return fail(415, "Content-Type must be application/json");
  }
  const tooLarge = `Body exceeds ${MAX_INGEST_BODY_BYTES} bytes`;
  if (Number(request.headers.get("content-length")) > MAX_INGEST_BODY_BYTES) return fail(413, tooLarge);

  try {
    const bytes = await readBodyWithin(request, MAX_INGEST_BODY_BYTES);
    if (!bytes) return fail(413, tooLarge);
    const body = parseJson(bytes);
    if (!body.ok) return fail(400, "Body is not valid JSON");
    const result = await processIngest(body.value, { repo: getMarketRepository() });
    return json(result.body, result.status);
  } catch (error) {
    return serverError(error);
  }
}

/** Vercel Cron entrypoint (GET with the bearer secret): daily rollup, `?day=YYYY-MM-DD` to backfill. */
export async function GET(request: Request): Promise<Response> {
  const auth = authorizeCron(request);
  if (!auth.ok) return unauthorized(auth);

  try {
    const day = new URL(request.url).searchParams.get("day");
    const result = await processRollup(day, { repo: getMarketRepository() });
    return json(result.body, result.status);
  } catch (error) {
    return serverError(error);
  }
}
