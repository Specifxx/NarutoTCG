export type PageItem = number | "gap";

/**
 * Page numbers for a pagination bar: the first and last page plus `siblings`
 * pages either side of the current one. A run of skipped pages becomes a gap,
 * except a single skipped page, which is shown (a gap would hide no more than it).
 */
export function pageItems(current: number, count: number, siblings = 1): PageItem[] {
  const pages = new Set<number>([1, count]);
  for (let page = current - siblings; page <= current + siblings; page++) {
    if (page >= 1 && page <= count) pages.add(page);
  }
  const items: PageItem[] = [];
  let previous = 0;
  for (const page of [...pages].sort((a, b) => a - b)) {
    if (page - previous === 2) items.push(previous + 1);
    else if (page - previous > 2) items.push("gap");
    items.push(page);
    previous = page;
  }
  return items;
}
