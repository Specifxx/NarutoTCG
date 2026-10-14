"use client";

import { usePathname } from "next/navigation";
import { DirectoryPageSkeleton } from "@/components/directory/directory-skeleton";
import { Container } from "@/components/page-header";

/**
 * Loading state for the /events segment. This boundary also covers nested routes
 * (/events/[id], /events/map, /events/submit) that don't define their own
 * loading.tsx, so only the directory gets the directory-shaped skeleton.
 */
export default function EventsLoading() {
  const pathname = usePathname();
  return (
    <Container className="py-8 sm:py-10">
      {pathname === "/events" ? (
        <DirectoryPageSkeleton />
      ) : (
        <div role="status" aria-live="polite" className="space-y-4">
          <span className="sr-only">Loading…</span>
          <div className="h-3 w-28 rounded-md bg-shadow-800 motion-safe:animate-pulse" aria-hidden="true" />
          <div className="h-10 w-80 max-w-full rounded-md bg-shadow-800 motion-safe:animate-pulse" aria-hidden="true" />
          <div
            className="h-64 rounded-xl border border-shadow-700 bg-shadow-900/80 motion-safe:animate-pulse"
            aria-hidden="true"
          />
        </div>
      )}
    </Container>
  );
}
