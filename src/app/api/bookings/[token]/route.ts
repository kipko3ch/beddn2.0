import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const cleanToken = token.trim();
  const admin = createAdminClient();

  const { data: booking, error } = await admin
    .from("bookings")
    .select(`
      id,
      token,
      booking_token,
      guest_name,
      guest_phone,
      guest_email,
      check_in,
      check_out,
      start_time,
      duration_hours,
      guests,
      guests_count,
      note,
      category,
      status,
      total_amount,
      currency,
      created_at,
      listing:listings(
        id,
        name,
        title,
        slug,
        city,
        area,
        country,
        latitude,
        longitude,
        private_address,
        check_in_instructions,
        listing_images(url, position)
      ),
      host:hosts(
        id,
        name,
        phone
      )
    `)
    .or(`booking_token.eq.${cleanToken},token.eq.${cleanToken},id.eq.${cleanToken}`)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isConfirmed = booking.status === "confirmed" || booking.status === "completed";
  const listing = (booking.listing as any) || {};
  const host = (booking.host as any) || {};

  return NextResponse.json({
    id: booking.id,
    token: booking.booking_token || booking.token || cleanToken,
    guest_name: booking.guest_name,
    guest_phone: booking.guest_phone,
    check_in: booking.check_in,
    check_out: booking.check_out,
    start_time: booking.start_time,
    duration_hours: booking.duration_hours,
    guests: booking.guests_count || booking.guests || 1,
    note: booking.note,
    category: booking.category,
    status: booking.status,
    total_amount: booking.total_amount,
    currency: booking.currency || "KES",
    created_at: booking.created_at,
    listing: {
      id: listing.id,
      name: listing.title || listing.name || "Stay",
      slug: listing.slug,
      city: listing.city,
      area: listing.area,
      country: listing.country,
      latitude: listing.latitude,
      longitude: listing.longitude,
      private_address: isConfirmed ? listing.private_address : null,
      check_in_instructions: isConfirmed ? listing.check_in_instructions : null,
      listing_images: listing.listing_images || [],
    },
    host_phone: isConfirmed || host.phone ? host.phone : null,
    host_name: host.name || "Host",
  });
}
