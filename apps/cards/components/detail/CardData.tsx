import type { CardSet, NarutoCard } from "@naruto-tcg/types";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ElementIcon } from "@/components/ElementIcon";
import { RarityBadge, TypeBadge } from "@/components/badges";
import { keywordReminder } from "@/lib/keywords";
import { ELEMENT_META, TYPE_META, cardRarities, formatDate, setHref } from "@/lib/meta";
import { EffectText } from "./EffectText";
import type { EffectKeyword } from "./effect-keywords";
import { keywordAnchorId, type EffectToken } from "./effect-text";
import { cardSearchHref } from "./links";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.18em] text-ash-400";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

/** Visible dash for a missing value, announced as "None". */
function NoValue({ note }: { note?: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">None</span>
      {note && <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-ash-400">{note}</span>}
    </>
  );
}

function StatTile({
  label,
  children,
  style,
  className = "",
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      style={style}
      className={`relative min-w-0 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900/80 px-3 py-3 sm:px-4 ${className}`}
    >
      <dt className={LABEL}>{label}</dt>
      <dd className="mt-1.5 text-2xl font-black tabular-nums text-white sm:text-3xl">{children}</dd>
    </div>
  );
}

/** Cost, power and chakra element as headline stat tiles. */
export function CardStats({ card }: { card: NarutoCard }) {
  const element = ELEMENT_META[card.element];
  const elementStyle: CSSProperties = {
    backgroundImage: `radial-gradient(120% 140% at 100% 0%, ${element.hex}2e, transparent 60%)`,
    borderColor: `${element.hex}55`,
  };
  return (
    <dl className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
      <StatTile label="Cost">
        {card.cost === undefined ? (
          <NoValue note={card.type === "leader" ? "Leaders have no cost" : undefined} />
        ) : (
          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-gradient-to-br from-chakra-400 to-chakra-600 px-2 text-2xl text-shadow-950 shadow-[0_0_24px_-6px] shadow-chakra-500 sm:h-11 sm:min-w-11">
            {card.cost}
          </span>
        )}
      </StatTile>
      <StatTile label="Power">
        {card.power === undefined ? (
          <NoValue note={`${TYPE_META[card.type].plural} have no power`} />
        ) : (
          card.power.toLocaleString("en-US")
        )}
      </StatTile>
      <StatTile label="Chakra Element" style={elementStyle} className="col-span-2 xl:col-span-1">
        <span className={`flex items-center gap-2 text-xl sm:text-2xl ${element.text}`}>
          <ElementIcon element={card.element} className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
          <span className="min-w-0 truncate">{element.label}</span>
          <span aria-hidden="true" className="ml-auto hidden text-2xl font-bold opacity-40 sm:inline">
            {element.kanji}
          </span>
        </span>
      </StatTile>
    </dl>
  );
}

/** The rules box: rich effect text plus flavor. */
export function CardRules({ card, paragraphs }: { card: NarutoCard; paragraphs: readonly (readonly EffectToken[])[] }) {
  const element = ELEMENT_META[card.element];
  return (
    <dl className="relative overflow-hidden rounded-2xl border border-shadow-700 bg-gradient-to-b from-shadow-800/90 to-shadow-900/95 shadow-xl shadow-black/30">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: element.hex }} />
      <div className="px-5 py-5 sm:px-6">
        <dt className={LABEL}>Effect</dt>
        <dd className="mt-3 text-[15px] leading-7 text-ash-200 sm:text-base sm:leading-8">
          {paragraphs.length > 0 ? (
            <EffectText paragraphs={paragraphs} />
          ) : (
            <p className="italic text-ash-400">No effect. This is a vanilla card.</p>
          )}
        </dd>
      </div>
      {card.flavor && (
        <div className="border-t border-shadow-700/80 px-5 py-4 sm:px-6">
          <dt className={LABEL}>Flavor</dt>
          <dd className="mt-2 font-serif text-[15px] italic leading-relaxed text-ash-400">
            <q>{card.flavor}</q>
          </dd>
        </div>
      )}
    </dl>
  );
}

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 px-4 py-3.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
      <dt className={`${LABEL} sm:pt-1`}>{label}</dt>
      <dd className="min-w-0 text-sm text-ash-200">{children}</dd>
    </div>
  );
}

