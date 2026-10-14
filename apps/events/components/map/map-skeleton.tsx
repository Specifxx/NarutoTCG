import { cx } from "@/lib/format";

/**
 * Shared layout classes for the map page and its skeleton.
 * Below `lg`: title, then the map (~55vh), then filters and list in page flow.
 * From `lg`: a full-height split with a 370px scrolling sidebar and the map filling the rest.
 */
export const mapLayout = {
  root: "lg:grid lg:h-[calc(100dvh-7.5rem)] lg:min-h-[560px] lg:grid-cols-[370px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]",
  title:
    "flex items-center gap-3 border-b border-shadow-700/70 bg-shadow-950/60 px-4 py-3 lg:col-start-1 lg:row-start-1 lg:border-r lg:px-5 lg:py-4",
  map: "relative h-[55dvh] min-h-[320px] border-b border-shadow-700/70 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-auto lg:min-h-0 lg:border-b-0",
  sidebar:
    "px-4 py-5 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-shadow-700/70 lg:bg-shadow-950/60 lg:px-5 lg:[scrollbar-width:thin]",
} as const;

function Bone({ className }: { className?: string }) {
  return <div className={cx("rounded-md bg-shadow-800 motion-safe:animate-pulse", className)} />;
}

/** Fixed placeholder pin positions (percent of the map box) — deterministic for SSR. */
const PINS: readonly { left: string; top: string; delay: string }[] = [
  { left: "22%", top: "38%", delay: "0ms" },
  { left: "28%", top: "46%", delay: "150ms" },
  { left: "48%", top: "33%", delay: "300ms" },
  { left: "51%", top: "36%", delay: "450ms" },
  { left: "79%", top: "41%", delay: "200ms" },
  { left: "84%", top: "70%", delay: "350ms" },
];

/** Stand-in for the Leaflet map while its client-only bundle loads. */
export function MapSkeleton() {
  return (
    <div
      role="status"
      className="relative h-full w-full overflow-hidden bg-shadow-950 bg-[linear-gradient(rgb(212_212_224/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(212_212_224/0.035)_1px,transparent_1px)] bg-[size:56px_56px]"
    >
      <span className="sr-only">Loading map…</span>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgb(242_92_0/0.08),transparent_70%)]"
      />
      {PINS.map((pin) => (
        <span
          key={`${pin.left}-${pin.top}`}
          aria-hidden="true"
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-shadow-500/70 motion-safe:animate-pulse"
          style={{ left: pin.left, top: pin.top, animationDelay: pin.delay }}
        />
      ))}
      <div aria-hidden="true" className="absolute left-3 top-3 h-9 w-28 rounded-lg border border-shadow-700/80 bg-shadow-900/80" />
      <div aria-hidden="true" className="absolute right-3 top-3 h-[70px] w-[36px] rounded-[10px] border border-shadow-700/80 bg-shadow-900/80" />
      <div
        aria-hidden="true"
        className="absolute bottom-3 left-3 h-9 w-28 rounded-xl border border-shadow-700/80 bg-shadow-900/80 sm:h-[11.5rem] sm:w-[13.25rem]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_14px_rgb(7_7_11/0.85)]" />
    </div>
  );
}

function VenueGroupSkeleton() {
  return (
    <div className="rounded-xl border border-shadow-700/80 bg-shadow-900/60 p-3">
      <div className="flex items-start gap-3">
        <Bone className="h-6 w-5 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-3 space-y-2.5 pl-1">
        <Bone className="h-8 w-full" />
        <Bone className="h-8 w-5/6" />
      </div>
    </div>
  );
}

/** Route-level placeholder matching the map page layout (title, map, filters + list). */
export function MapPageSkeleton() {
  return (
    <div className={mapLayout.root}>
      <span role="status" className="sr-only">
        Loading event map…
      </span>
      <div aria-hidden="true" className={mapLayout.title}>
        <Bone className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <Bone className="h-5 w-28" />
          <Bone className="h-3 w-44" />
        </div>
        <Bone className="ml-auto h-8 w-24" />
      </div>
      <div aria-hidden="true" className={mapLayout.map}>
        <MapSkeleton />
      </div>
      <div aria-hidden="true" className={cx(mapLayout.sidebar, "space-y-4")}>
        <Bone className="h-5 w-32" />
        <Bone className="h-[38px] w-full" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Bone key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
        <Bone className="h-[38px] w-full" />
        <Bone className="h-[38px] w-full" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }, (_, i) => (
            <VenueGroupSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
