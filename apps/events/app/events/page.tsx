import { EventCard } from "@/components/event-card";
import { Container, PageHeader } from "@/components/page-header";
import { getUpcomingEventSummaries } from "@/lib/data";

export default async function EventsPage() {
  const events = await getUpcomingEventSummaries();
  return (
    <Container className="py-10">
      <PageHeader eyebrow="Placeholder" title="Events" />
      <div className="mt-6 grid gap-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </Container>
  );
}
