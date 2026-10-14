import { formatCount } from "@/lib/market/format";
import { DEFAULT_SORT, SORT_OPTIONS } from "@/lib/market/labels";
import type { MarketPage, MarketQuery } from "@/lib/market/types";
import { DirectoryLink } from "./DirectoryProvider";
import { CLEAR_FILTERS, hasActiveFilters } from "./href";
import { Pagination } from "./Pagination";
import { ResultsList } from "./ResultsList";
import { ResultsTable } from "./ResultsTable";

function EmptyResults({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-shadow-500 bg-shadow-900/60 px-6 py-14 text-center">
      <p className="text-base font-semibold text-ash-200">
        {filtered ? "No cards match these filters" : "No cards are priced yet"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ash-400">
        {filtered
          ? "Check the spelling, search by set code or card number, or remove a filter."
          : "Prices appear here after the first ingestion run."}
      </p>
      {filtered && (
        <DirectoryLink
          patch={{ query: CLEAR_FILTERS }}
          region="results"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-chakra-500 px-4 text-sm font-semibold text-shadow-950 transition-colors hover:bg-chakra-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950"
        >
          Clear filters
        </DirectoryLink>
      )}
    </div>
  );
}

/** Result count, the table (md+) or stacked list, and pagination for one directory page. */
export function DirectoryResults({
  page,
  query,
  scrollTo,
}: {
  page: MarketPage;
  query: MarketQuery;
  scrollTo: string;
}) {
  const first = (page.page - 1) * page.pageSize + 1;
  const last = first + page.items.length - 1;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === (query.sort ?? DEFAULT_SORT))?.label ?? "";
  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p aria-live="polite" aria-atomic="true" className="text-sm text-ash-400">
          {page.total === 0 ? (
            "No matching cards"
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-ash-200 tabular-nums">
                {formatCount(first)}–{formatCount(last)}
              </span>{" "}
              of <span className="font-semibold text-ash-200 tabular-nums">{formatCount(page.total)}</span>{" "}
              {page.total === 1 ? "card" : "cards"}
            </>
          )}
        </p>
        <p className="hidden text-xs text-ash-400 sm:block">USD · Market = median across vendors</p>
      </div>
      {page.items.length === 0 ? (
        <EmptyResults filtered={hasActiveFilters(query)} />
      ) : (
        <>
          <ResultsTable
            items={page.items}
            caption={`Card prices sorted by ${sortLabel.toLowerCase()}, page ${page.page} of ${page.pageCount}`}
          />
          <ResultsList items={page.items} />
        </>
      )}
      <Pagination page={page} scrollTo={scrollTo} />
    </>
  );
}
