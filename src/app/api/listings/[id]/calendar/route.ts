import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Per-date room / rate management for a listing (Booking.com-style):
//   GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD  -> the day rows in range
//   POST { date, units_open?, price_override?, min_nights?, is_blocked? }
// Ownership-checked: hosts manage only their own listings; admins manage any.

async function authorizeListing(userId: string, listingId: string) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: listing }] = await Promise.all([
    admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle(),
    admin
      .from("listings")
      .select("id, total_units, overnight_price, host:hosts(user_id)")
      .eq("id", listingId)
      .maybeSingle(),
  ]);
  if (!listing) return { ok: false as const, status: 404, error: "Listing not found" };
  const host = listing.host as { user_id?: string } | null;
  if (!profile?.is_admin && host?.user_id !== userId) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, admin, listing };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await authorizeListing(user.id, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = auth.admin.from("listing_calendar_days").select("*").eq("listing_id", id);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query.order("date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    days: data ?? [],
    totalUnits: auth.listing.total_units ?? 1,
    basePrice: auth.listing.overnight_price ?? null,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await authorizeListing(user.id, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    date?: string;
    dates?: string[];
    units_open?: number | null;
    price_override?: number | null;
    min_nights?: number | null;
    is_blocked?: boolean;
  };

  const dates = body.dates?.length ? body.dates : body.date ? [body.date] : [];
  if (dates.length === 0) {
    return NextResponse.json({ error: "No date provided" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.units_open !== undefined) patch.units_open = body.units_open;
  if (body.price_override !== undefined)
    patch.price_override = body.price_override === null ? null : Number(body.price_override);
  if (body.min_nights !== undefined) patch.min_nights = body.min_nights;
  if (body.is_blocked !== undefined) patch.is_blocked = Boolean(body.is_blocked);

  const rows = dates.map((date) => ({ listing_id: id, date, ...patch }));
  const { error } = await auth.admin
    .from("listing_calendar_days")
    .upsert(rows, { onConflict: "listing_id,date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, updated: dates.length });
}
