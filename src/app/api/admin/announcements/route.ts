import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/server";
import { hostAnnouncementEmail } from "@/lib/email/templates";
import { createHostNotification } from "@/lib/notifications/host-notifications";
import { ROUTES } from "@/lib/routes";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://beddn.com").replace(/\/$/, "");

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

  const body = await request.json();
  const { title, message, priority = "normal", is_mandatory = false, expires_at = null, send_email = false } = body;

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  }

  // 1. Insert announcement
  const { data: announcement, error: insertError } = await admin
    .from("host_announcements")
    .insert({
      title: title.trim(),
      message: message.trim(),
      priority,
      is_mandatory: Boolean(is_mandatory),
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2. Fetch hosts to notify
  const { data: hosts } = await admin
    .from("hosts")
    .select("id, user_id, name")
    .eq("status", "approved");

  const hostList = hosts || [];

  // 3. Dispatch in-app notifications and optional emails asynchronously in background
  void (async () => {
    for (const h of hostList) {
      try {
        await createHostNotification({
          hostId: h.id,
          userId: h.user_id,
          type: "announcement",
          title: `Announcement: ${title.trim()}`,
          message: message.trim(),
          link: ROUTES.dashboard,
        });

        if (send_email && h.user_id) {
          const { data: userRes } = await admin.auth.admin.getUserById(h.user_id);
          const email = userRes.user?.email;
          if (email) {
            await sendEmail({
              to: email,
              eventType: "host_announcement",
              ...hostAnnouncementEmail({
                hostName: h.name || "Host",
                title: title.trim(),
                message: message.trim(),
                dashboardUrl: `${SITE_URL}${ROUTES.dashboard}`,
              }),
            });
          }
        }
      } catch (err) {
        console.warn(`Failed notifying host ${h.id}:`, err);
      }
    }
  })();

  return NextResponse.json({ ok: true, id: announcement?.id, notifiedCount: hostList.length });
}
