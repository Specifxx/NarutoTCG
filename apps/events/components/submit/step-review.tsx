import { Braces, Check, Copy, Pencil, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { EventTypeBadge, FormatBadge } from "@/components/event-badges";
import { cx, formatMoney } from "@/lib/format";
import { button, surface } from "@/lib/styles";
import {
  describeDateKey,
  isImportReady,
  ORGANISER_ROLES,
  organiserContactIsPublic,
  REGISTRATION_METHODS,
  STEPS,
  suggestSeedId,
  timeZoneLabel,
  toEventSeed,
  venueCountry,
  weekdayOfKey,
  weeklyOccurrences,
  type EventSubmission,
  type StepId,
  type SubmissionStoreOption,
} from "@/lib/submission";
import { CheckboxField, miniButton, type StepProps } from "./fields";

const GUIDELINES = [
  "The event is open to the public, or the description clearly says who can join.",
  "Dates, times, fees and prizes are accurate, and you'll update or cancel the listing if plans change.",
  "Players are welcomed and treated with respect, following the Naruto TCG code of conduct.",
];

/** One-line venue label for summaries: "Hidden Leaf Games · Los Angeles, CA, USA". */
export function venueSummary(submission: EventSubmission, stores: readonly SubmissionStoreOption[]): string {
  const { venue } = submission;
  if (venue.mode === "store") {
    const store = stores.find((s) => s.slug === venue.storeSlug);
    return store ? `${store.name} · ${store.place}` : venue.storeSlug;
  }
  const country = venueCountry(venue.country)?.name ?? venue.country;
  return `${venue.name} · ${[venue.city, venue.region, country].filter(Boolean).join(", ")}`;
}

/** "Sat, Nov 7, 2026" or "Fri, Mar 12 – Sun, Mar 14, 2027". */
export function dateSummary(submission: EventSubmission): string {
  const { date, endDate } = submission.schedule;
  if (!endDate) return describeDateKey(date);
  return `${describeDateKey(date, { weekday: "short", month: "short", day: "numeric" })} – ${describeDateKey(endDate)}`;
}

function Group({
  step,
  onEdit,
  children,
}: {
  step: StepId;
  onEdit: (step: StepId) => void;
  children: ReactNode;
}) {
  const meta = STEPS.find((s) => s.id === step);
  const headingId = `submit-review-${step}`;
  return (
    <section aria-labelledby={headingId} className={cx(surface.inset, "p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="text-sm font-semibold uppercase tracking-wider text-ash-200">
          {meta?.title}
        </h3>
        <button type="button" onClick={() => onEdit(step)} className={cx(miniButton.accent, "-my-1 -mr-2")}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit<span className="sr-only"> {meta?.title.toLowerCase()}</span>
        </button>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ash-400">{label}</dt>
      <dd className="min-w-0 break-words text-ash-200">{children}</dd>
    </>
  );
}

function SeedPreview({ submission }: { submission: EventSubmission }) {
  const seed = toEventSeed(submission, suggestSeedId(submission));
  const json = JSON.stringify(seed, null, 2);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className={cx(surface.inset, "group")}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-ash-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 [&::-webkit-details-marker]:hidden">
        <Braces className="h-4 w-4 text-chakra-400" aria-hidden="true" />
        Import preview (JSON)
        <span className="ml-auto text-xs font-normal text-ash-400 group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs font-normal text-ash-400 group-open:inline">Hide</span>
      </summary>
      <div className="space-y-3 border-t border-shadow-700 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="max-w-prose text-xs text-ash-400">
            The record our moderators will import into the events directory. They may adjust the id, type or tags
            for consistency.
            {!isImportReady(seed) && " The map pin will be added during review."}
          </p>
          <button type="button" onClick={copy} className={miniButton.muted}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy JSON"}</span>
          </button>
        </div>
        <pre
          tabIndex={0}
          aria-label="Event record JSON"
          className="relative max-h-80 overflow-auto rounded-md border border-shadow-700 bg-shadow-950 p-3 font-mono text-xs leading-relaxed text-ash-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
        >
          <code>{json}</code>
        </pre>
      </div>
    </details>
  );
}

export function ReviewStep({
  draft,
  errors,
  set,
  submission,
  stores,
  onEdit,
  onFixFirstIssue,
  honeypot,
  onHoneypotChange,
}: StepProps & {
  submission: EventSubmission | null;
  stores: readonly SubmissionStoreOption[];
  onEdit: (step: StepId) => void;
  onFixFirstIssue: () => void;
  honeypot: string;
  onHoneypotChange: (value: string) => void;
}) {
  if (!submission) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-5">
        <p className="flex items-start gap-2 text-sm text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Some earlier answers need attention before you can review the listing.
        </p>
        <button type="button" onClick={onFixFirstIssue} className={button.secondary}>
          Go to the first issue
        </button>
      </div>
    );
  }

  const { organiser, venue, event, schedule, capacity, fee, registration } = submission;
  const role = ORGANISER_ROLES.find((r) => r.role === organiser.role)?.label ?? organiser.role;
  const method = REGISTRATION_METHODS.find((m) => m.method === registration.method)?.label ?? registration.method;
  const store = venue.mode === "store" ? stores.find((s) => s.slug === venue.storeSlug) : undefined;

  return (
    <>
      <div className="space-y-4">
        <Group step="organiser" onEdit={onEdit}>
          <Row label="Organiser">
            {organiser.name} <span className="text-ash-400">· {role}</span>
          </Row>
          <Row label="Contact">
            {organiser.email}
            {organiser.phone && <span className="text-ash-400"> · {organiser.phone}</span>}
            <span className="block text-xs text-ash-400">
              {organiserContactIsPublic(submission)
                ? "Shown to players as the organiser contact."
                : "Private: players contact the store."}
            </span>
          </Row>
          <Row label="Venue">
            {venue.mode === "store" ? (
              <>
                <span className="font-medium text-white">{store?.name ?? venue.storeSlug}</span>
                {store && <span className="block text-ash-400">{store.place}</span>}
              </>
            ) : (
              <>
                <span className="font-medium text-white">{venue.name}</span>
                <span className="block text-ash-400">
                  {[venue.line1, venue.line2, [venue.postalCode, venue.city].filter(Boolean).join(" "), venue.region]
                    .filter(Boolean)
                    .join(", ")}
                  , {venueCountry(venue.country)?.name ?? venue.country}
                </span>
              </>
            )}
          </Row>
          {venue.mode === "new" && (
            <Row label="Map pin">
              {venue.lat !== undefined && venue.lng !== undefined ? (
                <span className="tabular-nums">
                  {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
                </span>
              ) : (
                <span className="text-ash-400">Added by moderators during review</span>
              )}
            </Row>
          )}
        </Group>

        <Group step="details" onEdit={onEdit}>
          <Row label="Type & format">
            <span className="flex flex-wrap gap-1.5">
              <EventTypeBadge type={event.type} />
              <FormatBadge format={event.format} />
            </span>
          </Row>
          <Row label="Title">
            <span className="font-medium text-white">{event.title}</span>
          </Row>
          <Row label="Description">
            <span className="block whitespace-pre-line">{event.description}</span>
          </Row>
          <Row label="Tags">
            {event.tags.length ? (
              <span className="flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-shadow-500/60 bg-shadow-800 px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-ash-400">None</span>
            )}
          </Row>
        </Group>

        <Group step="schedule" onEdit={onEdit}>
          <Row label="Date">{dateSummary(submission)}</Row>
          <Row label="Time">
            <span className="tabular-nums">
              {schedule.startTime}–{schedule.endTime}
            </span>{" "}
            <span className="text-ash-400">· {timeZoneLabel(schedule.timeZone)}</span>
          </Row>
          <Row label="Repeats">
            {schedule.recurrence === "weekly" && schedule.repeatUntil ? (
              <>
                Every {weekdayOfKey(schedule.date)} until {describeDateKey(schedule.repeatUntil)}{" "}
                <span className="text-ash-400 tabular-nums">
                  ({weeklyOccurrences(schedule.date, schedule.repeatUntil)} sessions)
                </span>
              </>
            ) : (
              "One-off"
            )}
          </Row>
          <Row label="Capacity">
            {capacity.uncapped || capacity.max === undefined ? (
              "No player cap"
            ) : (
              <span className="tabular-nums">{capacity.max.toLocaleString("en-US")} players</span>
            )}
          </Row>
          <Row label="Entry fee">
            <span className="tabular-nums">{formatMoney(fee)}</span>
          </Row>
        </Group>

        <Group step="registration" onEdit={onEdit}>
          <Row label="Sign-up">
            {method}
            {registration.url && <span className="block break-all text-ash-400">{registration.url}</span>}
          </Row>
          <Row label="Opens">
            {registration.opensDate ? describeDateKey(registration.opensDate) : "As soon as the listing is published"}
          </Row>
          <Row label="Prizes">
            {submission.prizes.length ? (
              <ul className="list-disc space-y-0.5 pl-4 marker:text-chakra-400">
                {submission.prizes.map((prize, i) => (
                  <li key={i}>{prize}</li>
                ))}
              </ul>
            ) : (
              <span className="text-ash-400">None listed</span>
            )}
          </Row>
          <Row label="Player list">{submission.participantListPublic ? "Public" : "Private"}</Row>
        </Group>

        <SeedPreview submission={submission} />
      </div>

      <section aria-labelledby="submit-guidelines" className="rounded-xl border border-chakra-500/30 bg-chakra-500/5 p-4 sm:p-5">
        <h3 id="submit-guidelines" className="flex items-center gap-2 text-sm font-semibold text-white">
          <ShieldCheck className="h-4 w-4 text-chakra-400" aria-hidden="true" />
          Community guidelines
        </h3>
        <ul className="mt-3 space-y-1.5 text-sm text-ash-200">
          {GUIDELINES.map((g) => (
            <li key={g} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              {g}
            </li>
          ))}
        </ul>
        <CheckboxField
          className="mt-4 border-t border-shadow-700 pt-4"
          path="agreeToGuidelines"
          label="I confirm this event follows the guidelines and that I'm allowed to list it."
          checked={draft.agreeToGuidelines}
          onChange={(value) => set("agreeToGuidelines", value)}
          required
          error={errors.agreeToGuidelines}
        />
      </section>

      {/* Honeypot: invisible to people and assistive tech; bots that fill every field get a fake success. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="submit-website">Website</label>
        <input
          id="submit-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => onHoneypotChange(e.target.value)}
        />
      </div>
    </>
  );
}
