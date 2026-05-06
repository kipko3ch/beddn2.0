import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface AdminActionBody {
  action:
    | "verify_host"
    | "verify_listing"
    | "enable_auto_accept"
    | "disable_auto_accept"
    | "approve_withdrawal"
    | "mark_withdrawal_paid"
    | "reject_withdrawal";
  id: string;
}

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

  if (errorMessage) {
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
