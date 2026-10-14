import { cx } from "@/lib/format";

function Bone({ className }: { className?: string }) {
  return <div className={cx("rounded-md bg-shadow-800 motion-safe:animate-pulse", className)} />;
}

function CardSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-shadow-700 bg-shadow-900/80 p-4">
      <Bone className="h-[4.5rem] w-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex gap-1.5">
          <Bone className="h-5 w-24 rounded-full" />
          <Bone className="h-5 w-20 rounded-full" />
        </div>
        <Bone className="h-5 w-3/4" />
        <Bone className="h-4 w-1/2" />
        <Bone className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/** Placeholder matching the directory's two-column layout (filters + results). */
export function DirectorySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8" aria-hidden="true">
      <div className="space-y-4 rounded-xl border border-shadow-700 bg-shadow-900/80 p-4 sm:p-5">
        <Bone className="h-5 w-24" />
        <Bone className="h-[38px] w-full" />
        <Bone className="h-[38px] w-full lg:hidden" />
        <div className="hidden space-y-5 lg:block">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Bone key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
          <Bone className="h-[38px] w-full" />
          <Bone className="h-[38px] w-full" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <Bone key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-shadow-700 pb-4">
          <Bone className="h-7 w-28" />
          <Bone className="ml-auto h-[38px] w-40" />
          <Bone className="h-[38px] w-44" />
        </div>
        <Bone className="mt-6 h-4 w-32" />
        <div className="mt-3 grid gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Hero, type tiles and featured strip placeholders for the route-level loading state. */
export function DirectoryPageSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading events…</span>
      <div aria-hidden="true">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Bone className="h-3 w-28" />
            <Bone className="h-9 w-72 max-w-full sm:h-10 sm:w-96" />
            <Bone className="h-5 w-[28rem] max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Bone className="h-8 w-40 rounded-full" />
            <Bone className="h-8 w-24 rounded-full" />
            <Bone className="h-8 w-28 rounded-full" />
          </div>
        </div>
        <Bone className="mt-8 h-3 w-28" />
        <div className="mt-3 flex gap-3 overflow-hidden lg:grid lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Bone key={i} className="h-36 w-60 shrink-0 rounded-xl lg:w-auto" />
          ))}
        </div>
        <Bone className="mt-8 h-3 w-24" />
        <div className="mt-3 flex gap-3 overflow-hidden lg:grid lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="w-[19.5rem] shrink-0 sm:w-[22rem] lg:w-auto">
              <CardSkeleton />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10">
        <DirectorySkeleton />
      </div>
    </div>
  );
}
