import type { CardReveal } from "@naruto-tcg/types";
import { formatDate } from "@/lib/meta";

/** "Revealed <date>" spoiler badge with an external link to the reveal source. */
export function RevealBadge({ reveal }: { reveal: CardReveal }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="inline-flex items-center gap-2 rounded-full border border-blood-500/70 bg-blood-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-200">
        <span aria-hidden="true" className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
        </span>
        <span>
          Revealed <time dateTime={reveal.date}>{formatDate(reveal.date)}</time>
        </span>
      </span>
      <a
        href={reveal.url}
        target="_blank"
        rel="noopener noreferrer"
        title={reveal.source}
        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm text-ash-400 underline decoration-shadow-500 underline-offset-4 transition hover:text-white hover:decoration-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
      >
        {/* Scraped sources can be long unbroken URLs or handles; truncate rather than widen the page. */}
        <span className="truncate">via {reveal.source}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0">
          <path
            d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M11 4h5v5M16 4l-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}
