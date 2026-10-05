import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/category/hourly`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/category/overnight`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/category/experience`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/pro`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Dynamic listing and city routes
  const listingRoutes: MetadataRoute.Sitemap = [];
  const cityRoutes: MetadataRoute.Sitemap = [];
  const distinctCities = new Set<string>();

  try {
    const admin = createAdminClient();
    const { data: listings } = await admin
      .from("listings")
      .select("slug, updated_at, created_at, city, categories, is_active")
      .eq("is_active", true);

    if (listings && listings.length > 0) {
      for (const item of listings) {
        if (!item.slug) continue;

        const isExp = Array.isArray(item.categories) && item.categories.includes("experience");
        const path = isExp ? `/experience/${item.slug}` : `/property/${item.slug}`;
        const lastMod = item.updated_at
          ? new Date(item.updated_at)
          : item.created_at
          ? new Date(item.created_at)
          : now;

        listingRoutes.push({
          url: `${SITE_URL}${path}`,
          lastModified: lastMod,
          changeFrequency: "weekly",
          priority: 0.8,
        });

        if (item.city && typeof item.city === "string") {
          const trimmed = item.city.trim();
          if (trimmed) distinctCities.add(trimmed);
        }
      }
    }
  } catch (err) {
    console.error("Error generating sitemap listings:", err);
  }

  // Common East Africa destination cities to ensure crawl coverage
  const defaultCities = [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Diani Beach",
    "Naivasha",
    "Arusha",
    "Dar es Salaam",
    "Zanzibar",
  ];
  for (const c of defaultCities) {
    distinctCities.add(c);
  }

  for (const city of distinctCities) {
    cityRoutes.push({
      url: `${SITE_URL}/search?q=${encodeURIComponent(city)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return [...staticRoutes, ...cityRoutes, ...listingRoutes];
}
