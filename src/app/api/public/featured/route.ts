import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Live featured listings for a public surface. Service-role (like the other
// public APIs) so browsing never depends on RLS state. A placement only counts
// when its window is open AND the underlying listing is still active (paused /
// archived listings drop out automatically).
const CARD_COLUMNS =
  "id, slug, name, title, area, city, country, latitude, longitude, categories, property_type, currency, hourly_price, overnight_price, experience_price, listing_images(id, url, position), reviews(rating)";

const SLOT_LIMITS: Record<string, number> = {
  homepage_featured: 8,
  city_featured: 6,
  category_featured: 6,
  search_boost: 50,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get("placement") || "";
  const city = searchParams.get("city")?.trim() || null;
  const category = searchParams.get("category")?.trim() || null;

  if (!SLOT_LIMITS[placement]) {
    return NextResponse.json({ listings: [] });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Lazily retire anything past its window so reads stay correct even if the
  // expiry cron hasn't run.
  await admin
    .from("featured_listings")
    .update({ status: "expired" })
    .eq("placement_type", placement)
    .in("status", ["active", "scheduled"])
    .lt("end_date", nowIso);

  let query = admin
    .from("featured_listings")
    .select("listing_id, priority")
    .eq("placement_type", placement)
    .in("status", ["active", "scheduled"])
    .lte("start_date", nowIso)
    .gte("end_date", nowIso)
    .order("priority", { ascending: false })
    .limit(SLOT_LIMITS[placement]);

  if (city) query = query.ilike("city", city);
  if (category) query = query.eq("category", category);

  const { data: placements, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // De-dupe listing ids, preserving the priority order above.
  const orderedIds: string[] = [];
  for (const row of placements ?? []) {
    const lid = (row as { listing_id: string }).listing_id;
    if (!orderedIds.includes(lid)) orderedIds.push(lid);
  }
  if (orderedIds.length === 0) {
    return NextResponse.json({ listings: [] });
  }

  // Only active listings ever surface publicly.
  let listingsQuery = admin
    .from("listings")
    .select(CARD_COLUMNS)
    .in("id", orderedIds)
    .eq("is_active", true);

  if (category === "experience") {
    listingsQuery = listingsQuery.contains("categories", ["experience"]);
  } else {
    listingsQuery = listingsQuery.not("categories", "cs", '{"experience"}');
  }

  const { data: listings } = await listingsQuery;

  const byId = new Map((listings ?? []).map((l) => [(l as { id: string }).id, l]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);

  return NextResponse.json(
    { listings: ordered },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
  );
}
