"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { ChevronLeftIcon } from "@/components/directory/icons";

/**
 * Error boundary for every page under the root layout (directory and card pages), so a
 * failing price source shows a recoverable panel between the normal header and footer.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // The failure happened in a server render: refetch it, then clear the boundary in the same transition.
  const retry = () =>
    startRetry(() => {
      router.refresh();
      reset();
    });

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl py-12 text-center sm:py-20">
        {/* Announced when a client navigation lands here; the controls stay outside the alert. */}
        <div role="alert">
          <p className="text-xs font-semibold tracking-[0.18em] text-chakra-400 uppercase">Something went wrong</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Prices are temporarily unavailable
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ash-400">
            We couldn&apos;t load market data just now. This is usually brief — try again in a moment.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={retrying ? undefined : retry}
            aria-disabled={retrying || undefined}
            className="inline-flex h-10 items-center rounded-lg bg-chakra-500 px-4 text-sm font-semibold text-shadow-950 transition-colors hover:bg-chakra-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950 aria-disabled:cursor-wait aria-disabled:opacity-70"
          >
            {retrying ? "Retrying…" : "Try again"}
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-ash-200 transition-colors hover:bg-shadow-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <ChevronLeftIcon className="size-4" />
            Back to the price directory
          </Link>
        </div>
        {error.digest && <p className="mt-8 text-xs text-ash-400">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
