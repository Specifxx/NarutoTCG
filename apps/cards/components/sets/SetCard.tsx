import type { CardSet } from "@naruto-tcg/types";
import Link from "next/link";
import { CardImage } from "@/components/CardImage";
import { CalendarIcon } from "@/components/home/icons";
import type { SetEntryLike, SetSummary } from "@/components/spoilers/reveals";
import { SET_KIND_LABEL, daysBetween, formatDate, isReleased, setHref } from "@/lib/meta";
import { ProgressBar } from "./ProgressBar";
import { SetOwnedProgress } from "./SetOwnedProgress";
import { KIND_BANNER, UpcomingBadge } from "./set-ui";

/** One set on the /sets index. The whole card links to the set checklist. */
export function SetCard({
  set,
  summary,
  showcase,
  today,
}: {
  set: CardSet;
  summary: SetSummary;
  showcase: readonly SetEntryLike[];
  today: string;
}) {
  const released = isReleased(set, today);
  const daysLeft = daysBetween(today, set.releaseDate);
  const headingId = `set-${set.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-shadow-700 bg-shadow-900 shadow-lg shadow-black/30 transition duration-200 hover:border-chakra-500/50 hover:shadow-chakra-500/10 focus-within:border-chakra-500/60"
    >
      <div
        aria-hidden="true"
        className={`relative h-32 overflow-hidden border-b border-shadow-800 bg-gradient-to-br ${KIND_BANNER[set.kind]}`}
      >
        <span className="absolute -bottom-6 left-4 select-none font-mono text-7xl font-black tracking-tighter text-white/[0.06]">
          {set.id}
        </span>
        <div className="absolute inset-y-0 right-3 flex items-end gap-0 pb-0">
          {showcase.map((entry, i) => (
            <div
              key={entry.key}
              className={`w-[4.5rem] translate-y-6 drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)] transition duration-300 motion-safe:group-hover:translate-y-3 ${
                i === 0 ? "-rotate-12" : i === 1 ? "-ml-6 -rotate-3" : "-ml-6 rotate-6"
              }`}
            >
              <CardImage card={entry.card} printing={entry.printing} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-shadow-500 bg-shadow-800 px-2 py-0.5 font-mono font-semibold tracking-wider text-ash-200">
            {set.id}
          </span>
          <span className="font-semibold uppercase tracking-[0.14em] text-ash-400">{SET_KIND_LABEL[set.kind]}</span>
          {!released && <UpcomingBadge className="ml-auto" />}
        </div>

        <h3 id={headingId} className="mt-3 text-lg font-bold leading-snug text-white">
          <Link
            href={setHref(set.id)}
            className="rounded-sm transition after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:text-chakra-400 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-chakra-400"
          >
            {set.name}
          </Link>
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ash-400">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {released ? "Released" : "Releases"} <time dateTime={set.releaseDate}>{formatDate(set.releaseDate)}</time>
          {!released && daysLeft > 0 && (
            <span className="text-ash-200">
              · in {daysLeft} {daysLeft === 1 ? "day" : "days"}
            </span>
          )}
        </p>

        {set.description && <p className="mt-3 line-clamp-3 text-sm text-ash-400">{set.description}</p>}

        <div className="mt-auto space-y-3 pt-5">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-shadow-950/60 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ash-400">
                {released ? "Cards listed" : "Revealed"}
              </dt>
              <dd className="mt-0.5 tabular-nums text-ash-200">
                <span className="font-bold text-white">{summary.knownNumbers}</span> / {set.totalCards}
              </dd>
            </div>
            <div className="rounded-lg bg-shadow-950/60 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ash-400">Printings</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-white">{summary.printings}</dd>
            </div>
          </dl>
          <ProgressBar
            value={Math.min(summary.knownNumbers, set.totalCards)}
            max={set.totalCards}
            size="sm"
            tone={released ? "muted" : "chakra"}
            label={`${set.shortName} ${released ? "cards listed" : "cards revealed"}`}
            valueText={`${summary.knownNumbers} of ${set.totalCards} cards ${released ? "listed" : "revealed"}`}
          />
          {summary.printings > 0 && <SetOwnedProgress keys={summary.keys} setLabel={set.shortName} />}
        </div>
      </div>
    </article>
  );
}
