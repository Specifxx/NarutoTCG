"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useOptimistic,
  useRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cx } from "@naruto-tcg/ui";
import type { MarketQuery } from "@/lib/market/types";
import { homeHref, type MoversWindow } from "./href";

/** Parts of the page that dim while a navigation they started is in flight. */
export type DirectoryRegion = "results" | "movers";

export interface DirectoryState {
  query: MarketQuery;
  movers: MoversWindow;
}

/** Shallow patch merged into the latest (possibly still pending) state. */
export interface DirectoryPatch {
  query?: Partial<MarketQuery>;
  movers?: MoversWindow;
}

export interface NavigateOptions {
  region: DirectoryRegion;
  /** Add a history entry (pagination) instead of replacing the current one (filters). */
  push?: boolean;
  /** Id of an element to bring back into view if it has scrolled above the viewport. */
  scrollTo?: string;
}

interface ViewState extends DirectoryState {
  /** The region whose navigation is in flight; reverts to null when the transition settles. */
  busy: DirectoryRegion | null;
}

interface DirectoryContextValue extends ViewState {
  navigate: (patch: DirectoryPatch, options: NavigateOptions) => void;
}

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

export function useDirectory(): DirectoryContextValue {
  const value = useContext(DirectoryContext);
  if (!value) throw new Error("useDirectory must be used inside <DirectoryProvider>");
  return value;
}

function merge(state: DirectoryState, patch: DirectoryPatch): DirectoryState {
  return { query: { ...state.query, ...patch.query }, movers: patch.movers ?? state.movers };
}

/**
 * Client navigation for the directory. The URL stays the single source of truth:
 * every change is a router navigation inside a transition. The target state is
 * applied optimistically, so quick successive changes (ticking several checkboxes,
 * typing while results load) build on each other rather than on the last server render.
 */
export function DirectoryProvider({ query, movers, children }: DirectoryState & { children: ReactNode }) {
  const router = useRouter();
  const [state, setOptimisticState] = useOptimistic<ViewState>({ query, movers, busy: null });
  const latest = useRef<DirectoryState>(state);

  useEffect(() => {
    latest.current = { query: state.query, movers: state.movers };
  }, [state]);

  const navigate = useCallback(
    (patch: DirectoryPatch, { region: target, push = false, scrollTo }: NavigateOptions) => {
      const next = merge(latest.current, patch);
      latest.current = next;
      const href = homeHref(next.query, next.movers);
      if (scrollTo) {
        const element = document.getElementById(scrollTo);
        if (element && element.getBoundingClientRect().top < 0) element.scrollIntoView({ block: "start" });
      }
      startTransition(() => {
        setOptimisticState({ ...next, busy: target });
        if (push) router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      });
    },
    [router, setOptimisticState],
  );

  return <DirectoryContext.Provider value={{ ...state, navigate }}>{children}</DirectoryContext.Provider>;
}

/** Dims its (server-rendered) children and marks them busy while their region is updating. */
export function PendingRegion({
  region,
  className,
  children,
  ...props
}: { region: DirectoryRegion } & HTMLAttributes<HTMLDivElement>) {
  const { busy } = useDirectory();
  const pending = busy === region;
  return (
    <div
      {...props}
      aria-busy={pending}
      className={cx("transition-opacity duration-200", pending && "opacity-50 delay-100", className)}
    >
      {children}
    </div>
  );
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * A real link to a directory state (works without JavaScript and in new tabs);
 * plain clicks navigate through the provider so the target region shows progress.
 * Not prefetched: the target differs only in search params and renders on demand.
 */
export function DirectoryLink({
  patch,
  region,
  push,
  scrollTo,
  onClick,
  ...props
}: { patch: DirectoryPatch } & NavigateOptions & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const directory = useDirectory();
  const target = merge(directory, patch);
  return (
    <Link
      {...props}
      href={homeHref(target.query, target.movers)}
      prefetch={false}
      scroll={false}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !isPlainClick(event)) return;
        event.preventDefault();
        directory.navigate(patch, { region, push, scrollTo });
      }}
    />
  );
}
