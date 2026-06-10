import { createAdminClient } from "@/lib/supabase/admin";

// iCal export: a live .ics feed of this listing's unavailable dates (manual
// blocks + confirmed bookings). Hosts paste this URL into Airbnb / Booking.com
// "import calendar" so Beddn bookings block dates there automatically.

function icsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;
  const admin = createAdminClient();

  const [{ data: listing }, { data: blocked }, { data: bookings }] = await Promise.all([
    admin.from("listings").select("id, name, title").eq("id", listingId).maybeSingle(),
    admin.from("blocked_dates").select("id, date, reason").eq("listing_id", listingId),
    admin
      .from("bookings")
      .select("id, start_datetime, end_datetime, status")
      .eq("listing_id", listingId)
      .in("status", ["paid_pending_host", "confirmed", "completed"]),
  ]);

  if (!listing) {
    return new Response("Listing not found", { status: 404 });
  }

  const name = escapeText(listing.title || listing.name || "Beddn listing");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Beddn//Listing Calendar//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${name} (Beddn)`,
  ];

  for (const block of blocked ?? []) {
    const start = new Date(block.date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1); // DTEND is exclusive for all-day events
    lines.push(
      "BEGIN:VEVENT",
      `UID:blocked-${block.id}@beddn`,
      `DTSTART;VALUE=DATE:${icsDate(start)}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      `SUMMARY:${escapeText(block.reason || "Not available")} (Beddn)`,
      "END:VEVENT"
    );
  }

  for (const booking of bookings ?? []) {
    if (!booking.start_datetime) continue;
    const start = new Date(booking.start_datetime);
    const end = booking.end_datetime ? new Date(booking.end_datetime) : new Date(start);
    if (end <= start) end.setDate(start.getDate() + 1);
    // Day-granularity, no guest details — just "booked".
    const endDay = new Date(end);
    if (endDay.toISOString().slice(0, 10) === start.toISOString().slice(0, 10)) {
      endDay.setDate(endDay.getDate() + 1);
    }
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${booking.id}@beddn`,
      `DTSTART;VALUE=DATE:${icsDate(start)}`,
      `DTEND;VALUE=DATE:${icsDate(endDay)}`,
      "SUMMARY:Booked (Beddn)",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="beddn-${listingId}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
