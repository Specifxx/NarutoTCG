import { Clock, Gift, ListChecks, Megaphone, RefreshCw, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/page-header";
import { SubmitWizard } from "@/components/submit/submit-wizard";
import { getStores } from "@/lib/data";
import { EVENT_TYPES } from "@/lib/event-meta";
import { cx, placeLabel } from "@/lib/format";
import { surface } from "@/lib/styles";
import { REVIEW_BUSINESS_DAYS, type SubmissionStoreOption } from "@/lib/submission";

export const metadata: Metadata = {
  title: "Submit an event",
  description: `List your Naruto TCG demo day, weekly league or tournament. For local game store owners and organisers — every listing is reviewed within ${REVIEW_BUSINESS_DAYS} business days.`,
  alternates: { canonical: "/events/submit" },
};

const TIPS: readonly { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Megaphone,
    title: "A specific title",
    text: "Say what and where: “Starter Deck Battle at Hidden Leaf Games” beats “Naruto night”.",
  },
  {
    icon: ListChecks,
    title: "What to bring",
    text: "Deck rules, loaner decks, sleeves, and whether complete beginners are welcome.",
  },
  {
    icon: Clock,
    title: "Venue-local times",
    text: "Enter times as they are at the venue. We convert them for players browsing from elsewhere.",
  },
  {
    icon: Users,
    title: "A realistic cap",
    text: "Match it to your seats. Online sign-ups move to a waitlist automatically once you're full.",
  },
  {
    icon: Gift,
    title: "Promos & prizes",
    text: "Promo cards, playmats and raffles are the top reason players choose one event over another.",
  },
  {
    icon: RefreshCw,
    title: "Keep it current",
    text: "Postponed or cancelled? Reply to your confirmation email and we'll update the listing.",
  },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SubmitEventPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ store }, stores] = await Promise.all([searchParams, getStores()]);

  const options: SubmissionStoreOption[] = stores
    .filter((s) => s.verified)
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      city: s.address.city,
      country: s.address.country,
      timeZone: s.timeZone,
      region: s.region,
      place: placeLabel(s.address),
    }));
  const preselectedStore = typeof store === "string" && options.some((o) => o.slug === store) ? store : undefined;

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Organised play"
        title="Submit an event"
        description={`For local game store owners and tournament organisers. List a demo day, weekly league or tournament and our team will review it within ${REVIEW_BUSINESS_DAYS} business days.`}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-shadow-700 bg-shadow-900/80 px-3 py-1.5 text-sm text-ash-200">
            <Clock className="h-4 w-4 text-chakra-400" aria-hidden="true" />
            About 5 minutes
          </span>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
        <SubmitWizard stores={options} preselectedStore={preselectedStore} />

        <aside aria-label="Listing guidance" className="space-y-6">
          <section aria-labelledby="submit-tips" className={surface.panel}>
            <h2 id="submit-tips" className="text-base font-semibold text-white">
              What makes a great listing
            </h2>
            <ul className="mt-4 space-y-4">
              {TIPS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-chakra-500/10 text-chakra-400">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ash-200">{title}</p>
                    <p className="mt-0.5 text-sm text-ash-400">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="submit-types" className={surface.panel}>
            <h2 id="submit-types" className="text-base font-semibold text-white">
              Which event type?
            </h2>
            <p className="mt-1 text-sm text-ash-400">Players filter by type, so pick the closest match.</p>
            <ul className="mt-4 space-y-4">
              {EVENT_TYPES.map((meta) => {
                const Icon = meta.icon;
                return (
                  <li key={meta.type} className="flex gap-3">
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                        meta.classes.bg,
                        meta.classes.border,
                        meta.classes.text,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className={cx("text-sm font-semibold", meta.classes.text)}>{meta.label}</p>
                      <p className="mt-0.5 text-sm text-ash-400">{meta.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </Container>
  );
}
