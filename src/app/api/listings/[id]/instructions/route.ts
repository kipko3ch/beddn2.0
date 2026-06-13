import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeExternalUrl } from "@/lib/links";
import type { GuestInstruction, ListingInstruction } from "@/lib/types";

// Returns a listing's instructions with per-item visibility enforced
// SERVER-SIDE: locked items ship title + type only — never description or url.
//   PUBLIC               → always unlocked
//   AFTER_LOGIN          → unlocked once signed in
//   AFTER_INQUIRY        → unlocked once this user has an inquiry on the listing
//   PRIVATE_TO_CONFIRMED → never unlocked for now
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("listing_instructions")
    .select("*")
    .eq("listing_id", id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ListingInstruction[];

  // Who is asking, and have they inquired on this listing?
  let signedIn = false;
  let hasInquiry = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      const { data: inquiry } = await admin
        .from("inquiries")
        .select("id")
        .eq("listing_id", id)
        .eq("guest_user_id", user.id)
        .limit(1)
        .maybeSingle();
      hasInquiry = Boolean(inquiry);
    }
  } catch {
    signedIn = false;
  }

  function unlocked(visibility: ListingInstruction["visibility"]): boolean {
    switch (visibility) {
      case "PUBLIC":
        return true;
      case "AFTER_LOGIN":
        return signedIn;
      case "AFTER_INQUIRY":
        return hasInquiry;
      default:
        return false; // PRIVATE_TO_CONFIRMED
    }
  }

  const instructions: GuestInstruction[] = rows.map((row) => {
    const open = unlocked(row.visibility);
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      visibility: row.visibility,
      locked: !open,
      description: open ? row.description : null,
      // Only ship safe external URLs, and only when unlocked.
      url: open ? safeExternalUrl(row.url) : null,
    };
  });

  return NextResponse.json(
    { instructions, signedIn, hasInquiry },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

// Owner/admin: confirm the caller may manage this listing's instructions.
async function authorizeManage(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [{ data: profile }, { data: listing }] = await Promise.all([
    admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    admin.from("listings").select("id, host:hosts(user_id)").eq("id", listingId).maybeSingle(),
  ]);
  const ownerId = (listing?.host as { user_id?: string } | null)?.user_id;
  if (profile?.is_admin || ownerId === user.id) return admin;
  return null;
}

const VALID_TYPES = [
  "CHECK_IN", "HOUSE_RULE", "ARRIVAL", "PARKING", "WIFI", "SECURITY",
  "LOCAL_TIP", "GROUP_LINK", "WEBSITE_LINK", "ACTIVITY", "NOTE", "OTHER",
];
const VALID_VIS = ["PUBLIC", "AFTER_LOGIN", "AFTER_INQUIRY", "PRIVATE_TO_CONFIRMED"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await authorizeManage(id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as Partial<ListingInstruction>;
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  // Reject unsafe URLs outright so they never reach the DB.
  if (body.url && !safeExternalUrl(body.url)) {
    return NextResponse.json({ error: "That link is not allowed." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("listing_instructions")
    .insert({
      listing_id: id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      type: VALID_TYPES.includes(body.type as string) ? body.type : "OTHER",
      url: body.url ? safeExternalUrl(body.url) : null,
      visibility: VALID_VIS.includes(body.visibility as string) ? body.visibility : "PUBLIC",
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instruction: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await authorizeManage(id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as Partial<ListingInstruction> & { id?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (body.url && !safeExternalUrl(body.url)) {
    return NextResponse.json({ error: "That link is not allowed." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.type !== undefined && VALID_TYPES.includes(body.type)) updates.type = body.type;
  if (body.url !== undefined) updates.url = body.url ? safeExternalUrl(body.url) : null;
  if (body.visibility !== undefined && VALID_VIS.includes(body.visibility))
    updates.visibility = body.visibility;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { error } = await admin
    .from("listing_instructions")
    .update(updates)
    .eq("id", body.id)
    .eq("listing_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await authorizeManage(id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const instructionId = new URL(request.url).searchParams.get("instructionId");
  if (!instructionId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await admin
    .from("listing_instructions")
    .delete()
    .eq("id", instructionId)
    .eq("listing_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
