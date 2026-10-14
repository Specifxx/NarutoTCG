import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardImage } from "@/components/CardImage";
import { ElementBadge, RarityBadge } from "@/components/badges";
import { ArrowRightIcon, CalendarIcon } from "@/components/home/icons";
import { PrintButton } from "@/components/sets/PrintButton";
import { ProgressBar, percentLabel } from "@/components/sets/ProgressBar";
import { KIND_BANNER, UpcomingBadge } from "@/components/sets/set-ui";
import { ChecklistRow, SetChecklist } from "@/components/sets/SetChecklist";
import { searchHaystack, type ChecklistIndexEntry } from "@/components/sets/checklist-model";
import styles from "@/components/sets/checklist.module.css";
import { pluralize, summarizeSet } from "@/components/spoilers/reveals";
import { getSet, getSetEntries, getSets } from "@/lib/data";
import {
  RARITY_META,
  SET_KIND_LABEL,
  TYPE_META,
  VARIANT_LABEL,
  cardHref,
  daysBetween,
  formatDate,
  formatDateLong,
  isReleased,
  todayIso,
} from "@/lib/meta";
import { cardsHref } from "@/lib/search";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSets().map((set) => ({ setId: set.id }));
}

type Params = { params: Promise<{ setId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const set = getSet((await params).setId);
  if (!set) return {};
  return {
    title: `${set.name} Checklist`,
    description: `Checklist for ${set.name} (${set.id}): every known printing with rarity and variant. Track which cards you own.`,
  };
}

const ACTION =
  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

export default async function SetChecklistPage({ params }: Params) {
  const set = getSet((await params).setId);
  if (!set) notFound();

  const today = todayIso();
  const released = isReleased(set, today);
  const daysLeft = daysBetween(today, set.releaseDate);
  const entries = getSetEntries(set.id);
  const summary = summarizeSet(set, entries);
  const index: ChecklistIndexEntry[] = entries.map((entry) => ({
    key: entry.key,
    rarity: entry.printing.rarity,
    search: searchHaystack([entry.card.name, entry.card.title, entry.printing.number]),
  }));
  const shownNumbers = Math.min(summary.knownNumbers, set.totalCards);

  return (
    <div className={`${styles.printRoot} mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10`}>
      <nav aria-label="Breadcrumb" className={styles.noPrint}>
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ash-400">
          <li>
            <Link
              href="/sets"
              className="rounded-sm transition hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              Set Checklists
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-mono text-ash-200">
            {set.id}
          </li>
        </ol>
      </nav>

      <header className="relative mt-4 overflow-hidden rounded-3xl border border-shadow-700 bg-shadow-900 p-5 shadow-2xl shadow-black/30 sm:p-8">
        <div
          aria-hidden="true"
          className={`${styles.noPrint} pointer-events-none absolute inset-0 bg-gradient-to-br ${KIND_BANNER[set.kind]}`}
        />
        <span
          aria-hidden="true"
          className={`${styles.noPrint} pointer-events-none absolute -right-4 -top-6 select-none font-mono text-[7rem] font-black leading-none tracking-tighter text-white/[0.04] sm:text-[10rem]`}
        >
          {set.id}
        </span>

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-shadow-500 bg-shadow-800 px-2 py-0.5 font-mono font-semibold tracking-wider text-ash-200">
              {set.id}
            </span>
            <span className="font-semibold uppercase tracking-[0.14em] text-ash-400">{SET_KIND_LABEL[set.kind]}</span>
            {!released && <UpcomingBadge />}
          </div>
          <h1 className="mt-3 text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">{set.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-ash-400 sm:text-base">
            <CalendarIcon className="h-4 w-4 shrink-0 text-chakra-400" />
            {released ? "Released" : "Releases"}{" "}
            <time dateTime={set.releaseDate} title={formatDateLong(set.releaseDate)} className="text-ash-200">
              {formatDate(set.releaseDate)}
            </time>
            {!released && daysLeft > 0 && <span>· {pluralize(daysLeft, "day")} to go</span>}
          </p>
          {set.description && (
            <p className="mt-4 max-w-3xl text-pretty text-sm text-ash-400 sm:text-base">{set.description}</p>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-end">
            <div className={styles.noPrint}>
              <p className="flex items-baseline justify-between gap-3 text-sm text-ash-200">
                <span>
                  <span className="text-lg font-bold text-white">{shownNumbers}</span> of {set.totalCards}{" "}
                  {released ? "cards listed" : "revealed"}
                  <span className="text-ash-400"> · {pluralize(summary.printings, "printing")}</span>
                </span>
                <span className="font-semibold tabular-nums text-chakra-400">{percentLabel(shownNumbers, set.totalCards)}</span>
              </p>
              <ProgressBar
                value={shownNumbers}
                max={set.totalCards}
                tone={released ? "muted" : "chakra"}
                label={`${set.shortName} ${released ? "cards listed" : "reveal progress"}`}
                valueText={`${shownNumbers} of ${set.totalCards} cards ${released ? "listed" : "revealed"}`}
                className="mt-2"
              />
            </div>
            <div className={`${styles.noPrint} flex flex-wrap gap-2 lg:justify-end`}>
              <Link
                href={cardsHref({ sets: [set.id] })}
                className={`${ACTION} bg-chakra-500 text-shadow-950 hover:bg-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900`}
              >
                Browse in database
                <ArrowRightIcon />
              </Link>
              {!released && (
                <Link href="/spoilers" className={`${ACTION} border border-shadow-500 text-ash-200 hover:border-chakra-400 hover:text-chakra-400`}>
                  Spoilers
                </Link>
              )}
              {entries.length > 0 && <PrintButton />}
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 sm:mt-8">
        {entries.length === 0 ? (
          <section
            aria-labelledby="empty-set"
            className="rounded-3xl border border-dashed border-shadow-700 bg-shadow-900/60 px-6 py-16 text-center"
          >
            <p aria-hidden="true" className="text-5xl text-chakra-500/70">
              封
            </p>
            <h2 id="empty-set" className="mt-4 text-xl font-bold text-white">
              {released ? "No cards listed yet" : "No cards revealed yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ash-400">
              {released
                ? `Cards from ${set.shortName} haven't been added to the database yet. The checklist will appear here once they are.`
                : `Nothing from ${set.shortName} has been revealed so far. Its checklist fills in as spoilers drop.`}
            </p>
            <Link
              href={released ? "/sets" : "/spoilers"}
              className={`${ACTION} mt-6 bg-chakra-500 text-shadow-950 hover:bg-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950`}
            >
              {released ? "All set checklists" : "Latest spoilers"}
              <ArrowRightIcon />
            </Link>
          </section>
        ) : (
          <SetChecklist setLabel={set.shortName} index={index}>
            {entries.map(({ card, printing, key }) => {
              const variant = VARIANT_LABEL[printing.variant];
              return (
                <ChecklistRow key={key} entryKey={key} label={`${card.name}, ${printing.number}, ${variant}`}>
                  {/* Decorative here: the name link and checkbox label already identify the card. */}
                  <div aria-hidden="true" className={`${styles.cellThumb} w-11`}>
                    <CardImage card={card} printing={printing} className="rounded-[3px] shadow shadow-black/60" />
                  </div>
                  <div className={styles.cellName}>
                    <Link
                      href={cardHref(card.id)}
                      className="rounded-sm font-semibold text-white transition hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                    >
                      {card.name}
                    </Link>
                    {printing.variant !== "standard" && <span className={styles.printOnly}> ({variant})</span>}
                    {card.title && <span className="block truncate text-xs text-ash-400">{card.title}</span>}
                  </div>
                  <div className={styles.cellMeta}>
                    <span className={`${styles.cellNum} font-mono text-xs text-ash-200`}>{printing.number}</span>
                    <span className={`${styles.cellType} text-[11px] font-semibold uppercase tracking-wider text-ash-400`}>
                      {TYPE_META[card.type].label}
                    </span>
                    <span className={styles.cellElement}>
                      <ElementBadge element={card.element} />
                    </span>
                    <span className={styles.cellRarity}>
                      <span className={styles.screenOnly}>
                        <RarityBadge rarity={printing.rarity} />
                      </span>
                      <span className={styles.printOnly}>{RARITY_META[printing.rarity].code}</span>
                    </span>
                    <span
                      className={`${styles.cellVariant} text-xs ${
                        printing.variant === "standard" ? "text-ash-400 max-lg:hidden" : "font-semibold text-fuchsia-200"
                      }`}
                    >
                      {variant}
                    </span>
                  </div>
                </ChecklistRow>
              );
            })}
          </SetChecklist>
        )}
      </div>
    </div>
  );
}
