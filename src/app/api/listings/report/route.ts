import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_REASONS = ["spam", "inaccurate", "safety", "scam", "inappropriate", "other"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to report a listing." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    listingId?: string;
    reason?: string;
    detail?: string;
  };

  const { listingId, reason, detail } = body;

  if (!listingId || !reason) {
    return NextResponse.json(
      { error: "Listing id and reason are required." },
      { status: 400 }
    );
  }

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Check if the user already has a pending report for this listing
  const { data: existing } = await admin
    .from("listing_reports")
    .select("id")
    .eq("listing_id", listingId)
    .eq("user_id", user.id)
    .eq("status", "new")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already reported this listing. Our team is reviewing it." },
      { status: 409 }
    );
  }

  const { error } = await admin.from("listing_reports").insert({
    listing_id: listingId,
    user_id: user.id,
    reason,
    detail: detail?.trim() || null,
  });

  if (error) {
    console.error("Failed to insert listing_report:", error);
    return NextResponse.json(
      { error: "Could not submit your report. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
