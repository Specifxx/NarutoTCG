import type { Metadata, ResolvingMetadata } from "next";
import { DirectoryHeader } from "@/components/directory/DirectoryHeader";
import { DirectoryProvider, PendingRegion } from "@/components/directory/DirectoryProvider";
import { DirectoryResults } from "@/components/directory/DirectoryResults";
import { FilterBar } from "@/components/directory/FilterBar";
import { parseMoversWindow } from "@/components/directory/href";
import { MoversSection } from "@/components/directory/MoversSection";
import { MOVERS_LIMIT } from "@/lib/market/constants";
import { FINISH_LABEL, RARITY_LABEL } from "@/lib/market/labels";
import { parseMarketQuery, type SearchParamsRecord } from "@/lib/market/query";
import { getMarketRepository } from "@/lib/market/repository";

interface PageProps {
  searchParams: Promise<SearchParamsRecord>;
}

const DIRECTORY_ID = "directory";

/** Names the active filters. The layout's title template skips its own segment, so the site title is appended here. */
export async function generateMetadata({ searchParams }: PageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const query = parseMarketQuery(await searchParams);
  const parts = [
    query.q ? `“${query.q}”` : null,
    ...(query.sets ?? []),
    ...(query.rarities ?? []).map((r) => RARITY_LABEL[r]),
    ...(query.finishes ?? []).map((f) => FINISH_LABEL[f]),
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return {};
  const site = (await parent).title?.absolute;
  return { title: [`${parts.join(", ")} card prices`, site].filter(Boolean).join(" · ") };
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
    repo.getStats(),
  ]);
  // The repository clamps out-of-range pages; links must build on the page actually shown.
  const shownQuery = { ...query, page: page.page };

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <DirectoryHeader cardCount={stats.cards} lastUpdated={stats.lastUpdatedAt} mode={repo.mode} />
      <DirectoryProvider query={shownQuery} movers={moversWindow}>
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
