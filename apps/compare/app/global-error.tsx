"use client";

import { SiteHeader } from "@naruto-tcg/ui";
import "./globals.css";

/**
 * Last-resort boundary for failures in the root layout itself; it replaces the whole
 * document, so it brings its own <html>, styles and header. Retrying reloads the page:
 * the root failed, so the server render and the client bundle are both re-requested.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <title>Something went wrong · Naruto TCG Price Compare</title>
        <SiteHeader current="compare" />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-xl py-12 text-center sm:py-20">
            <div role="alert">
              <p className="text-xs font-semibold tracking-[0.18em] text-chakra-400 uppercase">Something went wrong</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                The price tracker hit a problem
              </h1>
              <p className="mt-3 text-base leading-relaxed text-ash-400">
                Prices are temporarily unavailable. Reload to try again, or head back to the price directory.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-10 items-center rounded-lg bg-chakra-500 px-4 text-sm font-semibold text-shadow-950 transition-colors hover:bg-chakra-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-ash-200 transition-colors hover:bg-shadow-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
              >
                Go to the price directory
              </a>
            </div>
            {error.digest && <p className="mt-8 text-xs text-ash-400">Reference: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
