import type { CardSet, NarutoCard } from "@naruto-tcg/types";
import Link from "next/link";
import { CardImage } from "@/components/CardImage";
import { ElementBadge, RarityBadge, TypeBadge } from "@/components/badges";
import { ExternalLinkIcon, EyeIcon } from "@/components/home/icons";
import { cardHref, cardRarities, primaryPrinting } from "@/lib/meta";
import { formatMonthDay } from "./reveals";
import styles from "./spoilers.module.css";

export function RevealedBadge({ date, className = "" }: { date: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-chakra-500/40 bg-chakra-500/10 px-2 py-0.5 text-[11px] font-semibold text-chakra-400 ${className}`}
    >
      <EyeIcon className="h-3 w-3" />
      Revealed <time dateTime={date}>{formatMonthDay(date)}</time>
    </span>
  );
}

export function NewBadge({ className = "" }: { className?: string }) {
  return <span className={`${styles.newBadge} ${className}`}>New</span>;
}

/** External link to where a card was revealed. Sits above any stretched card link. */
export function RevealSourceLink({ url, source, className = "" }: { url: string; source: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`relative z-10 inline-flex max-w-full items-center gap-1.5 rounded-sm text-xs font-medium text-ash-400 underline decoration-shadow-500 underline-offset-4 transition hover:text-chakra-400 hover:decoration-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 ${className}`}
    >
      <span className="truncate">
        <span className="text-ash-400/80">via </span>
        {source}
      </span>
      <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="sr-only">(opens in new tab)</span>
    </a>
  );
}

/** One revealed card in the spoiler feed. The whole tile links to the card page. */
export function RevealCard({
  card,
  set,
  isNew,
  priority = false,
}: {
  card: NarutoCard;
  set: CardSet | undefined;
  isNew: boolean;
  priority?: boolean;
}) {
  const printing = primaryPrinting(card);
  const reveal = card.reveal;
  const nameId = `reveal-card-${card.id}`;
  return (
    <article
      aria-labelledby={nameId}
      className="group relative flex h-full flex-col rounded-xl border border-shadow-700 bg-gradient-to-b from-shadow-800/90 to-shadow-900 p-2.5 shadow-lg shadow-black/30 transition duration-200 hover:border-chakra-500/50 hover:shadow-chakra-500/10 focus-within:border-chakra-500/50 sm:p-3"
    >
      <div className="relative">
        <CardImage
          card={card}
          printing={printing}
          priority={priority}
          className="shadow-md shadow-black/50 transition duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:shadow-xl motion-safe:group-hover:shadow-chakra-500/10"
        />
      </div>
      {/* Pinned to the tile's corner so it never covers the printed cost. */}
      {isNew && <NewBadge className="pointer-events-none absolute -top-2 right-3 z-10" />}

      {reveal && <RevealedBadge date={reveal.date} className="mt-3 self-start" />}

      <h3 id={nameId} className="mt-2 text-sm font-bold leading-snug text-white sm:text-[0.95rem]">
        <Link
          href={cardHref(card.id)}
          className="rounded-sm transition after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:text-chakra-400 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-chakra-400"
        >
          {card.name}
        </Link>
      </h3>
      {card.title && <p className="mt-0.5 line-clamp-2 text-xs text-ash-400">{card.title}</p>}
      <p className="mt-1.5 truncate font-mono text-[11px] text-ash-400">
        {printing.number}
        <span aria-hidden="true"> · </span>
        <span className="sr-only">, </span>
        {set?.shortName ?? printing.setId}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        <TypeBadge type={card.type} className="text-[10px]!" />
        <ElementBadge element={card.element} className="text-[10px]!" />
        {cardRarities(card).map((rarity) => (
          <RarityBadge key={rarity} rarity={rarity} compact className="text-[10px]!" />
        ))}
      </div>

      {reveal && (
        <div className="mt-auto pt-3">
          <RevealSourceLink url={reveal.url} source={reveal.source} />
        </div>
      )}
    </article>
  );
}
