import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface HostBody {
  name?: string;
  phone?: string;
}

interface HostProfileUpdate {
  name?: string;
  phone?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

// Read the signed-in user's host profile (for the profile editor).
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("hosts")
    .select("id, name, phone, bio, avatar_url, is_verified")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  return NextResponse.json({ host: rows?.[0] ?? null });
}

// Update the signed-in user's host profile (name, phone, bio, avatar).
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as HostProfileUpdate;
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const hostId = rows?.[0]?.id;
  if (!hostId) {
    return NextResponse.json({ error: "No host profile yet." }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (body.bio !== undefined) update.bio = body.bio?.toString().trim() || null;
  if (body.avatarUrl !== undefined) update.avatar_url = body.avatarUrl || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data: host, error } = await admin
    .from("hosts")
    .update(update)
    .eq("id", hostId)
    .select("id, name, phone, bio, avatar_url, is_verified")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ host });
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

  // Already a host? Return it. limit(1) tolerates any duplicate rows.
  const { data: existingRows } = await admin
    .from("hosts")
    .select("id, name, phone, is_verified")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existingRows && existingRows.length > 0) {
    return NextResponse.json({ host: existingRows[0] });
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
