import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface NegotiationBody {
  listingId: string;
  offerAmount?: string;
  message?: string;
  guestName?: string;
  guestPhone?: string;
}

// "Ask for a better price" — lands in the admin dashboard's Notifications
// section (notification_logs) instead of going out as an SMS.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as NegotiationBody;
  if (!body.listingId) {
    return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, name, title, currency")
    .eq("id", body.listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const message = [
    `Price negotiation for "${listing.title || listing.name}"`,
    body.guestName ? `Guest: ${body.guestName}` : null,
    body.guestPhone ? `Phone: ${body.guestPhone}` : null,
    body.offerAmount ? `Offer: ${listing.currency || "KES"} ${body.offerAmount}` : null,
    body.message ? `Message: ${body.message}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const { error } = await admin.from("notification_logs").insert({
    channel: "in_app",
    event_type: "price_negotiation",
    recipient: "admin",
    message,
    provider: "beddn",
    status: "new",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
