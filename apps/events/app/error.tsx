"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { Container } from "@/components/page-header";
import { button } from "@/lib/styles";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-20">
      <EmptyState
        icon={TriangleAlert}
        headingLevel={1}
        title="Something went wrong"
        description="We couldn't load this page. Try again, and if it keeps happening let us know."
        action={
          <button
            type="button"
            onClick={reset}
            className={button.primary}
          >
            Try again
          </button>
        }
      />
    </Container>
  );
}
