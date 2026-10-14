"use client";

// Pre-hydration guard for /cards. The page is static, so its HTML always holds
// the unfiltered default results; the URL (and a stored list view) is applied
// only once React runs. A tiny inline script flags <html> before first paint
// when that will change the results, the results stay hidden while the flag is
// set (browser.module.css `.pending`), and useBrowserState clears it as soon
// as the URL state is rendered. Without JavaScript nothing is flagged and the
// unfiltered list shows.
import { useSyncExternalStore } from "react";
import { URL_PARAM_KEYS } from "@/lib/search";

/** localStorage key of the preferred results layout. */
export const VIEW_STORAGE_KEY = "naruto-tcg:cards:view";

/** Set on <html> while the static results do not reflect the URL yet. */
const PENDING_ATTRIBUTE = "data-cards-pending";

/** Reveal the static results anyway if the app never starts (e.g. a script failed to load). */
const PENDING_TIMEOUT_MS = 10_000;

const PENDING_SCRIPT = `(function(){var r=document.documentElement,p=new URLSearchParams(location.search),f=${JSON.stringify(
  URL_PARAM_KEYS,
)}.some(function(k){return p.has(k)});if(!f)try{f=localStorage.getItem(${JSON.stringify(
  VIEW_STORAGE_KEY,
)})==="list"}catch(e){}if(!f)return;r.setAttribute("${PENDING_ATTRIBUTE}","");setTimeout(function(){r.removeAttribute("${PENDING_ATTRIBUTE}")},${PENDING_TIMEOUT_MS})})()`;

/** End the pre-hydration guard once the URL state has been rendered. */
export function clearPendingResults(): void {
  document.documentElement.removeAttribute(PENDING_ATTRIBUTE);
}

const subscribe = () => () => {};

/**
 * Render right before the browser. Only the server HTML needs the script:
 * one created by a client render never runs (and React warns about it), so it
 * renders during SSR and hydration only, via the server snapshot.
 */
export function PendingResultsScript() {
  const serverHtml = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );
  return serverHtml ? <script dangerouslySetInnerHTML={{ __html: PENDING_SCRIPT }} /> : null;
}
