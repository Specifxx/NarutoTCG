import { cx } from "@naruto-tcg/ui";

function Block({ className }: { className?: string }) {
  return <div className={cx("rounded-md bg-shadow-700", className)} />;
}

function PanelSkeleton() {
  return (
    <div className="w-[85%] shrink-0 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900 sm:w-[60%] md:w-[46%] lg:w-auto">
      <div className="flex items-center gap-2.5 border-b border-shadow-700 px-4 py-3">
        <Block className="size-7" />
        <Block className="h-4 w-32" />
      </div>
      <div className="divide-y divide-shadow-700/70">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Block className="aspect-[5/7] w-8" />
            <div className="flex-1 space-y-1.5">
              <Block className="h-3.5 w-3/4" />
              <Block className="h-3 w-1/3" />
            </div>
            <div className="space-y-1.5">
              <Block className="ml-auto h-3.5 w-14" />
              <Block className="ml-auto h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the directory layout so content does not jump when it streams in. */
export default function Loading() {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p role="status" className="sr-only">
        Loading card prices…
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-2xl">
            <Block className="h-3 w-36" />
            <Block className="mt-3 h-9 w-4/5 max-w-md" />
            <Block className="mt-3 h-4 w-full" />
            <Block className="mt-2 h-4 w-2/3" />
          </div>
          <div className="grid h-[5.5rem] grid-cols-3 divide-x divide-shadow-700 rounded-xl border border-shadow-700 bg-shadow-900 lg:w-[34rem]">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2 p-3 sm:px-4">
                <Block className="h-3 w-16" />
                <Block className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Block className="h-5 w-40" />
            <Block className="h-3.5 w-80 max-w-full" />
          </div>
          <Block className="h-10 w-28 rounded-lg" />
        </div>
        <div className="-mx-4 mt-4 flex gap-4 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
          <PanelSkeleton />
          <PanelSkeleton />
          <PanelSkeleton />
        </div>

        <Block className="mt-12 h-5 w-44" />
        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <Block className="h-10 w-full rounded-lg lg:max-w-md" />
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-1">
            <Block className="h-10 rounded-lg sm:w-20" />
            <Block className="h-10 rounded-lg sm:w-24" />
            <Block className="h-10 rounded-lg sm:w-24" />
            <Block className="col-span-3 h-10 rounded-lg sm:ml-auto sm:w-56" />
          </div>
        </div>
        <Block className="mt-5 h-4 w-48" />
        <div className="mt-3 divide-y divide-shadow-700/70 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Block className="aspect-[5/7] w-12 md:w-8" />
              <div className="flex-1 space-y-1.5">
                <Block className="h-3.5 w-1/2 max-w-xs" />
                <Block className="h-3 w-1/3 max-w-[12rem]" />
              </div>
              <Block className="h-4 w-16" />
              <Block className="hidden h-4 w-14 md:block" />
              <Block className="hidden h-6 w-24 md:block" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
