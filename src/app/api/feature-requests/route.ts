import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminSms } from "@/lib/notifications/server";

// Hosts -> Beddn feature requests ("Suggest a feature"). Distinct from guest
// `feedback`. Hosts submit and see their own; admins see all via the admin API.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: host } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let query = admin
    .from("feature_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // A host sees their own requests; if they aren't a host yet, none.
  query = host ? query.eq("host_id", host.id) : query.eq("user_id", user.id);

  const { data } = await query;
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { title?: string; detail?: string };
  const title = body.title?.trim();
  if (!title || title.length < 3) {
    return NextResponse.json({ error: "Give your idea a short title." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: host } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data, error } = await admin
    .from("feature_requests")
    .insert({
      host_id: host?.id ?? null,
      user_id: user.id,
      title,
      detail: body.detail?.trim() || null,
      status: "new",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sendAdminSms(`New Beddn host feature request: "${title}".`);
  return NextResponse.json({ ok: true, id: data.id });
}
