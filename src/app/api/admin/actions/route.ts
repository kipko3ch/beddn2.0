import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/server";
import { hostApprovedEmail, hostRejectedEmail } from "@/lib/email/templates";
import { ROUTES } from "@/lib/routes";
import { blockCalendarForBooking, unblockCalendarForBooking } from "@/lib/bookings/server";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://beddn.com").replace(/\/$/, "");

// Host approval emails need the applicant's address and display name, which
// live on the auth user, not the `hosts` row itself.
async function notifyHostStatus(
  admin: ReturnType<typeof createAdminClient>,
  hostId: string,
  status: "approved" | "rejected",
  reason?: string | null
) {
  const { data: host } = await admin.from("hosts").select("user_id, name").eq("id", hostId).maybeSingle();
  if (!host?.user_id) return;
  const { data: userRes } = await admin.auth.admin.getUserById(host.user_id);
  const email = userRes.user?.email;
  if (!email) return;

  const hostName = host.name || "there";
  if (status === "approved") {
    await sendEmail({
      to: email,
      eventType: "host_approved",
      ...hostApprovedEmail({ hostName, dashboardUrl: `${SITE_URL}${ROUTES.dashboard}` }),
    });
  } else {
    await sendEmail({
      to: email,
      eventType: "host_rejected",
      ...hostRejectedEmail({ hostName, reason }),
    });
  }
}

interface AdminActionBody {
  action:
    | "confirm_booking"
    | "reject_booking"
    | "revoke_booking"
    | "verify_host"
    | "approve_host"
    | "reject_host"
    | "suspend_host"
    | "unsuspend_host"
    | "verify_listing"
    | "unverify_listing"
    | "approve_listing"
    | "reject_listing"
    | "pause_listing"
    | "resume_listing"
    | "archive_listing"
    | "restore_listing"
    | "enable_auto_accept"
    | "disable_auto_accept"
    | "feature_listing"
    | "cancel_feature"
    | "extend_feature"
    | "mark_feature_paid"
    | "mark_feature_complimentary"
    | "approve_withdrawal"
    | "mark_withdrawal_paid"
    | "reject_withdrawal"
    | "suspend_user"
    | "unsuspend_user"
    | "send_signin_link"
    | "make_admin"
    | "remove_admin"
    | "flag_image"
    | "unflag_image"
    | "set_feature_status"
    | "reset_host_pin";
  id: string;
  reason?: string;
  // Featured placement fields (feature_listing / extend_feature).
  feature?: {
    placement_type?: string;
    city?: string | null;
    category?: string | null;
    start_date?: string;
    end_date?: string;
    payment_status?: string;
    amount?: number;
    currency?: string;
    priority?: number;
  };
}

// Max concurrent (active/scheduled, not-yet-expired) placements per surface.
const FEATURED_SLOT_LIMITS: Record<string, number> = {
  homepage_featured: 8,
  city_featured: 6,
  category_featured: 6,
};

const PLACEMENT_TYPES = new Set([
  "homepage_featured",
  "city_featured",
  "category_featured",
  "search_boost",
]);

