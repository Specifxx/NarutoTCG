import { useLayoutEffect } from "react";

/** The root layout's title template suffix ("%s · Naruto TCG Decks"). */
export const TITLE_SUFFIX = " · Naruto TCG Decks";

/**
 * Sets the tab title for a page whose subject only exists in this browser (an imported event or
 * player), and keeps it set while the component is mounted. `null` leaves the server title alone.
 *
 * A one-shot `document.title` write is not enough: on a hard load Next commits the route's
 * streamed metadata <title> after hydration, and React writes the generic server title back
 * into that element. A React 19 <title> rendered here would not win either: React inserts each
 * newly mounted title before the existing ones, so the metadata title, mounting later, comes
 * first. So the title is re-applied whenever <head> changes. The observer is disconnected in a
 * layout-effect cleanup, which runs inside the commit that unmounts the page, before the next
 * route's title mutation could be delivered to it.
 */
export function useClientTitle(title: string | null): void {
  useLayoutEffect(() => {
    if (title === null) return;
    const full = `${title}${TITLE_SUFFIX}`;
    const apply = () => {
      if (document.title !== full) document.title = full;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}
