import type { Metadata } from "next";
import { DirectoryHeader } from "@/components/directory/DirectoryHeader";
import { DirectoryProvider, PendingRegion } from "@/components/directory/DirectoryProvider";
import { DirectoryResults } from "@/components/directory/DirectoryResults";
import { FilterBar } from "@/components/directory/FilterBar";
import { homeHref, parseMoversWindow } from "@/components/directory/href";
import { MoversSection } from "@/components/directory/MoversSection";
import { getMarketStats } from "@/components/market/stats";
import { MOVERS_LIMIT } from "@/lib/market/constants";
import { DEFAULT_SORT, FINISH_LABEL, RARITY_LABEL } from "@/lib/market/labels";
import { directoryHref, parseMarketQuery, type SearchParamsRecord } from "@/lib/market/query";
import { getMarketRepository } from "@/lib/market/repository";

interface PageProps {
  searchParams: Promise<SearchParamsRecord>;
}

const DIRECTORY_ID = "directory";
const siteUrl = process.env.NEXT_PUBLIC_COMPARE_URL;

/**
 * Canonical link for a directory URL. Next resolves a canonical whose path is "/" against
 * metadataBase to the bare origin, dropping the query, so filter pages pass the finished
 * URL and opt out of that resolution (nothing else on these pages needs metadataBase).
 */
function canonical(href: string): Pick<Metadata, "alternates" | "metadataBase"> {
  if (href === "/") return { alternates: { canonical: "/" } };
  return { alternates: { canonical: siteUrl ? new URL(href, siteUrl).href : href }, metadataBase: null };
}

/**
 * Names the active filters (the root layout's title template appends the site name).
 * Searches, re-sorted lists and deeper pages are near-duplicates of the index, so they
 * stay out of search results but their links are still followed; filter-only pages are
 * real landing pages ("Parallel card prices") and are their own canonical.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = parseMarketQuery(await searchParams);
  const parts = [
    query.q ? `“${query.q}”` : null,
    ...(query.sets ?? []),
    ...(query.rarities ?? []).map((r) => RARITY_LABEL[r]),
    ...(query.finishes ?? []).map((f) => FINISH_LABEL[f]),
  ].filter((part): part is string => part !== null);
  const variant = Boolean(query.q) || (query.sort ?? DEFAULT_SORT) !== DEFAULT_SORT || (query.page ?? 1) > 1;
  return {
    ...(parts.length > 0 ? { title: `${parts.join(", ")} card prices` } : {}),
    ...canonical(variant ? "/" : directoryHref({ sets: query.sets, rarities: query.rarities, finishes: query.finishes })),
    ...(variant ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseMarketQuery(params);
  const moversWindow = parseMoversWindow(params.movers);
  const repo = getMarketRepository();
  const [page, facets, movers, stats] = await Promise.all([
    repo.queryCards(query),
    repo.getFacets(),
    repo.getMovers(moversWindow, MOVERS_LIMIT),
    getMarketStats(),
  ]);
  // The repository clamps out-of-range pages; links must build on the page actually shown.
  const shownQuery = { ...query, page: page.page };

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <DirectoryHeader cardCount={stats.cards} lastUpdated={stats.lastUpdatedAt} demoData={stats.demoData} />
      <DirectoryProvider query={shownQuery} movers={moversWindow} renderedHref={homeHref(query, moversWindow)}>
        <MoversSection movers={movers} window={moversWindow} />
        <section id={DIRECTORY_ID} aria-labelledby="directory-heading" className="mt-12 scroll-mt-20">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h2 id="directory-heading" className="text-xl font-semibold tracking-tight text-white">
              Card price index
            </h2>
            <p className="text-sm text-ash-400">Filter by set, rarity and finish, or search any card.</p>
          </div>
          <FilterBar facets={facets} />
          <PendingRegion region="results" className="mt-5">
            <DirectoryResults page={page} query={shownQuery} scrollTo={DIRECTORY_ID} />
          </PendingRegion>
        </section>
      </DirectoryProvider>
    </main>
  );
}
