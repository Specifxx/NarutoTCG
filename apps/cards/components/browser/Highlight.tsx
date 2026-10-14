import { highlightSegments } from "@/lib/search";

/** Renders `text` with query matches wrapped in <mark>, as React text nodes only. */
export function Highlight({ text, tokens }: { text: string; tokens: readonly string[] }) {
  if (tokens.length === 0) return text;
  return highlightSegments(text, tokens).map((segment, i) =>
    segment.match ? (
      <mark key={i} className="rounded-[3px] bg-chakra-500/30 px-px text-white [box-decoration-break:clone]">
        {segment.text}
      </mark>
    ) : (
      <span key={i}>{segment.text}</span>
    ),
  );
}
