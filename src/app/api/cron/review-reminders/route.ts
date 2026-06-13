import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/server";
import { reviewReminderEmail } from "@/lib/email/templates";

// Sends a one-time "did you book? remember to review" nudge for inquiries that
// are a few days old and have no review yet. Trigger from a scheduled job with
// ?secret=<CRON_SECRET>, or call while signed in as an admin.

const MIN_AGE_DAYS = 2;
const MAX_AGE_DAYS = 21;
const BATCH = 50;

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const provided =
    new URL(request.url).searchParams.get("secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && provided === secret) return true;

  // Fallback: an authenticated admin may trigger it manually.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    return Boolean(profile?.is_admin);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const minDate = new Date(now - MIN_AGE_DAYS * 86400000).toISOString();
  const maxDate = new Date(now - MAX_AGE_DAYS * 86400000).toISOString();

  const { data: inquiries } = await admin
    .from("inquiries")
    .select("id, listing_id, guest_user_id, guest_name, listing:listings(slug, name, title)")
    .is("review_reminder_sent_at", null)
    .not("guest_user_id", "is", null)
    .lte("created_at", minDate)
    .gte("created_at", maxDate)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  const origin = new URL(request.url).origin;
  let sent = 0;

  for (const inq of inquiries ?? []) {
    // Skip if a review already exists for this guest + listing.
    const { data: review } = await admin
      .from("reviews")
      .select("id")
      .eq("listing_id", inq.listing_id)
      .eq("user_id", inq.guest_user_id as string)
      .maybeSingle();

    // Mark as handled regardless, so we don't re-scan it next run.
    await admin
      .from("inquiries")
      .update({ review_reminder_sent_at: new Date().toISOString() })
      .eq("id", inq.id);

    if (review) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", inq.guest_user_id as string)
      .maybeSingle();
    if (!profile?.email) continue;

    const listing = (inq.listing ?? null) as { slug?: string; name?: string; title?: string } | null;
    const listingName = listing?.title || listing?.name || "your stay";
    const reviewUrl = `${origin}/review?listing=${listing?.slug ?? ""}`;
    const { subject, html } = reviewReminderEmail({
      guestName: inq.guest_name,
      listingName,
      reviewUrl,
    });
    await sendEmail({ to: profile.email, subject, html, eventType: "review_reminder" });
    sent += 1;
  }

  return NextResponse.json({ ok: true, scanned: inquiries?.length ?? 0, sent });
}
