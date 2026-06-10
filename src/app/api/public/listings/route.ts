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

  if (category && category !== "all") {
    query = query.contains("categories", [category]);
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

  return NextResponse.json(
    { listings: data ?? [] },
    // Edge/proxy caching keeps repeat browses fast and off the database.
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
  );
}
