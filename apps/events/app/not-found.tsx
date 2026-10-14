import { Compass } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Container } from "@/components/page-header";
import { button } from "@/lib/styles";

export default function NotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon={Compass}
        headingLevel={1}
        title="This path leads nowhere"
        description="The event or store you were looking for may have ended, moved or never existed."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/events"
              className={button.primary}
            >
              Browse events
            </Link>
            <Link
              href="/stores"
              className={button.secondary}
            >
              Find a store
            </Link>
          </div>
        }
      />
    </Container>
  );
}
