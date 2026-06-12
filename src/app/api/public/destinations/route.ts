import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, read-only list of admin-curated destinations for the home page.
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("popular_destinations")
    .select("id, name, search_query, image_url, position")
    .eq("is_active", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { destinations: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
