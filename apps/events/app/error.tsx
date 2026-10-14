"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { Container } from "@/components/page-header";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-20">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="We couldn't load this page. Try again, and if it keeps happening let us know."
        action={
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 hover:bg-chakra-400"
          >
            Try again
          </button>
        }
      />
    </Container>
  );
}
