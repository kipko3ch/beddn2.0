import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Host (or admin) changes a listing's lifecycle state: publish/activate, put on
// hold (paused), or archive. Kept server-side and ownership-checked because the
// browser client can't be trusted to enforce who owns the listing.
type Target = "active" | "paused" | "archived";

const IS_ACTIVE: Record<Target, boolean> = {
  active: true,
  paused: false,
  archived: false,
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { status?: Target };
  const target = body.status;
  if (!target || !(target in IS_ACTIVE)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Ownership: admins can manage any listing; hosts only their own.
  const [{ data: profile }, { data: listing }] = await Promise.all([
    admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    admin
      .from("listings")
      .select("id, host_id, verification_status, host:hosts(user_id, status)")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  const host = listing.host as { user_id?: string; status?: string } | null;
  const isOwner = host?.user_id === user.id;
  if (!profile?.is_admin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // A host can only publish (go Active) once an admin has approved them.
  if (target === "active" && !profile?.is_admin && host?.status !== "approved") {
    return NextResponse.json(
      { error: "Your host account is still pending approval. You can publish once approved." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("listings")
    .update({ listing_status: target, is_active: IS_ACTIVE[target] })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: target });
}
