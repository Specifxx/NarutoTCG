import type { Venue } from "@naruto-tcg/types";
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { SectionHeading } from "@/components/page-header";
import { addressLines, cx } from "@/lib/format";
import { surface } from "@/lib/styles";

export function LocationSection({ venue }: { venue: Venue }) {
  return (
    <section aria-labelledby="location-heading">
      <SectionHeading id="location-heading" title="Location" />
      <div className="mt-4 grid gap-4 md:grid-cols-5">
        <div className={cx(surface.panel, "md:col-span-2")}>
          <p className="flex items-start gap-2 font-semibold text-white">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-chakra-400" aria-hidden="true" />
            <span className="break-words">{venue.name}</span>
          </p>
          {venue.hall && <p className="mt-1 pl-6 text-sm font-medium text-chakra-400">{venue.hall}</p>}
          <address className="mt-3 pl-6 text-sm not-italic leading-relaxed text-ash-200">
            {addressLines(venue.address).map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </address>
          {venue.storeSlug && (
            <Link
              href={`/store/${venue.storeSlug}`}
              className="mt-4 inline-flex items-center gap-1.5 pl-6 text-sm font-semibold text-chakra-400 hover:text-chakra-500"
            >
              Store hours &amp; details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        <GoogleMapEmbed
          location={venue.location}
          title={`Map of ${venue.name}`}
          zoom={16}
          className="md:col-span-3"
        />
      </div>
    </section>
  );
}
