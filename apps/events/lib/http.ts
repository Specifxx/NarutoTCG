/**
 * Request helpers shared by the zone's route handlers.
 */

/**
 * Client IP for rate limiting: the X-Forwarded-For entry appended by the nearest
 * trusted proxy (`TRUSTED_PROXY_HOPS` from the right, default 1), never the
 * client-controlled leftmost entry. A bare `next start` exposed directly to the
 * internet cannot make this trustworthy — run it behind a proxy that appends XFF.
 */
export function clientIp(headers: Headers): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[Math.max(0, chain.length - hops)] ?? "unknown";
}

/** Exact `application/json` media type (parameters such as charset allowed). */
export function isJsonRequest(request: Request): boolean {
  return request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() === "application/json";
}

/**
 * Read a body as UTF-8 text, or `null` when it exceeds `maxBytes` — whether
 * declared via Content-Length or discovered while streaming a chunked upload.
 */
export async function readBodyText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
