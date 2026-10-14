import { ArrowRight, CalendarDays, MapPin, Navigation, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { VerifiedBadge } from "@/components/event-badges";
import { eventTypeMeta, storeFeatureMeta } from "@/lib/event-meta";
import { cx, pluralize } from "@/lib/format";
import type { StoreSummary } from "@/lib/store-summary";
import { StoreOpenPill } from "./store-open-status";

const VISIBLE_FEATURES = 4;

export function PendingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-shadow-500 bg-shadow-800 px-2.5 py-0.5 text-xs font-medium text-ash-400",
        className,
      )}
    >
      <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
      Pending verification
    </span>
  );
}

/**
 * Store directory card. Server-safe (the only clock-dependent part, the open
 * pill, is its own client component); the whole card links to the store page.
 */
export function StoreCard({
  store,
  distanceLabel,
  headingLevel = 3,
  className,
}: {
  store: StoreSummary;
  /** Pre-formatted distance, e.g. "12 mi". */
  distanceLabel?: string | null;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const shown = store.features.slice(0, VISIBLE_FEATURES).map(storeFeatureMeta);
  const hidden = store.features.slice(VISIBLE_FEATURES).map(storeFeatureMeta);
  const next = store.nextEvent;
  const nextMeta = next ? eventTypeMeta(next.type) : null;
  const region = store.admin && (store.country === "US" || store.country === "CA" || store.country === "AU") ? `, ${store.admin}` : "";

  return (
    <article
      className={cx(
        "group relative flex h-full flex-col rounded-xl border border-shadow-700 bg-shadow-900/80 p-5 transition-colors hover:border-shadow-500 has-[a:focus-visible]:border-transparent has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-chakra-400",
        !store.verified && "border-dashed",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading className="text-base font-semibold leading-snug text-white">
            <Link
              href={`/store/${store.slug}`}
              className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none group-hover:text-chakra-400 group-focus-within:text-chakra-400"
            >
              {store.name}
            </Link>
          </Heading>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-ash-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {store.city}
              {region} · {store.countryName}
            </span>
            <span aria-hidden="true">{store.flag}</span>
          </p>
        </div>
        <StoreOpenPill hours={store.hours} timeZone={store.timeZone} locale={store.locale} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {store.verified ? <VerifiedBadge label="Verified host" /> : <PendingBadge />}
        {distanceLabel && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-chakra-400 tabular-nums">
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            {distanceLabel} away
          </span>
        )}
      </div>

      {store.tagline && <p className="mt-3 line-clamp-2 text-sm text-ash-200">{store.tagline}</p>}

      {shown.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Store features">
          {shown.map(({ feature, label, icon: Icon }) => (
            <li
              key={feature}
              className="inline-flex items-center gap-1 rounded-md border border-shadow-700 bg-shadow-800/70 px-1.5 py-1 text-[11px] text-ash-400"
            >
              <Icon className="h-3.5 w-3.5 text-ash-200" aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
          {hidden.length > 0 && (
            <li className="rounded-md border border-shadow-700 px-1.5 py-1 text-[11px] font-medium text-ash-400 tabular-nums">
              <span aria-hidden="true">+{hidden.length}</span>
              <span className="sr-only">and {hidden.map((f) => f.label).join(", ")}</span>
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <div className="rounded-lg border border-shadow-700 bg-shadow-950/60 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ash-400">Next hosted event</p>
          {next && nextMeta ? (
            <p className="mt-1 flex min-w-0 items-start gap-2 text-sm">
              <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", nextMeta.classes.dot)} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ash-200">{next.title}</span>
                <span className="block text-xs text-ash-400">
                  <span className="sr-only">{nextMeta.label}, </span>
                  <time dateTime={next.startsAt}>{next.dateLabel}</time>
                </span>
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ash-400">No events scheduled yet</p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-ash-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="tabular-nums">{pluralize(store.upcomingCount, "upcoming event")}</span>
            {store.tableCount !== undefined && (
              <span className="hidden tabular-nums sm:inline"> · {pluralize(store.tableCount, "table")}</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-chakra-400" aria-hidden="true">
            View store
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
