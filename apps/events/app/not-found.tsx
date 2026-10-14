import { Compass } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Container } from "@/components/page-header";

export default function NotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon={Compass}
        title="This path leads nowhere"
        description="The event or store you were looking for may have ended, moved or never existed."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/events"
              className="rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 hover:bg-chakra-400"
            >
              Browse events
            </Link>
            <Link
              href="/stores"
              className="rounded-md border border-shadow-500 px-4 py-2 text-sm font-semibold text-ash-200 hover:border-chakra-400 hover:text-chakra-400"
            >
              Find a store
            </Link>
          </div>
        }
      />
    </Container>
  );
}
