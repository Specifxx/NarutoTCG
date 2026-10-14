import type { NarutoCard } from "@naruto-tcg/types";
import Link from "next/link";
import { CardImage } from "@/components/CardImage";
import { TYPE_META, cardHref, primaryPrinting } from "@/lib/meta";
import { cardSearchHref } from "./links";
import { SectionHeading } from "./SectionHeading";

const MAX_SHOWN = 12;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

/** Other cards that share this card's name, as small linked thumbnails. */
export function OtherVersions({ card, versions }: { card: NarutoCard; versions: readonly NarutoCard[] }) {
  if (versions.length === 0) return null;
  const shown = versions.slice(0, MAX_SHOWN);
  return (
    <section aria-labelledby="versions-heading" className="scroll-mt-4">
      <SectionHeading id="versions-heading" eyebrow="Same shinobi" title="Other versions">
        <p className="text-sm text-ash-400">
          {versions.length} other {versions.length === 1 ? "card" : "cards"} named {card.name}
        </p>
      </SectionHeading>
      <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 xl:grid-cols-8">
        {shown.map((version) => (
          <li key={version.id} className="min-w-0">
            <Link
              href={cardHref(version.id)}
              className={`group block rounded-lg ${FOCUS} focus-visible:ring-offset-4 focus-visible:ring-offset-shadow-950`}
            >
              <div
                aria-hidden="true"
                className="aspect-[63/88] overflow-hidden rounded-[4.6%/3.3%] bg-shadow-800 text-[0px] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_24px_-8px_rgba(0,0,0,0.8)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
              >
                <CardImage card={version} />
              </div>
              <span className="mt-2 block truncate text-xs font-semibold text-ash-200 group-hover:text-white">
                <span className="sr-only">{version.name}, </span>
                {version.title ?? version.name}
              </span>
              <span className="block truncate text-[11px] text-ash-400">
                <span className="font-mono">{primaryPrinting(version).number}</span> · {TYPE_META[version.type].label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {versions.length > MAX_SHOWN && (
        <p className="mt-4 text-sm">
          <Link
            href={cardSearchHref(card.name)}
            className={`rounded-sm font-semibold text-chakra-400 hover:underline hover:underline-offset-4 ${FOCUS}`}
          >
            See all {versions.length + 1} cards named {card.name}
          </Link>
        </p>
      )}
    </section>
  );
}
