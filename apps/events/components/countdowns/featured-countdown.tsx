import { CalendarDays, Clock, MapPin, Star } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/event-badges";
import { cx } from "@/lib/format";
import { milestoneInfoLink, milestoneLink, type Milestone } from "@/lib/milestones";
import { button } from "@/lib/styles";
import { AddToCalendar } from "./add-to-calendar";
import { CountdownProgress, CountdownStatusPill } from "./countdown-status";
import { CountdownTimer } from "./countdown-timer";
import { MilestoneBadge, MilestoneDetail, MilestoneLinkButton, icsHrefOf, timingOf } from "./milestone-parts";
import { ViewerLocalTime } from "./viewer-local-time";

/**
 * Hero countdown. On large screens the timer sits in a right-hand column beside
 * the details; on phones it follows the title so the digits stay above the fold.
 */
export function FeaturedCountdown({ milestone, className }: { milestone: Milestone; className?: string }) {
  const timing = timingOf(milestone);
  const primary = milestoneLink(milestone);
  // An event-linked milestone may also carry an extra info link.
  const secondary = milestone.eventId ? milestoneInfoLink(milestone.href) : undefined;
  const titleId = "featured-countdown-title";

  return (
    <section
      aria-labelledby={titleId}
      className={cx(
        "relative rounded-2xl border border-chakra-500/30 bg-shadow-900/80 shadow-[0_0_80px_-30px_rgb(242_92_0/0.55)]",
        className,
      )}
    >
      <Backdrop />

      <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-chakra-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-shadow-950">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              Featured
            </span>
            <MilestoneBadge milestone={milestone} />
            {milestone.eventStatus && <StatusBadge status={milestone.eventStatus} />}
            <CountdownStatusPill timing={timing} />
          </div>
          <h2 id={titleId} className="mt-4 text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl lg:text-4xl">
            {milestone.title}
          </h2>
          <p className="mt-2 text-ash-200 sm:text-lg">{milestone.subtitle}</p>
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <ChakraRing>
            <CountdownTimer
              size="hero"
              timing={timing}
              description={milestone.display.description}
              label={milestone.shortTitle}
            />
          </ChakraRing>
          <CountdownProgress className="mt-5" timing={timing} announced={milestone.display.announced} />
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <dl className="grid gap-3 text-sm text-ash-200 sm:grid-cols-2">
            <MilestoneDetail icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} term="Date">
              {milestone.display.dateSpan}
            </MilestoneDetail>
            <MilestoneDetail icon={<Clock className="h-4 w-4" aria-hidden="true" />} term="Starts">
              <span className="tabular-nums">{milestone.display.time}</span> {milestone.display.zone}
              <span className="text-ash-400"> · venue time</span>
            </MilestoneDetail>
            {milestone.location && (
              <MilestoneDetail
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                term="Location"
                className="sm:col-span-2"
              >
                {milestone.location}
              </MilestoneDetail>
            )}
          </dl>
          <ViewerLocalTime className="mt-3" startsAt={milestone.startsAt} timeZone={milestone.timeZone} />

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {primary && <MilestoneLinkButton link={primary} context={milestone.title} className={button.primary} />}
            {secondary && <MilestoneLinkButton link={secondary} context={milestone.title} className={button.secondary} />}
            <AddToCalendar
              entry={milestone.calendar}
              icsHref={icsHrefOf(milestone)}
              align="start"
              buttonClassName="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Glowing frame with a slowly orbiting chakra highlight. The conic layer is an
 * oversized square spun behind an opaque panel, so only a thin edge shows; under
 * reduced motion the global stylesheet stops the spin.
 */
function ChakraRing({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-chakra-500/15 p-[1.5px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-[spin_9s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,rgb(255_122_26/0.95)_320deg,transparent_360deg)]"
      />
      <div className="relative rounded-[calc(1rem-1.5px)] bg-shadow-950 p-3 sm:p-5">{children}</div>
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-chakra-500/20 blur-3xl" />
      <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-blood-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <svg
        viewBox="0 0 100 100"
        className="absolute -bottom-16 -left-16 h-64 w-64 rotate-12 text-white/[0.035] sm:h-80 sm:w-80"
      >
        {/* Four-point shuriken with a centre hole. */}
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M50 0 61 39 100 50 61 61 50 100 39 61 0 50 39 39Z M50 43a7 7 0 1 0 0 14a7 7 0 1 0 0-14Z"
        />
      </svg>
    </div>
  );
}
