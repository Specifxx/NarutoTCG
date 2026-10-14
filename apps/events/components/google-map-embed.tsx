import type { GeoPoint } from "@naruto-tcg/types";
import { ExternalLink, Navigation } from "lucide-react";
import { googleMapsDirectionsUrl, googleMapsEmbedUrl } from "@/lib/geo";
import { cx } from "@/lib/format";

/**
 * Interactive Google Maps preview (keyless embed) with a directions link.
 * Lazy-loaded so it never blocks the page.
 */
export function GoogleMapEmbed({
  location,
  title,
  zoom = 15,
  className,
}: {
  location: GeoPoint;
  /** Accessible title, e.g. "Map of Leaf Village Games". */
  title: string;
  zoom?: number;
  className?: string;
}) {
  return (
    <figure className={cx("overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900", className)}>
      <div className="relative aspect-[16/10] w-full bg-shadow-800">
        <iframe
          title={title}
          src={googleMapsEmbedUrl(location, zoom)}
          className="absolute inset-0 h-full w-full border-0 [filter:invert(0.9)_hue-rotate(180deg)_saturate(0.6)_brightness(0.95)]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
        <span className="text-ash-400 tabular-nums">
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </span>
        <a
          href={googleMapsDirectionsUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-chakra-400 hover:text-chakra-500"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Get directions
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(opens Google Maps in a new tab)</span>
        </a>
      </figcaption>
    </figure>
  );
}
