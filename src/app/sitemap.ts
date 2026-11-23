import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...PUBLIC_PAGES.map((p) => ({ url: `${site.url}${p.path === "/" ? "" : p.path}`, lastModified: now, changeFrequency: "weekly" as const, priority: p.priority })),
    { url: `${site.url}/cadastro`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${site.url}/llms.txt`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.2 },
  ];
}
