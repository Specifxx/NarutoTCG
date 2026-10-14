import { cx } from "@naruto-tcg/ui";
import type { MarketPage } from "@/lib/market/types";
import { DirectoryLink } from "./DirectoryProvider";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { pageItems } from "./page-items";

const control =
  "inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";
const idle = "border border-shadow-700 bg-shadow-900 text-ash-200 hover:border-shadow-500 hover:bg-shadow-800";

function StepLink({
  page,
  direction,
  scrollTo,
}: {
  page: number | null;
  direction: "prev" | "next";
  scrollTo: string;
}) {
  const label = direction === "prev" ? "Previous" : "Next";
  const content =
    direction === "prev" ? (
      <>
        <ChevronLeftIcon className="size-4" />
        {label}
      </>
    ) : (
      <>
        {label}
        <ChevronRightIcon className="size-4" />
      </>
    );
  const className = cx(control, "gap-1 px-3");
  if (page === null) {
    return (
      <span aria-disabled="true" className={cx(className, "border border-shadow-700 text-ash-400 opacity-60")}>
        {content}
      </span>
    );
  }
  return (
    <DirectoryLink
      patch={{ query: { page } }}
      region="results"
      push
      scrollTo={scrollTo}
      rel={direction}
      className={cx(className, idle)}
    >
      {content}
    </DirectoryLink>
  );
}

/** Prev / numbered / Next links. Pages are real URLs; the provider keeps the results region in place while loading. */
export function Pagination({ page, scrollTo }: { page: MarketPage; scrollTo: string }) {
  if (page.pageCount <= 1) return null;
  const current = page.page;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 sm:justify-center">
      <StepLink page={current > 1 ? current - 1 : null} direction="prev" scrollTo={scrollTo} />
      <ol className="hidden items-center gap-1 sm:flex">
        {pageItems(current, page.pageCount).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden className="w-8 text-center text-ash-400">
              …
            </li>
          ) : (
            <li key={item}>
              <DirectoryLink
                patch={{ query: { page: item } }}
                region="results"
                push
                scrollTo={scrollTo}
                aria-label={`Page ${item}`}
                aria-current={item === current ? "page" : undefined}
                className={cx(
                  control,
                  "min-w-10 px-2",
                  item === current ? "bg-chakra-500 font-semibold text-shadow-950" : idle,
                )}
              >
                {item}
              </DirectoryLink>
            </li>
          ),
        )}
      </ol>
      <p className="text-sm text-ash-400 tabular-nums sm:hidden">
        Page {current} of {page.pageCount}
      </p>
      <StepLink page={current < page.pageCount ? current + 1 : null} direction="next" scrollTo={scrollTo} />
    </nav>
  );
}
