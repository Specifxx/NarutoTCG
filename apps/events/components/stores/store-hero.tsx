import type { Store } from "@naruto-tcg/types";
import { ExternalLink, Globe, LayoutGrid, Mail, Navigation, Phone, Store as StoreIcon, TriangleAlert } from "lucide-react";
import { VerifiedBadge } from "@/components/event-badges";
import { regionLabel } from "@/lib/event-meta";
import { cx, flagEmoji, placeLabel, pluralize } from "@/lib/format";
import { googleMapsDirectionsUrl } from "@/lib/geo";
import { button } from "@/lib/styles";
import { formatDate, localeForRegion } from "@/lib/time";
import { PendingBadge } from "./store-card";
import { telHref } from "./store-contact";
import { StoreLiveStatus } from "./store-open-status";

/** "March 2026" from a "YYYY-MM-DD" date. */
function monthYear(date: string): string {
  return formatDate(`${date}T12:00:00Z`, "UTC", "en-US", { month: "long", year: "numeric" });
}

/** Store page header: identity, verification, live open status and quick actions. */
export function StoreHero({ store }: { store: Store }) {
  const { phone, email, website } = store.contact;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <header className="relative overflow-hidden rounded-2xl border border-shadow-700 bg-gradient-to-br from-shadow-900 via-shadow-900 to-chakra-600/10 p-5 sm:p-8">
      <StoreIcon
        className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 text-chakra-500/[0.045] sm:h-64 sm:w-64"
        aria-hidden="true"
        strokeWidth={1}
      />

      <div className="relative">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ash-400">
          <span aria-hidden="true">{flagEmoji(store.address.country)}</span>
          <span>{placeLabel(store.address)}</span>
          <span aria-hidden="true">·</span>
          <span>{regionLabel(store.region)}</span>
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{store.name}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {store.verified ? (
            <VerifiedBadge
              label={store.verifiedSince ? `Verified host since ${monthYear(store.verifiedSince)}` : "Verified host"}
            />
          ) : (
            <PendingBadge />
          )}
          {store.tableCount !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full border border-shadow-500/60 bg-shadow-800 px-2.5 py-0.5 text-xs font-medium text-ash-200 tabular-nums">
              <LayoutGrid className="h-3.5 w-3.5 text-ash-400" aria-hidden="true" />
              {pluralize(store.tableCount, "table")}
            </span>
          )}
        </div>

        {store.tagline && <p className="mt-4 max-w-2xl text-lg text-ash-200">{store.tagline}</p>}

        <StoreLiveStatus
          className="mt-5"
          hours={store.hours}
          timeZone={store.timeZone}
          locale={localeForRegion(store.region)}
          city={store.address.city}
        />

        <ul className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Quick actions">
          <li>
            <a href={googleMapsDirectionsUrl(store.location)} {...external} className={cx(button.primary, "w-full")}>
              <Navigation className="h-4 w-4" aria-hidden="true" />
              Directions
              <span className="sr-only">(opens Google Maps in a new tab)</span>
            </a>
          </li>
          {phone && (
            <li>
              <a href={telHref(phone)} className={cx(button.secondary, "w-full")}>
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call
                <span className="sr-only"> {phone}</span>
              </a>
            </li>
          )}
          {email && (
            <li>
              <a href={`mailto:${email}`} className={cx(button.secondary, "w-full")}>
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email
              </a>
            </li>
          )}
          {website && (
            <li>
              <a href={website} {...external} className={cx(button.secondary, "w-full")}>
                <Globe className="h-4 w-4" aria-hidden="true" />
                Website
                <ExternalLink className="h-3.5 w-3.5 text-ash-400" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          )}
        </ul>
      </div>

      {!store.verified && (
        <div
          role="note"
          className="relative mt-6 flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <p>
            <span className="font-semibold text-amber-200">Pending verification.</span> This listing hasn&apos;t been
            confirmed by the Naruto TCG organised play team yet, so demo kits and event details may change. Check with
            the store before you travel.
          </p>
        </div>
      )}
    </header>
  );
}
