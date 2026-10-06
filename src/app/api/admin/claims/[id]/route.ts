import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveClaim, rejectClaim } from "@/lib/claims";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing claim ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { action, reason } = body as { action?: "approve" | "reject"; reason?: string };

  if (action === "approve") {
    try {
      await approveClaim(id, auth.user.id);
      return NextResponse.json({ ok: true, message: "Claim approved and listing transferred to claimant." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve claim.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (action === "reject") {
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
    }

    try {
      await rejectClaim(id, auth.user.id, reason.trim());
      return NextResponse.json({ ok: true, message: "Claim rejected and claimant notified." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reject claim.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
}
