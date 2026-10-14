import { CalendarX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Container } from "@/components/page-header";
import { button } from "@/lib/styles";

export default function EventNotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon={CalendarX}
        title="We couldn't find that event"
        description="It may have been removed by the organiser, or the link may be mistyped. Browse upcoming events or find a store near you instead."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/events" className={button.primary}>
              Browse events
            </Link>
            <Link href="/events/map" className={button.secondary}>
              Open the map
            </Link>
          </div>
        }
      />
    </Container>
  );
}
