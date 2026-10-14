import Link from "next/link";
import { keywordAnchorId, type EffectToken, type TagTone } from "./effect-text";
import { cardSearchHref } from "./links";

const PILL =
  "mx-px inline-block rounded-[0.3rem] border px-1.5 py-px align-[0.08em] font-bold leading-[1.5] tracking-wide";

const TAG_TONE: Record<TagTone, string> = {
  timing: "border-chakra-500/50 bg-chakra-500/15 text-chakra-400",
  counter: "border-blood-500/70 bg-blood-500/20 text-rose-300",
  trigger: "border-lightning/50 bg-lightning/10 text-lightning",
  limit: "border-ash-400/40 bg-ash-400/10 text-ash-200",
  turn: "border-sky-400/45 bg-sky-400/10 text-sky-300",
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

function Token({ token }: { token: EffectToken }) {
  switch (token.kind) {
    case "text":
      return token.text;
    case "tag":
      return <span className={`${PILL} text-[0.72em] uppercase ${TAG_TONE[token.tone]}`}>{token.label}</span>;
    case "keyword": {
      const className = `${PILL} border-violet-400/50 bg-violet-400/10 text-[0.82em] text-violet-200`;
      if (token.reminder === undefined) return <span className={className}>{token.label}</span>;
      // Jump to the keyword's glossary entry, which is also its accessible description.
      const anchor = keywordAnchorId(token.label);
      return (
        <a
          href={`#${anchor}`}
          title={token.reminder}
          aria-describedby={`${anchor}-reminder`}
          className={`${className} transition hover:border-violet-300 hover:text-white ${FOCUS}`}
        >
          {token.label}
        </a>
      );
    }
    case "trait":
      return (
        <Link
          href={cardSearchHref(token.label)}
          className={`mx-px inline-block rounded-md border border-shadow-500 bg-shadow-800 px-1.5 align-[0.02em] text-[0.9em] font-medium leading-[1.45] text-ash-200 transition hover:border-chakra-400 hover:text-white ${FOCUS}`}
        >
          <span className="sr-only">Trait: </span>
          {token.label}
        </Link>
      );
    case "card":
      return (
        <Link
          href={cardSearchHref(token.name)}
          className={`rounded-sm font-semibold text-white underline decoration-chakra-500/70 decoration-1 underline-offset-[3px] transition hover:decoration-chakra-400 hover:decoration-2 ${FOCUS}`}
        >
          {token.name}
        </Link>
      );
  }
}

/** Rich rules text: timing tags and keywords as pills, traits as chips, card names as search links. */
export function EffectText({
  paragraphs,
  className = "",
}: {
  paragraphs: readonly (readonly EffectToken[])[];
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((tokens, p) => (
        <p key={p}>
          {tokens.map((token, i) => (
            <Token key={i} token={token} />
          ))}
        </p>
      ))}
    </div>
  );
}
