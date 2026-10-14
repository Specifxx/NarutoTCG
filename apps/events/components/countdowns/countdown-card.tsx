import { CalendarDays, Clock, MapPin, Star } from "lucide-react";
import { StatusBadge } from "@/components/event-badges";
import { cx } from "@/lib/format";
import { milestoneLink, type Milestone } from "@/lib/milestones";
import { button, surface } from "@/lib/styles";
import { AddToCalendar } from "./add-to-calendar";
import { CountdownProgress, CountdownStatusPill } from "./countdown-status";
import { CountdownTimer } from "./countdown-timer";
import { milestoneAccent } from "./milestone-accent";
import { MilestoneBadge, MilestoneDetail, MilestoneLinkButton, icsHrefOf, timingOf } from "./milestone-parts";
import { ViewerLocalTime } from "./viewer-local-time";

export function CountdownCard({ milestone }: { milestone: Milestone }) {
  const accent = milestoneAccent(milestone);
  const link = milestoneLink(milestone);
  const timing = timingOf(milestone);
  const titleId = `milestone-${milestone.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={cx(
        surface.card,
        "relative flex h-full flex-col p-5 transition-colors hover:border-shadow-500",
        milestone.highlight && "border-chakra-500/40",
      )}
    >
      <span aria-hidden="true" className={cx("absolute inset-x-5 top-0 h-px opacity-70", accent.classes.dot)} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <MilestoneBadge milestone={milestone} />
          {milestone.highlight && (
            <span className="inline-flex items-center gap-1 rounded-full border border-chakra-500/40 bg-chakra-500/10 px-2 py-0.5 text-xs font-medium text-chakra-400">
              <Star className="h-3 w-3" aria-hidden="true" />
              Spotlight
            </span>
          )}
          {milestone.eventStatus && <StatusBadge status={milestone.eventStatus} />}
        </div>
        <CountdownStatusPill timing={timing} className="shrink-0" />
      </div>

      <h3 id={titleId} className="mt-3 text-base font-semibold leading-snug text-white">
        {milestone.title}
      </h3>
      <p className="mt-1 text-sm text-ash-400">{milestone.subtitle}</p>

      <dl className="mt-4 space-y-1.5 text-sm text-ash-200">
        <MilestoneDetail icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} term="Date">
          {milestone.display.dateSpan}
        </MilestoneDetail>
        <MilestoneDetail icon={<Clock className="h-4 w-4" aria-hidden="true" />} term="Starts">
          <span className="tabular-nums">{milestone.display.time}</span> {milestone.display.zone}
          <span className="text-ash-400"> · venue time</span>
        </MilestoneDetail>
        {milestone.location && (
          <MilestoneDetail icon={<MapPin className="h-4 w-4" aria-hidden="true" />} term="Location">
            {milestone.location}
          </MilestoneDetail>
        )}
      </dl>

      <CountdownTimer
        className="mt-4"
        size="card"
        timing={timing}
        description={milestone.display.description}
        label={milestone.shortTitle}
      />
      <CountdownProgress className="mt-4" timing={timing} announced={milestone.display.announced} />
      <ViewerLocalTime className="mt-3" startsAt={milestone.startsAt} timeZone={milestone.timeZone} />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
        {link && (
          <MilestoneLinkButton
            link={link}
            context={milestone.title}
            className={cx(button.ghost, "-ml-3 text-chakra-400 hover:text-chakra-400")}
          />
        )}
        <AddToCalendar entry={milestone.calendar} icsHref={icsHrefOf(milestone)} compact align="end" className="ml-auto" />
      </div>
    </article>
  );
}
