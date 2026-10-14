import type { Deck } from "@naruto-tcg/types";
import { emptyDeck } from "./deck";

const PREFIX = "NTCG1.";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Compact, copy-pasteable deck code. */
export function encodeDeck(deck: Deck): string {
  const payload = { n: deck.name, c: deck.cards.map((e) => [e.cardId, e.quantity]) };
  return PREFIX + toBase64Url(JSON.stringify(payload));
}

export function decodeDeck(code: string): Deck {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) throw new Error(`Deck codes start with "${PREFIX}".`);
  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length)));
  } catch {
    throw new Error("That deck code is corrupted.");
  }
  const p = payload as { n?: unknown; c?: unknown };
  if (typeof p.n !== "string" || !Array.isArray(p.c)) throw new Error("That deck code is missing its card list.");
  const cards = p.c.flatMap((row) => {
    if (!Array.isArray(row) || typeof row[0] !== "string" || typeof row[1] !== "number") return [];
    const quantity = Math.max(0, Math.min(99, Math.floor(row[1])));
    return quantity > 0 ? [{ cardId: row[0], quantity }] : [];
  });
  return { ...emptyDeck(p.n.slice(0, 80) || "Imported Deck"), cards };
}
