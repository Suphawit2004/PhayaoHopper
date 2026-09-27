import type { MetadataRoute } from "next";
import { getCatalog } from "@/features/cafes/catalog";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const CAFES = await getCatalog();
  const base = getSiteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cafes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/map`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.3 },
    ...CAFES.map((cafe) => ({
      url: `${base}/cafes/${cafe.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
