import { CalendarDays, Hourglass, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CountdownCard } from "@/components/countdowns/countdown-card";
import { EmbedPreview } from "@/components/countdowns/embed-preview";
import { FeaturedCountdown } from "@/components/countdowns/featured-countdown";
import { EmptyState } from "@/components/empty-state";
import { Container, PageHeader, SectionHeading } from "@/components/page-header";
import { pluralize } from "@/lib/format";
import { getMilestones, pickFeaturedMilestone } from "@/lib/milestones";
import { button } from "@/lib/styles";

// Milestones drop off once they end; re-render often enough that stale ones vanish quickly.
export const revalidate = 300;

const DESCRIPTION = "Live timers for the biggest moments in Naruto TCG organised play";

export const metadata: Metadata = {
  title: "Countdowns",
  description: `${DESCRIPTION}: Bandai Card Games Fest stops, set releases, pre-releases and championship seasons.`,
  alternates: { canonical: "/countdowns" },
};

/** How many milestones the embeddable-badge demo shows. */
const EMBED_SAMPLE_SIZE = 4;

export default async function CountdownsPage() {
  const milestones = await getMilestones(new Date());
  const featured = pickFeaturedMilestone(milestones);
  const rest = milestones.filter((m) => m !== featured);

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Mark your calendar"
        title="Countdowns"
        description={DESCRIPTION}
        actions={
          <Link href="/events" className={button.secondary}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Browse all events
          </Link>
        }
      />

      {featured ? (
        <>
          <p className="mt-6 flex items-start gap-2 text-sm text-ash-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Dates and times are shown in each venue&apos;s local time zone. Every timer counts down to the same moment
            worldwide.
          </p>

          <FeaturedCountdown milestone={featured} className="mt-6" />

          {rest.length > 0 && (
            <section aria-labelledby="coming-up-heading" className="mt-12">
              <SectionHeading
                id="coming-up-heading"
                title="Coming up"
                description={`${pluralize(rest.length, "more milestone")}, soonest first.`}
              />
              <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((milestone) => (
                  <li key={milestone.id} className="min-w-0">
                    <CountdownCard milestone={milestone} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <EmbedPreview milestones={milestones.slice(0, EMBED_SAMPLE_SIZE)} className="mt-14" />
        </>
      ) : (
        <EmptyState
          className="mt-8"
          headingLevel={2}
          icon={Hourglass}
          title="No countdowns right now"
          description="Every announced milestone has wrapped up. New Bandai Card Games Fest stops, releases and championships appear here as soon as they're announced."
          action={
            <Link href="/events" className={button.primary}>
              Find events near you
            </Link>
          }
        />
      )}
    </Container>
  );
}