// Far-future ban duration used to "suspend" an account until lifted.
const SUSPEND_DURATION = "876000h";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", data.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await request.json()) as AdminActionBody;
  let errorMessage: string | null = null;

  // --- Admin Booking Validation Layer ---
  if (body.action === "confirm_booking") {
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", body.id)
      .select("listing_id, category, start_datetime, end_datetime, units_reserved, listings(total_units)")
      .single();
    errorMessage = bookingError?.message || null;
    
    if (booking && !errorMessage) {
      await blockCalendarForBooking(admin, booking, Array.isArray(booking.listings) ? booking.listings[0] : booking.listings as any);
    }
  }

  if (body.action === "reject_booking") {
    const { error } = await admin.from("bookings").update({ status: "rejected" }).eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "revoke_booking") {
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .update({ status: "cancelled" }) // 'revoked' not in constraint, fallback to cancelled
      .eq("id", body.id)
      .select("listing_id, category, start_datetime, end_datetime, units_reserved, guest_email")
      .single();
    errorMessage = bookingError?.message || null;

    if (booking && !errorMessage) {
      await unblockCalendarForBooking(admin, booking);
      // Optional: notify guest that it was revoked
    }
  }

  if (body.action === "verify_host") {
    const { error } = await admin.from("hosts").update({ is_verified: true }).eq("id", body.id);
    errorMessage = error?.message || null;
  }

  // --- Host approval lifecycle (governs whether a host can operate) ---
  if (body.action === "approve_host") {
    const { error } = await admin
      .from("hosts")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: data.user.id,
        rejection_reason: null,
      })
      .eq("id", body.id);
    errorMessage = error?.message || null;
    if (!errorMessage) {
      await notifyHostStatus(admin, body.id, "approved").catch(() => undefined);
    }
  }
  if (body.action === "reject_host") {
    const { error } = await admin
      .from("hosts")
      .update({ status: "rejected", rejection_reason: body.reason || null })
      .eq("id", body.id);
    errorMessage = error?.message || null;
    if (!errorMessage) {
      await notifyHostStatus(admin, body.id, "rejected", body.reason).catch(() => undefined);
    }
  }
  if (body.action === "suspend_host" || body.action === "unsuspend_host") {
    const { error } = await admin
      .from("hosts")
      .update({ status: body.action === "suspend_host" ? "suspended" : "approved" })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  // --- Verified trust badge (separate from the lifecycle status) ---
  if (body.action === "verify_listing" || body.action === "unverify_listing") {
    const verified = body.action === "verify_listing";
    const { error } = await admin
      .from("listings")
      .update({
        is_verified: verified,
        verification_status: verified ? "verified" : "pending",
      })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  // --- Lifecycle transitions (listing_status drives public visibility) ---
  const lifecycle: Record<string, { listing_status: string; rejection_reason?: string | null }> = {
    approve_listing: { listing_status: "active", rejection_reason: null },
    reject_listing: { listing_status: "rejected", rejection_reason: body.reason || null },
    pause_listing: { listing_status: "paused" },
    resume_listing: { listing_status: "active" },
    archive_listing: { listing_status: "archived" },
    restore_listing: { listing_status: "paused" },
  };
  if (lifecycle[body.action]) {
    const { error } = await admin.from("listings").update(lifecycle[body.action]).eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "enable_auto_accept" || body.action === "disable_auto_accept") {
    const { error } = await admin
      .from("listings")
      .update({ booking_mode: body.action === "enable_auto_accept" ? "auto_accept" : "manual_accept" })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  // --- Featured placements ---
  if (body.action === "feature_listing") {
    const f = body.feature || {};
    const placement = f.placement_type || "";
    const start = f.start_date ? new Date(f.start_date) : null;
    const end = f.end_date ? new Date(f.end_date) : null;

    if (!PLACEMENT_TYPES.has(placement)) {
      return NextResponse.json({ error: "Pick a valid placement type." }, { status: 400 });
    }
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Provide valid start and end dates." }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json({ error: "End date must be after the start date." }, { status: 400 });
    }

    // Enforce slot limits against currently live (active/scheduled, not expired)
    // placements on the same surface.
    const limit = FEATURED_SLOT_LIMITS[placement];
    if (limit) {
      let countQuery = admin
        .from("featured_listings")
        .select("id", { count: "exact", head: true })
        .eq("placement_type", placement)
        .in("status", ["active", "scheduled"])
        .gte("end_date", new Date().toISOString());
      if (placement === "city_featured" && f.city) countQuery = countQuery.eq("city", f.city);
      if (placement === "category_featured" && f.category) countQuery = countQuery.eq("category", f.category);
      const { count } = await countQuery;
      if ((count ?? 0) >= limit) {
        const where =
          placement === "city_featured"
            ? ` in ${f.city}`
            : placement === "category_featured"
            ? ` for ${f.category}`
            : "";
        return NextResponse.json(
          { error: `Slot limit reached: max ${limit} featured listings${where}.` },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const status = start <= now && end >= now ? "active" : "scheduled";
    const { error } = await admin.from("featured_listings").insert({
      listing_id: body.id,
      placement_type: placement,
      city: f.city || null,
      category: f.category || null,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      status,
      payment_status: f.payment_status || "unpaid",
      amount: f.amount ?? 0,
      currency: f.currency || "KES",
      priority: f.priority ?? 0,
      created_by: data.user.id,
    });
    errorMessage = error?.message || null;
  }

  if (body.action === "cancel_feature") {
    const { error } = await admin
      .from("featured_listings")
      .update({ status: "cancelled" })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "extend_feature") {
    const end = body.feature?.end_date ? new Date(body.feature.end_date) : null;
    if (!end || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Provide a valid new end date." }, { status: 400 });
    }
    // Re-activate if the extension brings it back into range.
    const status = end >= new Date() ? "active" : "expired";
    const { error } = await admin
      .from("featured_listings")
      .update({ end_date: end.toISOString(), status })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "mark_feature_paid" || body.action === "mark_feature_complimentary") {
    const payment_status = body.action === "mark_feature_paid" ? "paid" : "complimentary";
    const { error } = await admin
      .from("featured_listings")
      .update({ payment_status })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (
    body.action === "approve_withdrawal" ||
    body.action === "mark_withdrawal_paid" ||
    body.action === "reject_withdrawal"
  ) {
    const nextStatus =
      body.action === "approve_withdrawal"
        ? "approved"
        : body.action === "mark_withdrawal_paid"
        ? "paid"
        : "rejected";
    const { error } = await admin
      .from("withdrawals")
      .update({ status: nextStatus })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "set_feature_status") {
    const allowed = new Set(["new", "planned", "shipped", "declined"]);
    const status = allowed.has(body.reason ?? "") ? body.reason : null;
    if (!status) {
      return NextResponse.json({ error: "Invalid feature status." }, { status: 400 });
    }
    const { error } = await admin
      .from("feature_requests")
      .update({ status })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  // `id` here is the profile/user id (the PIN lives on profiles, not hosts) —
  // for a locked-out or forgetful host, since the self-serve reset in
  // /api/host/pin requires the current PIN.
  if (body.action === "reset_host_pin") {
    const { error } = await admin
      .from("profiles")
      .update({ host_pin_hash: null, host_pin_updated_at: null, host_pin_fail_count: 0, host_pin_locked_until: null })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "flag_image" || body.action === "unflag_image") {
    const flagged = body.action === "flag_image";
    const { error } = await admin
      .from("listing_images")
      .update({ flagged, flag_reason: flagged ? body.reason || "Flagged by admin" : null })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  const userActions = new Set([
    "suspend_user",
    "unsuspend_user",
    "send_signin_link",
    "make_admin",
    "remove_admin",
  ]);

  if (userActions.has(body.action)) {
    // Guard against an admin locking themselves out of their own account.
    if (
      body.id === data.user.id &&
      (body.action === "suspend_user" || body.action === "remove_admin")
    ) {
      return NextResponse.json(
        { error: "You cannot suspend or demote your own account." },
        { status: 400 }
      );
    }

    if (body.action === "suspend_user" || body.action === "unsuspend_user") {
      const suspend = body.action === "suspend_user";
      const { error: banError } = await admin.auth.admin.updateUserById(body.id, {
        ban_duration: suspend ? SUSPEND_DURATION : "none",
      });
      const { error: flagError } = await admin
        .from("profiles")
        .update({ suspended: suspend })
        .eq("id", body.id);
      errorMessage = banError?.message || flagError?.message || null;
    }

    if (body.action === "make_admin" || body.action === "remove_admin") {
      const { error } = await admin
        .from("profiles")
        .update({ is_admin: body.action === "make_admin" })
        .eq("id", body.id);
      errorMessage = error?.message || null;
    }

    if (body.action === "send_signin_link") {
      const { data: target } = await admin
        .from("profiles")
        .select("email")
        .eq("id", body.id)
        .single();
      if (!target?.email) {
        errorMessage = "No email on file for this user.";
      } else {
        const { origin } = new URL(request.url);
        const forwardedHost = request.headers.get("x-forwarded-host");
        const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
        const baseUrl = (
          process.env.NEXT_PUBLIC_SITE_URL ||
          (forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin)
        ).replace(/\/$/, "");
        // Deliver through the same ZeptoMail-backed magic-link route the login
        // flow uses (Supabase's built-in email isn't configured here).
        const response = await fetch(`${baseUrl}/api/auth/magic-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: target.email }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          errorMessage = payload.error || "Could not send the sign-in link.";
        }
      }
    }
  }

  if (errorMessage) {
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
