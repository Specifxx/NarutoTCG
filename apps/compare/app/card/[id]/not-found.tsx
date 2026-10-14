import Form from "next/form";
import Link from "next/link";
import { ChevronLeftIcon, SearchIcon } from "@/components/directory/icons";
import { MAX_QUERY_LENGTH } from "@/lib/market/constants";

export default function CardNotFound() {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl py-12 text-center sm:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-chakra-400 uppercase">404 · Card not found</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          We couldn&apos;t find that card
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ash-400">
          The link may be mistyped, or the printing is no longer tracked. Search the directory by name, set code or card
          number instead.
        </p>
        <Form action="/" className="mx-auto mt-8 flex max-w-md gap-2">
          <label htmlFor="not-found-search" className="sr-only">
            Search cards
          </label>
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ash-400" />
            <input
              id="not-found-search"
              name="q"
              type="search"
              maxLength={MAX_QUERY_LENGTH}
              placeholder="e.g. Kakashi or NTG01 004"
              className="h-10 w-full rounded-lg border border-shadow-700 bg-shadow-900 pr-3 pl-9 text-sm text-ash-200 placeholder:text-ash-400 focus:border-chakra-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-lg bg-chakra-500 px-4 text-sm font-semibold text-shadow-950 transition-colors hover:bg-chakra-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950"
          >
            Search
          </button>
        </Form>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-ash-200 transition-colors hover:bg-shadow-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
        >
          <ChevronLeftIcon className="size-4" />
          Back to the price directory
        </Link>
      </div>
    </main>
  );
}