function KeywordGlossary({ card, mentioned }: { card: NarutoCard; mentioned: readonly EffectKeyword[] }) {
  const own = new Set(card.keywords);
  // Keywords only the effect text names, mapped to whether the effect grants them.
  const fromEffect = new Map(
    mentioned.filter(({ label }) => !own.has(label)).map(({ label, granted }) => [label, granted]),
  );
  const entries = [...card.keywords, ...fromEffect.keys()];
  if (entries.length === 0) return <NoValue />;
  return (
    <ul className="space-y-2.5">
      {entries.map((keyword) => {
        const anchor = keywordAnchorId(keyword);
        const reminder = keywordReminder(keyword);
        return (
          <li
            key={keyword}
            id={anchor}
            className="scroll-mt-8 rounded-lg transition target:bg-violet-400/10 target:ring-2 target:ring-violet-400/50 target:ring-offset-4 target:ring-offset-shadow-900"
          >
            <span className="flex flex-wrap items-center gap-2">
              <Link
                href={cardSearchHref(keyword)}
                className={`inline-flex rounded-[0.3rem] border border-violet-400/50 bg-violet-400/10 px-1.5 py-px text-xs font-bold tracking-wide text-violet-200 transition hover:border-violet-300 hover:text-white ${FOCUS}`}
              >
                {keyword}
              </Link>
              {fromEffect.has(keyword) && (
                <span className="text-[11px] font-medium uppercase tracking-wider text-ash-400">
                  {fromEffect.get(keyword) === true ? "Granted by effect" : "Referenced in effect"}
                </span>
              )}
            </span>
            {reminder && (
              <span id={`${anchor}-reminder`} className="mt-1 block leading-relaxed text-ash-400">
                {reminder}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Complete spec-sheet readout of the card's data. */
export function CardFacts({
  card,
  debutSet,
  debutUpcoming,
  effectKeywords,
}: {
  card: NarutoCard;
  debutSet: CardSet | undefined;
  debutUpcoming: boolean;
  /** Keywords named in the rules text (see `effectKeywords()`). */
  effectKeywords: readonly EffectKeyword[];
}) {
  const debut = card.printings[0];
  return (
    <dl className="divide-y divide-shadow-800 overflow-hidden rounded-2xl border border-shadow-700 bg-shadow-900/60">
      <FactRow label="Card Name">
        <span className="font-semibold text-white">{card.name}</span>
        {card.title && <span className="text-ash-400"> — {card.title}</span>}
      </FactRow>
      <FactRow label="Card ID">
        <span className="font-mono text-white">{card.id}</span>
      </FactRow>
      <FactRow label="Type">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <TypeBadge type={card.type} />
          <span className="text-ash-400">{TYPE_META[card.type].blurb}</span>
        </span>
      </FactRow>
      <FactRow label="Traits">
        {card.traits.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {card.traits.map((trait) => (
              <li key={trait}>
                <Link
                  href={cardSearchHref(trait)}
                  className={`inline-flex items-center rounded-full border border-shadow-500 bg-shadow-800 px-2.5 py-1 text-xs font-medium text-ash-200 transition hover:border-chakra-400 hover:text-white ${FOCUS}`}
                >
                  {trait}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <NoValue />
        )}
      </FactRow>
      <FactRow label="Keywords">
        <KeywordGlossary card={card} mentioned={effectKeywords} />
      </FactRow>
      <FactRow label="Rarity">
        <span className="flex flex-wrap gap-2">
          {cardRarities(card).map((rarity) => (
            <RarityBadge key={rarity} rarity={rarity} />
          ))}
        </span>
      </FactRow>
      <FactRow label="Artist">{card.artist ? <span className="text-white">{card.artist}</span> : <NoValue />}</FactRow>
      {debut && (
        <FactRow label="Debut">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={setHref(debut.setId)}
              className={`rounded-sm font-medium text-white underline decoration-shadow-500 underline-offset-4 transition hover:decoration-chakra-400 ${FOCUS}`}
            >
              {debutSet?.name ?? debut.setId}
            </Link>
            {debutSet && (
              <span className="text-ash-400">
                {debutUpcoming ? "Releases " : "Released "}
                <time dateTime={debutSet.releaseDate}>{formatDate(debutSet.releaseDate)}</time>
              </span>
            )}
          </span>
        </FactRow>
      )}
    </dl>
  );
}
