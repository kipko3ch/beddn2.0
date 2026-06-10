import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface HostBody {
  name?: string;
  phone?: string;
}

// Ensures the signed-in user has a host profile. Creating it via the service
// role avoids any row-level-security edge cases on the `hosts` table.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as HostBody;
  const admin = createAdminClient();

  // Already a host? Return it.
  const { data: existing } = await admin
    .from("hosts")
    .select("id, name, phone, is_verified")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ host: existing });
  }

  const name =
    body.name?.trim() ||
    (auth.user.user_metadata?.full_name as string | undefined) ||
    auth.user.email?.split("@")[0] ||
    "Beddn host";
  const phone = body.phone?.trim() || "";

  const { data: host, error } = await admin
    .from("hosts")
    .insert({ user_id: auth.user.id, name, phone, is_verified: false })
    .select("id, name, phone, is_verified")
    .single();

  if (error || !host) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create host profile" },
      { status: 400 }
    );
  }

  return NextResponse.json({ host });
}
