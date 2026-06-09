import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface AdminActionBody {
  action:
    | "verify_host"
    | "verify_listing"
    | "reject_listing"
    | "pause_listing"
    | "enable_auto_accept"
    | "disable_auto_accept"
    | "approve_withdrawal"
    | "mark_withdrawal_paid"
    | "reject_withdrawal"
    | "suspend_user"
    | "unsuspend_user"
    | "send_signin_link"
    | "make_admin"
    | "remove_admin";
  id: string;
}

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

  if (body.action === "verify_host") {
    const { error } = await admin.from("hosts").update({ is_verified: true }).eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "verify_listing") {
    const { error } = await admin
      .from("listings")
      .update({ is_verified: true, verification_status: "verified", listing_status: "active", is_active: true })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "reject_listing") {
    const { error } = await admin
      .from("listings")
      .update({
        is_verified: false,
        verification_status: "rejected",
      })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "pause_listing") {
    const { error } = await admin
      .from("listings")
      .update({
        is_verified: false,
        verification_status: "pending",
        listing_status: "paused",
        is_active: false,
        booking_mode: "manual_accept",
      })
      .eq("id", body.id);
    errorMessage = error?.message || null;
  }

  if (body.action === "enable_auto_accept" || body.action === "disable_auto_accept") {
    const { error } = await admin
      .from("listings")
      .update({ booking_mode: body.action === "enable_auto_accept" ? "auto_accept" : "manual_accept" })
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
        const origin = new URL(request.url).origin;
        const anon = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { error } = await anon.auth.signInWithOtp({
          email: target.email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${origin}/api/auth/callback`,
          },
        });
        errorMessage = error?.message || null;
      }
    }
  }

  if (errorMessage) {
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
