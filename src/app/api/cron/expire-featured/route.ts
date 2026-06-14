import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Retires featured placements whose window has closed, and promotes scheduled
// placements whose window has opened. Trigger from a scheduled job with
// ?secret=<CRON_SECRET>, or call while signed in as an admin. Reads also expire
// lazily, so this is a backstop / bookkeeping pass for the admin view.

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
  const nowIso = new Date().toISOString();

  const { data: expired } = await admin
    .from("featured_listings")
    .update({ status: "expired" })
    .in("status", ["active", "scheduled"])
    .lt("end_date", nowIso)
    .select("id");

  const { data: activated } = await admin
    .from("featured_listings")
    .update({ status: "active" })
    .eq("status", "scheduled")
    .lte("start_date", nowIso)
    .gte("end_date", nowIso)
    .select("id");

  return NextResponse.json({
    ok: true,
    expired: expired?.length ?? 0,
    activated: activated?.length ?? 0,
  });
}
