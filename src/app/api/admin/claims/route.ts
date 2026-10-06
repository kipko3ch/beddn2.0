import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "all";

  let query = admin
    .from("listing_claims")
    .select("*, listing:listings(id, slug, name, title, city, area, ownership_state, private_owner_name, private_owner_email)")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: claims, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Populate claimant details from profiles / auth
  const userIds = Array.from(new Set((claims || []).map((c) => c.user_id)));
  const { data: profiles } = userIds.length > 0
    ? await admin.from("profiles").select("id, email, full_name, phone").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const enrichedClaims = (claims || []).map((c) => ({
    ...c,
    claimant: profileMap.get(c.user_id) || {
      id: c.user_id,
      email: "",
      full_name: c.full_name,
    },
  }));

  return NextResponse.json({ claims: enrichedClaims });
}
