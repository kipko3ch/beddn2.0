import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HostNotification } from "@/lib/types";

// GET /api/host/notifications — Fetch host's in-app notifications
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find host record
  const { data: host } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const hostId = host?.id;

  try {
    let query = admin
      .from("host_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (hostId) {
      query = query.or(`host_id.eq.${hostId},user_id.eq.${auth.user.id}`);
    } else {
      query = query.eq("user_id", auth.user.id);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.warn("Error fetching host notifications:", error);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const items = (notifications as HostNotification[]) || [];
    const unreadCount = items.filter((n) => !n.is_read).length;

    return NextResponse.json({
      notifications: items,
      unreadCount,
      hostId: hostId || null,
    });
  } catch (err) {
    console.warn("Exception in GET /api/host/notifications:", err);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PATCH /api/host/notifications — Mark notification(s) as read
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const body = await request.json().catch(() => ({}));
  const { id, all, is_read = true } = body as { id?: string; all?: boolean; is_read?: boolean };

  // Find host
  const { data: host } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const hostId = host?.id;

  try {
    if (all && hostId) {
      await admin
        .from("host_notifications")
        .update({ is_read: true })
        .or(`host_id.eq.${hostId},user_id.eq.${auth.user.id}`);
      return NextResponse.json({ success: true, all: true });
    }

    if (id) {
      await admin
        .from("host_notifications")
        .update({ is_read })
        .eq("id", id);
      return NextResponse.json({ success: true, id, is_read });
    }

    return NextResponse.json({ error: "Missing id or all parameter" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// DELETE /api/host/notifications — Delete single notification or clear read
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const clearRead = searchParams.get("clearRead") === "1";

  const { data: host } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const hostId = host?.id;

  try {
    if (id) {
      await admin.from("host_notifications").delete().eq("id", id);
      return NextResponse.json({ success: true, deleted: id });
    }

    if (clearRead && hostId) {
      await admin
        .from("host_notifications")
        .delete()
        .eq("is_read", true)
        .or(`host_id.eq.${hostId},user_id.eq.${auth.user.id}`);
      return NextResponse.json({ success: true, cleared: true });
    }

    return NextResponse.json({ error: "Missing parameter" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
