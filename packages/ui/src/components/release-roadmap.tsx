import { useId } from "react";
import {
  GLOBAL_LAUNCH_LABEL,
  RELEASE_PHASES,
  getReleaseStatus,
  type ReleaseAppId,
  type ReleaseStatus,
} from "../release-schedule";

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const STATUS_STYLES: Record<ReleaseStatus, { badge: string; node: string; segment: string }> = {
  LOCKED: {
    badge: "border-shadow-500 text-ash-400",
    node: "border-shadow-500 bg-shadow-950",
    segment: "bg-shadow-700",
  },
  "IN DEVELOPMENT": {
    badge: "border-chakra-600 text-chakra-400",
    node: "border-chakra-500 bg-shadow-950",
    segment: "bg-chakra-600/50",
  },
  "LIVE IN PREVIEW": {
    badge: "border-chakra-500 bg-chakra-500 text-shadow-950",
    node: "border-chakra-400 bg-chakra-500",
    segment: "bg-chakra-500",
  },
};

function StatusIcon({ status }: { status: ReleaseStatus }) {
  if (status === "LOCKED") {
    return (
      <svg aria-hidden="true" viewBox="0 0 12 12" className="size-2.5" fill="currentColor">
        <path d="M3.5 5V3.75a2.5 2.5 0 0 1 5 0V5h.25c.69 0 1.25.56 1.25 1.25v3.5c0 .69-.56 1.25-1.25 1.25h-5.5C2.56 11 2 10.44 2 9.75v-3.5C2 5.56 2.56 5 3.25 5h.25Zm1.25 0h2.5V3.75a1.25 1.25 0 0 0-2.5 0V5Z" />
      </svg>
    );
  }
  if (status === "IN DEVELOPMENT") {
    return (
      <span aria-hidden="true" className="relative flex size-1.5">
        <span className="absolute inline-flex size-full rounded-full bg-chakra-400 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex size-1.5 rounded-full bg-chakra-400" />
      </span>
    );
  }
  return <span aria-hidden="true" className="size-1.5 rounded-full bg-shadow-950" />;
}

export function ReleaseStatusBadge({ status, className }: { status: ReleaseStatus; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em]",
        STATUS_STYLES[status].badge,
        className,
      )}
    >
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

export interface ReleaseRoadmapProps {
  /** The app rendering the roadmap; it is marked "You are here". */
  current?: ReleaseAppId;
  /** Reference time for statuses. Defaults to render time. */
  now?: Date;
  className?: string;
}

export function ReleaseRoadmap({ current, now = new Date(), className }: ReleaseRoadmapProps) {
  const headingId = useId();
  const phases = RELEASE_PHASES.map((p) => ({
    ...p,
    releases: p.releases.map((r) => ({ ...r, status: getReleaseStatus(r, now) })),
  }));
  const releases = phases.flatMap((p) => p.releases);
  const live = releases.filter((r) => r.status === "LIVE IN PREVIEW").length;
  const building = releases.filter((r) => r.status === "IN DEVELOPMENT").length;

  return (
    <section aria-labelledby={headingId} className={cx("border-t border-shadow-700 bg-shadow-900/70", className)}>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-chakra-400">Mission Log</p>
            <h2 id={headingId} className="mt-2 text-2xl font-bold tracking-tight text-white">
              Platform Status &amp; Upcoming Releases
            </h2>
            <p className="mt-1 text-sm text-ash-400">
              Our rollout to Bandai&rsquo;s global launch of the Naruto Card Game &middot; {GLOBAL_LAUNCH_LABEL}
            </p>
          </div>
          <p className="text-sm text-ash-400">
            <span className="font-semibold text-white">{live}</span> live &middot;{" "}
            <span className="font-semibold text-white">{building}</span> in development &middot;{" "}
            <span className="font-semibold text-white">{releases.length}</span> total
          </p>
        </header>

        <div aria-hidden="true" className="mt-6 flex gap-1">
          {releases.map((r) => (
            <span key={r.app} className={cx("h-1 flex-1 rounded-full", STATUS_STYLES[r.status].segment)} />
          ))}
        </div>

        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {phases.map((phase) => (
            <li key={phase.phase}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ash-400">
                Phase {phase.phase} &middot; {phase.window}
              </p>
              <h3 className="mt-1 font-semibold text-white">{phase.title}</h3>

              <ol className="relative mt-5 space-y-6 before:absolute before:bottom-2 before:left-[5.5px] before:top-2 before:w-px before:bg-shadow-700">
                {phase.releases.map((r) => (
                  <li key={r.app} className="relative pl-7">
                    <span
                      aria-hidden="true"
                      className={cx(
                        "absolute left-0 top-1.5 size-3 rounded-full border-2",
                        STATUS_STYLES[r.status].node,
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className={cx("font-semibold", r.app === current ? "text-chakra-400" : "text-white")}>
                        {r.name}
                      </span>
                      <ReleaseStatusBadge status={r.status} className="ml-auto" />
                    </div>
                    <p className="mt-1 font-mono text-xs text-ash-400">
                      apps/{r.app} &middot;{" "}
                      <time dateTime={r.targetDate}>{dateFormat.format(Date.parse(r.targetDate))}</time>
                    </p>
                    <p className="mt-1.5 text-sm text-ash-200">{r.focus}</p>
                    {r.note && <p className="mt-1 text-xs text-ash-400">{r.note}</p>}
                    {r.app === current && (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-chakra-400">
                        You are here
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-xs text-ash-400">
          Target dates are planning estimates. Status as of{" "}
          <time dateTime={now.toISOString()}>{dateFormat.format(now)}</time>.
        </p>
      </div>
    </section>
  );
}
