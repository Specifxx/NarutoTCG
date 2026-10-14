import type { TcgEvent } from "@naruto-tcg/types";
import { CalendarDays, MapPin, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EventTypeBadge, FormatBadge, StatusBadge, VerifiedBadge } from "@/components/event-badges";
import { eventTypeMeta } from "@/lib/event-meta";
import { cx, flagEmoji, placeLabel } from "@/lib/format";
import type { EventDateLabels } from "./event-dates";

/** Title block with a subtle glow in the event type's colour. */
export function EventHero({ event, dates }: { event: TcgEvent; dates: EventDateLabels }) {
  const meta = eventTypeMeta(event.type);
  const TypeIcon = meta.icon;
  const cancelled = event.status === "cancelled";

  return (
    <header
      className={cx(
        "relative isolate overflow-hidden rounded-2xl border bg-shadow-900/80 px-5 py-6 sm:px-8 sm:py-8",
        meta.classes.border,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(70% 110% at 0% 0%, ${meta.hex}2e 0%, transparent 60%), radial-gradient(45% 80% at 100% 100%, ${meta.hex}12 0%, transparent 70%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-px"
        style={{ backgroundImage: `linear-gradient(90deg, transparent, ${meta.hex}a0, transparent)` }}
      />
      <TypeIcon
        aria-hidden="true"
        strokeWidth={1.25}
        className={cx(
          "absolute -right-10 -top-10 -z-10 h-48 w-48 rotate-12 opacity-[0.07] sm:h-72 sm:w-72",
          meta.classes.text,
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <EventTypeBadge type={event.type} />
        <FormatBadge format={event.format} />
        <StatusBadge status={event.status} />
      </div>

      <h1
        className={cx(
          "mt-4 max-w-3xl text-balance break-words text-3xl font-bold tracking-tight text-white sm:text-4xl",
          cancelled && "line-through decoration-rose-400/60 decoration-2",
        )}
      >
        {event.title}
      </h1>

      <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
        <HeroFact icon={CalendarDays} label="When" iconClass={meta.classes.text}>
          <span className="block text-lg font-semibold text-white">{dates.dateSpan}</span>
          <span className="block text-ash-200 tabular-nums">{dates.timeLine}</span>
          <span className="mt-0.5 block text-xs text-ash-400">
            Venue local time · <span className="whitespace-nowrap">{event.timeZone.replace(/_/g, " ")}</span>
          </span>
        </HeroFact>
        <HeroFact icon={MapPin} label="Where" iconClass={meta.classes.text}>
          <span className="block text-lg font-semibold text-white">{event.venue.name}</span>
          {event.venue.hall && <span className="block text-ash-200">{event.venue.hall}</span>}
          <span className="block text-ash-400">
            <span aria-hidden="true">{flagEmoji(event.venue.address.country)} </span>
            {placeLabel(event.venue.address)}
          </span>
        </HeroFact>
      </dl>

      <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-ash-400">
        <span>
          Organised by{" "}
          <a href="#organiser" className="font-medium text-ash-200 underline-offset-4 hover:text-chakra-400 hover:underline">
            {event.organizer.name}
          </a>
        </span>
        {event.organizer.verified && <VerifiedBadge label="Verified organiser" />}
      </p>
    </header>
  );
}

function HeroFact({
  icon: Icon,
  label,
  iconClass,
  children,
}: {
  icon: LucideIcon;
  label: string;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    // The icon lives inside <dt> (absolutely positioned) to keep the dl content model valid.
    <div className="relative min-w-0 pl-[3.25rem]">
      <dt className="text-xs font-semibold uppercase tracking-wider text-ash-400">
        <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg border border-shadow-700 bg-shadow-950/60">
          <Icon className={cx("h-5 w-5", iconClass)} aria-hidden="true" />
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 break-words">{children}</dd>
    </div>
  );
}
