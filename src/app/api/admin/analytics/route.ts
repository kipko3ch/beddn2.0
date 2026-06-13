import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin demand analytics. Proof that Beddn generated the lead: views,
// availability checks, inquiries, WhatsApp clicks, link clicks — plus the
// listings/cities/dates with the most demand.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const [{ data: events }, { data: inquiries }] = await Promise.all([
    admin.from("listing_events").select("event_type, listing_id").limit(10000),
    admin
      .from("inquiries")
      .select("listing_id, check_in, listing:listings(name, title, city)")
      .limit(5000),
  ]);

  const eventRows = events ?? [];
  const countEvent = (type: string) =>
    eventRows.filter((row) => row.event_type === type).length;

  const totals = {
    views: countEvent("LISTING_VIEW"),
    availabilityChecks: countEvent("AVAILABILITY_CHECKED"),
    inquiries: (inquiries ?? []).length,
    whatsappClicks: countEvent("WHATSAPP_CLICK"),
    linkClicks: countEvent("EXPERIENCE_LINK_CLICK") + countEvent("GROUP_LINK_CLICK"),
  };

  // Views per listing, to find high-views-low-inquiry listings.
  const viewsByListing = new Map<string, number>();
  for (const row of eventRows) {
    if (row.event_type === "LISTING_VIEW" && row.listing_id) {
      viewsByListing.set(row.listing_id, (viewsByListing.get(row.listing_id) ?? 0) + 1);
    }
  }

  type InquiryRow = {
    listing_id: string;
    check_in: string | null;
    listing?: { name?: string; title?: string; city?: string } | null;
  };
  const inquiryRows = (inquiries ?? []) as InquiryRow[];

  const byListing = new Map<string, { name: string; inquiries: number }>();
  const byCity = new Map<string, number>();
  const byDate = new Map<string, number>();
  for (const row of inquiryRows) {
    const name = row.listing?.title || row.listing?.name || "Listing";
    const entry = byListing.get(row.listing_id) ?? { name, inquiries: 0 };
    entry.inquiries += 1;
    byListing.set(row.listing_id, entry);
    const city = row.listing?.city;
    if (city) byCity.set(city, (byCity.get(city) ?? 0) + 1);
    if (row.check_in) byDate.set(row.check_in, (byDate.get(row.check_in) ?? 0) + 1);
  }

  const topListings = [...byListing.entries()]
    .map(([id, v]) => ({ id, name: v.name, inquiries: v.inquiries, views: viewsByListing.get(id) ?? 0 }))
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  const topCities = [...byCity.entries()]
    .map(([city, count]) => ({ city, inquiries: count }))
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  const mostRequestedDates = [...byDate.entries()]
    .map(([date, count]) => ({ date, inquiries: count }))
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  // Listings getting attention but few inquiries — a conversion problem.
  const highViewsLowInquiries = [...viewsByListing.entries()]
    .map(([id, views]) => ({
      id,
      name: byListing.get(id)?.name ?? "Listing",
      views,
      inquiries: byListing.get(id)?.inquiries ?? 0,
    }))
    .filter((row) => row.views >= 5 && row.inquiries === 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return NextResponse.json({
    totals,
    topListings,
    topCities,
    mostRequestedDates,
    highViewsLowInquiries,
  });
}
