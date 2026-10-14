import type { Store } from "@naruto-tcg/types";
import { toSchemaOrgHours } from "@/lib/store-hours";

/** schema.org Store structured data. `pageUrl` must be absolute. */
export function StoreJsonLd({ store, pageUrl }: { store: Store; pageUrl: string }) {
  const { address, contact } = store;
  const sameAs = Object.values(store.social).filter((url): url is string => typeof url === "string" && url.length > 0);
  const hours = toSchemaOrgHours(store.hours);

  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${pageUrl}#store`,
    name: store.name,
    description: store.description,
    ...(store.tagline ? { slogan: store.tagline } : {}),
    url: contact.website ?? pageUrl,
    mainEntityOfPage: pageUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: [address.line1, address.line2].filter(Boolean).join(", "),
      addressLocality: address.city,
      ...(address.region ? { addressRegion: address.region } : {}),
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      addressCountry: address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: store.location.lat, longitude: store.location.lng },
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(store.languages.length ? { knowsLanguage: store.languages } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so a value containing "</script>" can't break out of the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
