import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin CRUD for the home page "Popular destinations" tiles.

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", data.user.id)
    .single();

  return profile?.is_admin ? admin : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data, error } = await admin
    .from("popular_destinations")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ destinations: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = (await request.json()) as {
    name?: string;
    search_query?: string;
    image_url?: string;
    position?: number;
  };

  if (!body.name?.trim() || !body.image_url?.trim()) {
    return NextResponse.json({ error: "Name and image are required." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("popular_destinations")
    .insert({
      name: body.name.trim(),
      search_query: body.search_query?.trim() || body.name.trim(),
      image_url: body.image_url.trim(),
      position: body.position ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ destination: data });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    search_query?: string;
    image_url?: string;
    position?: number;
    is_active?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.search_query !== undefined) updates.search_query = body.search_query.trim();
  if (body.image_url !== undefined) updates.image_url = body.image_url.trim();
  if (body.position !== undefined) updates.position = body.position;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { error } = await admin
    .from("popular_destinations")
    .update(updates)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await admin.from("popular_destinations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
