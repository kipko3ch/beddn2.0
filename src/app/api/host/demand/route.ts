import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Fetch host profile
  const { data: hostRows } = await admin
    .from("hosts")
    .select("id, name")
    .eq("user_id", auth.user.id)
    .limit(1);

  const host = hostRows?.[0];
  if (!host) {
    return NextResponse.json({
      listings: [],
      hostAreas: [],
      localDemand: [],
      unmatchedNearYou: [],
      topAreas: [],
      categoryStats: [],
    });
  }

  // 2. Fetch host's properties to know their operating locations
  const { data: listings } = await admin
    .from("listings")
    .select("id, name, title, city, area, address, booking_mode, is_active")
    .eq("host_id", host.id);

  const propertyList = listings || [];

  // Extract unique lowercase city and area keywords for matching
  const hostLocationTokens = new Set<string>();
  const hostDisplayLocations: string[] = [];

  propertyList.forEach((p) => {
    if (p.city) {
      const cityClean = p.city.trim();
      hostLocationTokens.add(cityClean.toLowerCase());
      if (!hostDisplayLocations.includes(cityClean)) hostDisplayLocations.push(cityClean);
    }
    if (p.area) {
      const areaClean = p.area.trim();
      hostLocationTokens.add(areaClean.toLowerCase());
      if (!hostDisplayLocations.includes(areaClean)) hostDisplayLocations.push(areaClean);
    }
  });

  // 3. Fetch search demand records via admin client (bypasses RLS)
  const { data: demandRows } = await admin
    .from("search_demand")
    .select("id, query, latitude, longitude, category, results_count, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const allDemand = demandRows || [];

  // 4. Filter demand matching host's locations
  const localDemand = allDemand.filter((entry) => {
    if (!entry.query) return false;
    const q = entry.query.toLowerCase();
    for (const token of hostLocationTokens) {
      if (token && (q.includes(token) || token.includes(q))) {
        return true;
      }
    }
    return false;
  });

  // Unmatched searches near host's locations (supply shortages)
  const unmatchedNearYou = localDemand.filter((e) => e.results_count === 0);

  // 5. Aggregate top searched areas overall
  const counts = new Map<string, { total: number; noResults: number }>();
  allDemand.forEach((e) => {
    const raw = (e.query || "Nearby Stays").trim();
    const key = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    const existing = counts.get(key) || { total: 0, noResults: 0 };
    existing.total += 1;
    if (e.results_count === 0) existing.noResults += 1;
    counts.set(key, existing);
  });

  const topAreas = Array.from(counts.entries())
    .map(([query, stat]) => ({
      query,
      count: stat.total,
      no_results: stat.noResults,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // 6. Category breakdown
  const categoryCounts = new Map<string, number>();
  allDemand.forEach((e) => {
    const cat = e.category || "Any stay";
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  });
  const categoryStats = Array.from(categoryCounts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  return NextResponse.json({
    listings: propertyList,
    hostAreas: hostDisplayLocations,
    localDemand,
    unmatchedNearYou,
    topAreas,
    categoryStats,
  });
}
