import type { EventType } from "@naruto-tcg/types";
import { Hourglass, Star } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/event-card";
import type { EventSummary } from "@/lib/event-summary";

/** Marquee event types, in order of prominence. */
const FEATURED_TYPES: readonly EventType[] = ["convention-showcase", "regional", "premier-demo"];

/**
 * Up to `limit` featured events: the soonest of each marquee type first (for
 * variety), then the next soonest of any of them. Expects upcoming, non-cancelled
 * events sorted by start time.
 */
export function pickFeatured(upcoming: EventSummary[], limit = 3): EventSummary[] {
  const candidates = upcoming.filter((e) => FEATURED_TYPES.includes(e.type));
  const picked: EventSummary[] = [];
  for (const type of FEATURED_TYPES) {
    const first = candidates.find((e) => e.type === type);
    if (first) picked.push(first);
  }
  for (const event of candidates) {
    if (picked.length >= limit) break;
    if (!picked.includes(event)) picked.push(event);
  }
  return picked.slice(0, limit).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Compact strip of marquee events: swipeable on small screens, three columns on desktop. Server component. */
export function FeaturedEvents({ events }: { events: EventSummary[] }) {
  if (events.length === 0) return null;
  return (
    <section aria-labelledby="featured-events" className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2
          id="featured-events"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ash-400"
        >
          <Star className="h-3.5 w-3.5 text-chakra-400" aria-hidden="true" />
          Featured
        </h2>
        <Link
          href="/countdowns"
          className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-ash-400 transition-colors hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
        >
          <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
          Countdowns
        </Link>
      </div>
      <ul className="relative -mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:thin] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {events.map((event) => (
          <li key={event.id} className="w-[19.5rem] shrink-0 snap-start sm:w-[22rem] lg:w-auto">
            <EventCard event={event} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
