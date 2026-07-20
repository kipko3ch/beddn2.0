import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface BlockBody {
  listingId: string;
  startDatetime: string;
  endDatetime: string;
  // How many units to mark unavailable. Defaults to the whole listing.
  units?: number;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BlockBody;
  if (!body.listingId || !body.startDatetime || !body.endDatetime) {
    return NextResponse.json({ error: "Missing slot details" }, { status: 400 });
  }
  const start = new Date(body.startDatetime);
  const end = new Date(body.endDatetime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", data.user.id)
    .single();

  const { data: listing } = await admin
    .from("listings")
    .select("id, host_id, total_units, host:hosts(user_id)")
    .eq("id", body.listingId)
    .single();

  const host = listing?.host as { user_id?: string } | null;
  if (!listing || (!profile?.is_admin && host?.user_id !== data.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const totalUnits = listing.total_units || 1;
  // Block the requested number of units (default: the whole listing). Clamp to
  // the listing's capacity so available_units never goes negative.
  const blockedUnits = Math.min(
    totalUnits,
    Math.max(1, Math.round(Number(body.units) || totalUnits))
  );
  const availableUnits = totalUnits - blockedUnits;

  const { error } = await admin.from("availability_slots").upsert(
    {
      listing_id: body.listingId,
      start_datetime: body.startDatetime,
      end_datetime: body.endDatetime,
      total_units: totalUnits,
      booked_units: blockedUnits,
      available_units: availableUnits,
      status: availableUnits > 0 ? "limited" : "blocked",
    },
    { onConflict: "listing_id,start_datetime,end_datetime" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
