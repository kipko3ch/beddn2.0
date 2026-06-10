import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// iCal import: pulls an external calendar (Airbnb, Booking.com, Google) and
// blocks those dates on the Beddn listing, so cross-platform double bookings
// can't happen. Re-running the sync replaces previously imported blocks.

interface ImportBody {
  listingId: string;
  url: string;
}

// Extracts all-day busy ranges from an ICS payload. Handles both
// DTSTART;VALUE=DATE:20260615 and DTSTART:20260615T140000Z forms.
function parseIcsDates(ics: string): { start: Date; end: Date }[] {
  const ranges: { start: Date; end: Date }[] = [];
  // Unfold continuation lines (RFC 5545: lines starting with space/tab).
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const events = unfolded.split("BEGIN:VEVENT").slice(1);

  for (const event of events) {
    const startMatch = event.match(/DTSTART[^:]*:(\d{8})(T\d{6}Z?)?/);
    const endMatch = event.match(/DTEND[^:]*:(\d{8})(T\d{6}Z?)?/);
    if (!startMatch) continue;

    const toDate = (raw: string) =>
      new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00Z`);

    const start = toDate(startMatch[1]);
    // All-day DTEND is exclusive; default to a one-day event when missing.
    const end = endMatch ? toDate(endMatch[1]) : new Date(start.getTime() + 86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    ranges.push({ start, end });
  }
  return ranges;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ImportBody;
  if (!body.listingId || !body.url) {
    return NextResponse.json({ error: "Missing listing id or calendar URL" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Invalid calendar URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Calendar URL must be http(s)" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Only the listing's owner (or an admin) may sync its calendar.
  const [{ data: listing }, { data: profile }, { data: host }] = await Promise.all([
    admin.from("listings").select("id, host_id").eq("id", body.listingId).maybeSingle(),
    admin.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle(),
    admin.from("hosts").select("id").eq("user_id", auth.user.id).maybeSingle(),
  ]);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (!profile?.is_admin && listing.host_id !== host?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let ics = "";
  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: { Accept: "text/calendar, text/plain, */*" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Calendar responded ${response.status}`);
    ics = await response.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Could not fetch calendar: ${err instanceof Error ? err.message : "failed"}` },
      { status: 502 }
    );
  }

  if (!ics.includes("BEGIN:VCALENDAR")) {
    return NextResponse.json({ error: "That URL is not an iCal (.ics) feed" }, { status: 400 });
  }

  // Expand events into individual dates (cap to one year out for safety).
  const horizon = new Date();
  horizon.setFullYear(horizon.getFullYear() + 1);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const dates = new Set<string>();

  for (const { start, end } of parseIcsDates(ics)) {
    for (let d = new Date(start); d < end && d <= horizon; d.setDate(d.getDate() + 1)) {
      if (d >= today) dates.add(d.toISOString().slice(0, 10));
    }
  }

  // Replace previous imports for this listing, keep manual blocks.
  await admin
    .from("blocked_dates")
    .delete()
    .eq("listing_id", body.listingId)
    .eq("reason", "ical_import");

  if (dates.size > 0) {
    const rows = Array.from(dates).map((date) => ({
      listing_id: body.listingId,
      date,
      reason: "ical_import",
    }));
    const { error } = await admin.from("blocked_dates").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ imported: dates.size });
}
