import type { NarutoCard } from "@naruto-tcg/types";
import { platformHref } from "@naruto-tcg/ui";
import Link from "next/link";
import { CardImage } from "@/components/CardImage";
import { ElementIcon } from "@/components/ElementIcon";
import { TYPE_META, cardHref, formatDate } from "@/lib/meta";
import type { DecklistGroup, RelatedDeck } from "./queries";
import { SectionHeading } from "./SectionHeading";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.16em] text-ash-400";

function usageLabel(related: RelatedDeck): string {
  const parts: string[] = [];
  if (related.asLeader) parts.push("Deck leader");
  if (related.quantity > 0) parts.push(`×${related.quantity} in main deck`);
  return parts.join(" · ");
}

function Decklist({ groups, currentId }: { groups: readonly DecklistGroup[]; currentId: string }) {
  return (
    <div className="mt-3 space-y-4">
      {groups.map((group) => (
        <div key={group.type}>
          <h4 className="flex items-baseline justify-between border-b border-shadow-700 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ash-400">
            <span>{group.type === "unknown" ? "Other" : TYPE_META[group.type].plural}</span>
            <span className="tabular-nums">{group.count}</span>
          </h4>
          <ul className="mt-1.5 space-y-0.5">
            {group.lines.map((line) => {
              const isCurrent = line.cardId === currentId;
              const name = line.card?.name ?? line.cardId;
              return (
                <li
                  key={line.cardId}
                  className={`flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm ${isCurrent ? "bg-chakra-500/10 ring-1 ring-chakra-500/40" : ""}`}
                >
                  <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-ash-400">
                    ×{line.quantity}
                  </span>
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-chakra-500/40 bg-chakra-500/10 text-[11px] font-bold tabular-nums text-chakra-400"
                    title={line.card?.cost === undefined ? "No cost" : `Cost ${line.card.cost}`}
                  >
                    <span aria-hidden="true">{line.card?.cost ?? "–"}</span>
                    <span className="sr-only">
                      {line.card?.cost === undefined ? "no cost" : `cost ${line.card.cost}`}
                    </span>
                  </span>
                  {line.card && <ElementIcon element={line.card.element} className="h-3.5 w-3.5 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">
                    {isCurrent || !line.card ? (
                      <span className={isCurrent ? "font-semibold text-white" : "text-ash-200"}>
                        {name}
                        {isCurrent && <span className="ml-1.5 text-xs font-normal text-chakra-400">(this card)</span>}
                      </span>
                    ) : (
                      <Link
                        href={cardHref(line.card.id)}
                        className={`rounded-sm text-ash-200 transition hover:text-white hover:underline hover:underline-offset-4 ${FOCUS}`}
                      >
                        {name}
                        {line.card.title && <span className="text-ash-400"> · {line.card.title}</span>}
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DeckCard({ related, currentId }: { related: RelatedDeck; currentId: string }) {
  const { deck, leader } = related;
  const headingId = `deck-${deck.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col rounded-2xl border border-shadow-700 bg-gradient-to-b from-shadow-800/70 to-shadow-900/80 p-4 shadow-lg shadow-black/30 sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="aspect-[63/88] w-14 shrink-0 overflow-hidden rounded-[4.6%/3.3%] bg-shadow-800 text-[0px] shadow-md shadow-black/50 sm:w-16"
        >
          {leader ? (
            <CardImage card={leader} />
          ) : (
            <div className="h-full w-full rounded-[inherit] border border-dashed border-shadow-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-base font-bold leading-snug text-white sm:text-lg">
            {deck.name}
          </h3>
          {deck.archetype && <p className="mt-0.5 text-sm font-medium text-chakra-400">{deck.archetype}</p>}
          {deck.owner && <p className="mt-0.5 truncate text-xs text-ash-400">by {deck.owner}</p>}
          <p className="mt-2 inline-flex items-center rounded-full border border-chakra-500/50 bg-chakra-500/10 px-2.5 py-0.5 text-xs font-bold text-chakra-400">
            {usageLabel(related)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-shadow-700/80 pt-3 text-sm">
        <div className="col-span-3 min-w-0 sm:col-span-1">
          <dt className={META_LABEL}>Leader</dt>
          <dd className="mt-0.5 truncate">
            {leader ? (
              leader.id === currentId ? (
                <span className="font-medium text-white">{leader.name}</span>
              ) : (
                <Link
                  href={cardHref(leader.id)}
                  className={`rounded-sm font-medium text-white hover:underline hover:underline-offset-4 ${FOCUS}`}
                >
                  {leader.name}
                </Link>
              )
            ) : (
              <span className="text-ash-400">None</span>
            )}
          </dd>
        </div>
        <div className="col-span-1 min-w-0">
          <dt className={META_LABEL}>Cards</dt>
          <dd className="mt-0.5 tabular-nums text-ash-200">
            {related.mainCount}
            {deck.leaderId && <span className="text-ash-400"> + leader</span>}
          </dd>
        </div>
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <dt className={META_LABEL}>Updated</dt>
          <dd className="mt-0.5 text-ash-200">
            <time dateTime={deck.updatedAt}>{formatDate(deck.updatedAt)}</time>
          </dd>
        </div>
      </dl>

      {deck.description && <p className="mt-3 line-clamp-2 text-sm text-ash-400">{deck.description}</p>}

      <details className="group mt-4 border-t border-shadow-700/80 pt-3">
        <summary
          className={`flex cursor-pointer list-none items-center justify-between gap-2 rounded-md py-1 text-sm font-semibold text-ash-200 transition hover:text-white [&::-webkit-details-marker]:hidden ${FOCUS}`}
        >
          <span>
            <span className="group-open:hidden">Show</span>
            <span className="hidden group-open:inline">Hide</span> full decklist
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 text-ash-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <Decklist groups={related.groups} currentId={currentId} />
      </details>
    </article>
  );
}

/** Decklists that include the card, with an expandable full list for each. */
export function RelatedDecks({
  card,
  decks,
  total,
}: {
  card: NarutoCard;
  decks: readonly RelatedDeck[];
  total: number;
}) {
  const hidden = Math.max(0, total - decks.length);
  const decksAppHref = platformHref("decks");
  return (
    <section aria-labelledby="decks-heading" className="scroll-mt-4">
      <SectionHeading id="decks-heading" eyebrow="In the meta" title="Related decks">
        {total > 0 && (
          <p className="text-sm text-ash-400">
            Used in <span className="font-semibold text-ash-200">{total}</span> {total === 1 ? "decklist" : "decklists"}
          </p>
        )}
      </SectionHeading>

      {decks.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-shadow-500 bg-shadow-900/40 px-6 py-10 text-center">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 text-shadow-500">
            <path
              d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h6M9 12h6M9 16h3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <p className="font-semibold text-ash-200">No decklists use {card.name} yet</p>
          <p className="max-w-sm text-sm text-ash-400">Be the first to build around this card in the deck builder.</p>
          <a
            href={decksAppHref}
            className={`mt-1 rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400 ${FOCUS} focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950`}
          >
            Open the deck builder
          </a>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {decks.map((related) => (
              <li key={related.deck.id} className="min-w-0">
                <DeckCard related={related} currentId={card.id} />
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <p className="mt-4 text-sm text-ash-400">
              And {hidden} more {hidden === 1 ? "deck uses" : "decks use"} this card.{" "}
              <a
                href={decksAppHref}
                className={`rounded-sm font-semibold text-chakra-400 hover:underline hover:underline-offset-4 ${FOCUS}`}
              >
                Browse all decks
              </a>
            </p>
          )}
        </>
      )}
    </section>
  );
}
