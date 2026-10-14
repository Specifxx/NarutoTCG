import type { MetadataRoute } from "next";
import { LESSONS } from "@/content/lessons";
import { PUZZLES } from "@/content/puzzles";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/how-to-play",
    ...LESSONS.map((l) => `/how-to-play/${l.id}`),
    "/puzzles",
    ...PUZZLES.map((p) => `/puzzles/${p.id}`),
    "/keywords",
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 }));
}
