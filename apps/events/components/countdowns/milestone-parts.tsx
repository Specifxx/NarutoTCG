import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/format";
import type { Milestone, MilestoneLink } from "@/lib/milestones";
import { milestoneAccent } from "./milestone-accent";
import type { CountdownTiming } from "./use-countdown";

/** Only the fields the client timers need, to keep the RSC payload small. */
export function timingOf(milestone: Milestone): CountdownTiming {
  return { startsAt: milestone.startsAt, endsAt: milestone.endsAt, announcedAt: milestone.announcedAt };
}

/** The event's own .ics route for event-linked milestones. */
export function icsHrefOf(milestone: Milestone): string | undefined {
  return milestone.eventId ? `/events/${encodeURIComponent(milestone.eventId)}/calendar.ics` : undefined;
}

export function MilestoneBadge({ milestone, className }: { milestone: Milestone; className?: string }) {
  const accent = milestoneAccent(milestone);
  const Icon = accent.icon;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        accent.classes.border,
        accent.classes.bg,
        accent.classes.text,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {accent.label}
    </span>
  );
}

/**
 * Internal links use next/link; external ones open in a new tab. `context` names
 * the milestone for screen readers so repeated "Event details" links stay distinct.
 */
export function MilestoneLinkButton({
  link,
  context,
  className,
  children,
}: {
  link: MilestoneLink;
  context: string;
  className: string;
  children?: ReactNode;
}) {
  const label = (
    <>
      {children ?? link.label}
      <span className="sr-only">: {context}</span>
    </>
  );
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/** Icon + value row inside a `<dl>`; the term is visually hidden. */
export function MilestoneDetail({
  icon,
  term,
  className,
  children,
}: {
  icon: ReactNode;
  term: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex items-start gap-2", className)}>
      <dt className="mt-0.5 shrink-0 text-ash-400">
        {icon}
        <span className="sr-only">{term}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
