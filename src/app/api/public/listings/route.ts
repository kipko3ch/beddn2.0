import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, read-only listing data served via the service role so browsing never
// depends on RLS policy state. Only active listings are ever returned, and only
// guest-safe columns (no private_address / check_in_instructions).
const CARD_COLUMNS =
  "id, slug, name, title, area, city, country, latitude, longitude, categories, property_type, currency, hourly_price, overnight_price, experience_price, listing_images(id, url, position), reviews(rating)";

const DETAIL_COLUMNS =
  "id, slug, name, title, description, area, city, country, latitude, longitude, categories, category, property_type, experience_types, currency, hourly_price, overnight_price, experience_price, deposit_amount, amenities, house_rules, total_units, available_units, minimum_hours, booking_mode, check_in_time, check_out_time, is_active, is_verified, host_id, listing_images(id, url, position), host:hosts(name, is_verified), reviews(rating)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = createAdminClient();

  // Single listing by id (used by the reserve page).
  const id = searchParams.get("id");
  if (id) {
    const { data, error } = await admin
      .from("listings")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ listing: data });
  }

  // Listing collection for home / search.
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type");
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 50)));

  let query = admin
    .from("listings")
    .select(CARD_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category === "experience") {
    query = query.contains("categories", ["experience"]).gt("experience_price", 0);
  } else {
    query = query.not("categories", "cs", '{"experience"}');
    if (category === "hourly") {
      query = query.contains("categories", ["hourly"]).gt("hourly_price", 0);
    } else if (category === "overnight") {
      query = query.contains("categories", ["overnight"]).gt("overnight_price", 0);
    }
  }
  if (type && type !== "all") {
    query = query.eq("property_type", type);
  }
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,city.ilike.%${q}%,area.ilike.%${q}%,country.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let listings = (data ?? []) as { id: string }[];

  // Search boost: any active search_boost placement on a listing already in the
  // result set floats it to the top by priority. We only reorder (never inject
  // or duplicate), so boosted listings still appear once and mixed naturally.
  if (listings.length > 0) {
    const nowIso = new Date().toISOString();
    const { data: boosts } = await admin
      .from("featured_listings")
      .select("listing_id, priority")
      .eq("placement_type", "search_boost")
      .in("status", ["active", "scheduled"])
      .lte("start_date", nowIso)
      .gte("end_date", nowIso)
      .in("listing_id", listings.map((l) => l.id));

    if (boosts && boosts.length > 0) {
      const priorityById = new Map<string, number>();
      for (const b of boosts as { listing_id: string; priority: number }[]) {
        if (!priorityById.has(b.listing_id)) priorityById.set(b.listing_id, b.priority);
      }
      const boosted = listings.filter((l) => priorityById.has(l.id));
      const rest = listings.filter((l) => !priorityById.has(l.id));
      boosted.sort((a, b) => (priorityById.get(b.id) ?? 0) - (priorityById.get(a.id) ?? 0));
      listings = [...boosted, ...rest];
    }
  }

  return NextResponse.json(
    { listings },
    // Edge/proxy caching keeps repeat browses fast and off the database.
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
  );
}
