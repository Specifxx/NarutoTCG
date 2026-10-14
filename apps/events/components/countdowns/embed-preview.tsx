import { Code, Store } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/page-header";
import { cx } from "@/lib/format";
import { milestoneLink, type Milestone } from "@/lib/milestones";
import { surface } from "@/lib/styles";
import { CountdownBadge } from "./countdown-timer";
import { timingOf } from "./milestone-parts";

const focusRing =
  "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950";

function usageSnippet(milestone: Milestone): string {
  return [
    `import { CountdownBadge } from "@/components/countdowns/countdown-timer";`,
    ``,
    `<CountdownBadge`,
    `  label="${milestone.shortTitle}"`,
    `  description="${milestone.display.description}"`,
    `  timing={{`,
    `    startsAt: "${milestone.startsAt}",`,
    `    endsAt: "${milestone.endsAt}",`,
    `  }}`,
    `/>`,
  ].join("\n");
}

/** Shows the compact badge variant in a mock host page, plus how to drop it in elsewhere. */
export function EmbedPreview({ milestones, className }: { milestones: Milestone[]; className?: string }) {
  const [sample] = milestones;
  if (!sample) return null;

  return (
    <section aria-labelledby="embed-heading" className={className}>
      <SectionHeading
        id="embed-heading"
        title="Embeddable widget"
        description="The compact badge runs on the same timer engine as this page. Drop it into store pages, event cards or stream overlays."
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className={cx(surface.panel, "min-w-0")}>
          <p className="text-xs font-semibold uppercase tracking-wider text-ash-400">Preview</p>
          <div className="mt-3 rounded-lg border border-dashed border-shadow-500/70 bg-shadow-950/60 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-shadow-800 text-chakra-400">
                <Store className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Your store page</p>
                <p className="text-xs text-ash-400">Upcoming big moments</p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {milestones.map((milestone) => {
                const badge = (
                  <CountdownBadge
                    timing={timingOf(milestone)}
                    label={milestone.shortTitle}
                    description={milestone.display.description}
                  />
                );
                const link = milestoneLink(milestone);
                return (
                  <li key={milestone.id} className="max-w-full">
                    {link && !link.external ? (
                      <Link href={link.href} className={cx("inline-flex max-w-full", focusRing)}>
                        {badge}
                      </Link>
                    ) : (
                      badge
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className={cx(surface.panel, "min-w-0")}>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ash-400">
            <Code className="h-3.5 w-3.5" aria-hidden="true" />
            Usage
          </p>
          <pre
            tabIndex={0}
            aria-label="Example code for the countdown badge"
            className="mt-3 overflow-x-auto rounded-lg border border-shadow-700 bg-shadow-950 p-4 text-xs leading-relaxed text-ash-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <code>{usageSnippet(sample)}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
