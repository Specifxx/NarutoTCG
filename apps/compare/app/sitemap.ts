import type { MetadataRoute } from "next";
import { cardHref } from "@/lib/market/query";
import { getMarketRepository } from "@/lib/market/repository";

/** Read at request time, so builds need no database and new cards appear without a deploy. */
export const dynamic = "force-dynamic";

/**
 * The directory home plus every card page. Sitemap URLs must be absolute, so without
 * NEXT_PUBLIC_COMPARE_URL the sitemap is empty (and robots.txt does not advertise it).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_COMPARE_URL;
  if (!siteUrl) return [];
  const ids = await getMarketRepository().listCardIds();
  return [
    { url: new URL("/", siteUrl).href, changeFrequency: "daily", priority: 1 },
    ...ids.map((id) => ({ url: new URL(cardHref(id), siteUrl).href, changeFrequency: "daily" as const })),
  ];
}
