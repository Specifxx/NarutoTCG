"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { AlertIcon } from "@/components/home/icons";
import { StatusPage } from "@/components/home/status-page";
import { BUTTON_GHOST, BUTTON_PRIMARY } from "@/components/home/styles";
import { PageContainer } from "@/components/ui/page-header";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  // reset() alone only re-renders on the client; refreshing first re-fetches the server
  // payload, so errors thrown while rendering a Server Component can recover too.
  const retry = () =>
    startRetry(() => {
      router.refresh();
      reset();
    });

  useEffect(() => {
    console.error(error);
    titleRef.current?.focus();
  }, [error]);

  return (
    <PageContainer>
      <StatusPage
        mark={
          <span className="inline-flex items-center gap-2 rounded-full border border-status-critical/60 bg-shadow-900 px-3 py-1 text-sm font-semibold text-ash-100">
            <AlertIcon className="h-4 w-4 text-status-critical" />
            Error
          </span>
        }
        eyebrow="Something went wrong"
        title="This page failed to load"
        titleRef={titleRef}
        actions={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={retry} aria-busy={retrying} className={BUTTON_PRIMARY}>
              {retrying ? "Trying again…" : "Try again"}
            </button>
            <Link href="/" className={BUTTON_GHOST}>
              Back to the overview
            </Link>
          </div>
        }
      >
        <p>
          An unexpected error stopped this page from rendering. Trying again usually helps; data you imported in this browser is
          not affected.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-ash-500">
            Reference: <code className="font-mono text-ash-300">{error.digest}</code>
          </p>
        )}
      </StatusPage>
    </PageContainer>
  );
}
