import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, sendAdminSms } from "@/lib/notifications/server";

// Reminds hosts (and admin) about confirmed bookings whose check-in is within
// the next ~48h and that haven't been reminded yet. Trigger from a scheduled
// job with ?secret=<CRON_SECRET>, or call while signed in as an admin.

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const provided =
    new URL(request.url).searchParams.get("secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && provided === secret) return true;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    return Boolean(profile?.is_admin);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id, guest_name, guest_phone, start_datetime, check_in, booking_token, token, reminder_sent_at, host:hosts(phone), listing:listings(name, title)"
    )
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("start_datetime", now.toISOString())
    .lte("start_datetime", soon.toISOString());

  const rows = (bookings ?? []) as Array<{
    id: string;
    guest_name: string;
    start_datetime: string | null;
    check_in: string | null;
    booking_token: string | null;
    token: string | null;
    host?: { phone?: string } | null;
    listing?: { name?: string; title?: string } | null;
  }>;

  let sent = 0;
  for (const b of rows) {
    const title = b.listing?.title || b.listing?.name || "your stay";
    const code = b.booking_token || b.token || "BEDDN";
    const when = (b.start_datetime || b.check_in || "").replace("T", " ").slice(0, 16);

    await Promise.allSettled([
      b.host?.phone
        ? sendSms({
            to: b.host.phone,
            bookingId: b.id,
            eventType: "host_booking_reminder",
            message: `Reminder: ${b.guest_name} arrives soon for ${title} (${code}) on ${when}. Get ready to welcome them.`,
          })
        : Promise.resolve(),
      sendAdminSms(`Upcoming Beddn booking ${code} for ${title} on ${when}.`, b.id),
    ]);

    await admin
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id);
    sent += 1;
  }

  return NextResponse.json({ ok: true, reminded: sent });
}
