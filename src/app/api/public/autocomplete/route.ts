import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() || "";

  const admin = createAdminClient();

  // Fetch unique city and area from active listings
  const { data: listingsData } = await admin
    .from("listings")
    .select("city, area, country")
    .eq("is_active", true);

  // Fetch active popular destinations
  const { data: destData } = await admin
    .from("popular_destinations")
    .select("name, search_query")
    .eq("is_active", true);

  type SuggestionItem = {
    name: string;
    search_query: string;
    subtitle?: string;
    type: "location" | "destination";
  };

  const suggestions: SuggestionItem[] = [];
  const seen = new Set<string>();

  // Process listing locations (cities and areas)
  if (listingsData) {
    listingsData.forEach((item) => {
      const city = item.city?.trim();
      const area = item.area?.trim();
      const country = item.country?.trim();

      // Suggest City, Country
      if (city) {
        const cityKey = `${city}, ${country}`.toLowerCase();
        if (!seen.has(cityKey)) {
          seen.add(cityKey);
          suggestions.push({
            name: city,
            subtitle: country,
            search_query: city,
            type: "location",
          });
        }
      }

      // Suggest Area, City
      if (area && city) {
        const areaKey = `${area}, ${city}`.toLowerCase();
        if (!seen.has(areaKey)) {
          seen.add(areaKey);
          suggestions.push({
            name: area,
            subtitle: city,
            search_query: `${area}, ${city}`,
            type: "location",
          });
        }
      }
    });
  }

  // Process popular destinations
  if (destData) {
    destData.forEach((dest) => {
      const nameKey = dest.name.toLowerCase();
      if (!seen.has(nameKey)) {
        seen.add(nameKey);
        suggestions.push({
          name: dest.name,
          search_query: dest.search_query,
          type: "destination",
        });
      }
    });
  }

  // Filter suggestions by query
  let filtered = suggestions;
  if (q) {
    filtered = suggestions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.subtitle && s.subtitle.toLowerCase().includes(q)) ||
        s.search_query.toLowerCase().includes(q)
    );
  }

  // Rank suggestions by how early the query matches
  filtered.sort((a, b) => {
    const aIndex = a.name.toLowerCase().indexOf(q);
    const bIndex = b.name.toLowerCase().indexOf(q);
    if (aIndex !== bIndex) {
      return aIndex - bIndex; // earlier matches first
    }
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ suggestions: filtered.slice(0, 10) });
}
