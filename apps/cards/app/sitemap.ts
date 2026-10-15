import type { MetadataRoute } from "next";
import { getAllCards, getSets } from "@/lib/data";
import { cardHref, setHref } from "@/lib/meta";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/cards", "/spoilers", "/sets", "/disclosure"];
  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` })),
    ...getSets().map((set) => ({ url: `${SITE_URL}${setHref(set.id)}` })),
    ...getAllCards().map((card) => ({ url: `${SITE_URL}${cardHref(card.id)}` })),
  ];
}
