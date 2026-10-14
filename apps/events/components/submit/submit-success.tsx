import { CalendarDays, Check, CircleCheckBig, Copy, Hourglass, MailCheck, MapPin, RotateCcw, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EventTypeBadge } from "@/components/event-badges";
import { cx } from "@/lib/format";
import { button, surface } from "@/lib/styles";
import {
  REVIEW_BUSINESS_DAYS,
  type EventSubmission,
  type SubmissionResponse,
  type SubmissionStoreOption,
} from "@/lib/submission";
import { miniButton } from "./fields";
import { dateSummary, venueSummary } from "./step-review";

export function SubmitSuccess({
  response,
  submission,
  stores,
  onSubmitAnother,
}: {
  response: SubmissionResponse;
  submission: EventSubmission;
  stores: readonly SubmissionStoreOption[];
  onSubmitAnother: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(response.id);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const nextSteps = [
    {
      icon: ShieldCheck,
      title: "Moderator review",
      text: `We check the details within ${REVIEW_BUSINESS_DAYS} business days.`,
    },
    {
      icon: MailCheck,
      title: "Email update",
      text: `We'll write to ${submission.organiser.email} when it's approved or if we need changes.`,
    },
    {
      icon: CalendarDays,
      title: "Goes live",
      text: "The event appears in the calendar, on the map and on the venue's page.",
    },
  ];

  return (
    <section aria-labelledby="submit-success-title" className={cx(surface.card, "overflow-hidden")}>
      <div className="border-b border-shadow-700 bg-gradient-to-b from-emerald-500/10 to-transparent p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <CircleCheckBig className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2
          id="submit-success-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 scroll-mt-28 text-2xl font-bold tracking-tight text-white outline-none"
        >
          Thanks! Your event is in the review queue
        </h2>
        <p className="mt-2 max-w-2xl text-ash-400">
          Keep your reference handy if you need to contact us about this listing.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className={cx(surface.inset, "p-4")}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ash-400">Reference</dt>
            <dd className="mt-1 flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-semibold tracking-wider text-white">{response.id}</span>
              <button type="button" onClick={copyReference} className={miniButton.muted}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
              </button>
            </dd>
          </div>
          <div className={cx(surface.inset, "p-4")}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ash-400">Status</dt>
            <dd className="mt-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/10 px-2.5 py-1 text-sm font-medium text-amber-300">
                <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                Pending review
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ash-200">Your listing</h3>
          <div className={cx(surface.inset, "mt-3 space-y-3 p-4")}>
            <EventTypeBadge type={submission.event.type} size="sm" />
            <p className="text-base font-semibold text-white">{submission.event.title}</p>
            <p className="flex items-start gap-2 text-sm text-ash-200">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
              <span>
                {dateSummary(submission)} ·{" "}
                <span className="tabular-nums">
                  {submission.schedule.startTime}–{submission.schedule.endTime}
                </span>
                {submission.schedule.recurrence === "weekly" && <span className="text-ash-400"> · weekly</span>}
              </span>
            </p>
            <p className="flex items-start gap-2 text-sm text-ash-200">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ash-400" aria-hidden="true" />
              <span>{venueSummary(submission, stores)}</span>
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ash-200">What happens next</h3>
          <ol className="mt-3 space-y-3">
            {nextSteps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-shadow-700 bg-shadow-800 text-chakra-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    <span className="sr-only">{i + 1}. </span>
                    {title}
                  </p>
                  <p className="text-sm text-ash-400">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-shadow-700 p-6 sm:flex-row sm:items-center sm:p-8">
        <button type="button" onClick={onSubmitAnother} className={button.primary}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Submit another
        </button>
        <Link href="/events" className={button.secondary}>
          <Search className="h-4 w-4" aria-hidden="true" />
          Browse events
        </Link>
        <p className="text-xs text-ash-400 sm:ml-auto">Your organiser and venue details are kept for the next one.</p>
      </div>
    </section>
  );
}
