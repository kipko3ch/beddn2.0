import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// City-grouped listing rails for the home page ("Stay in Nairobi", ...).
// Optionally takes ?city=Nairobi (from the visitor's geolocation) so their
// own city is shown first when we have listings there.
const CARD_COLUMNS =
  "id, slug, name, title, area, city, country, latitude, longitude, categories, property_type, currency, hourly_price, overnight_price, experience_price, created_at, listing_images(id, url, position), reviews(rating)";

const MAX_SECTIONS = 4;
const MAX_PER_SECTION = 10;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const preferredCity = searchParams.get("city")?.trim().toLowerCase() || null;
  const category = searchParams.get("category");
  const admin = createAdminClient();

  let query = admin
    .from("listings")
    .select(CARD_COLUMNS)
    .eq("is_active", true);

  if (category && category !== "all") {
    query = query.contains("categories", [category]);
    if (category === "hourly") {
      query = query.gt("hourly_price", 0);
    } else if (category === "overnight") {
      query = query.gt("overnight_price", 0);
    } else if (category === "experience") {
      query = query.gt("experience_price", 0);
    }
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Supabase can't statically type a joined select string; the shape matches
  // the Listing card columns above.
  type Row = { city?: string | null } & Record<string, unknown>;
  const rows = (data ?? []) as unknown as Row[];
  const byCity = new Map<string, { city: string; listings: Row[] }>();
  for (const listing of rows) {
    const city = (listing.city || "").trim();
    if (!city) continue;
    const key = city.toLowerCase();
    const group = byCity.get(key) ?? { city, listings: [] };
    if (group.listings.length < MAX_PER_SECTION) group.listings.push(listing);
    byCity.set(key, group);
  }

  const sections = [...byCity.values()]
    .sort((a, b) => {
      // The visitor's own city always leads; otherwise busiest cities first.
      const aPreferred = preferredCity && a.city.toLowerCase().includes(preferredCity) ? 1 : 0;
      const bPreferred = preferredCity && b.city.toLowerCase().includes(preferredCity) ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;
      return b.listings.length - a.listings.length;
    })
    .slice(0, MAX_SECTIONS);

  return NextResponse.json(
    { sections },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
