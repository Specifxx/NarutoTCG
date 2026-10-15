/**
 * Tiny markup used in lesson and puzzle text:
 *   **bold**            strong text (may contain keywords)
 *   [[AMBUSH]]          keyword chip (term, id or alias)
 *   [[AMBUSH|ambushes]] keyword chip with custom label
 */
export type RichToken =
  | { type: "text"; text: string }
  | { type: "bold"; children: RichToken[] }
  | { type: "keyword"; query: string; label: string };

const KEYWORD = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function tokenizeKeywords(input: string): RichToken[] {
  const out: RichToken[] = [];
  let last = 0;
  for (const match of input.matchAll(KEYWORD)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: "text", text: input.slice(last, index) });
    const query = match[1]!.trim();
    out.push({ type: "keyword", query, label: (match[2] ?? match[1]!).trim() });
    last = index + match[0].length;
  }
  if (last < input.length) out.push({ type: "text", text: input.slice(last) });
  return out;
}

export function tokenize(input: string): RichToken[] {
  const out: RichToken[] = [];
  const parts = input.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push({ type: "bold", children: tokenizeKeywords(part.slice(2, -2)) });
    } else {
      out.push(...tokenizeKeywords(part));
    }
  }
  return out;
}

/** All keyword queries referenced in a piece of markup. */
export function keywordRefs(input: string): string[] {
  return [...input.matchAll(KEYWORD)].map((m) => m[1]!.trim());
}

/** Markup with keyword brackets and bold markers removed. */
export function plainText(input: string): string {
  return input.replace(KEYWORD, (_m, q: string, label?: string) => (label ?? q).trim()).replace(/\*\*/g, "");
}
