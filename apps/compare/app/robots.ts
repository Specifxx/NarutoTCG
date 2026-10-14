import type { MetadataRoute } from "next";

/** The sitemap is only advertised when the public origin is known (sitemap URLs must be absolute). */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_COMPARE_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).href } : {}),
  };
}
