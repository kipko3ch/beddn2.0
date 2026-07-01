import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildBookingWindow,
  calculateBookingAmounts,
  getListingCategories,
  listingTitle,
  type ReservationInput,
} from "@/lib/bookings/shared";
import { sendSms, sendAdminSms } from "@/lib/notifications/server";
import type { Listing, ListingCategory } from "@/lib/types";

// Free "Request to book" — creates a booking in `requested` status with no
// payment. The host confirms or rejects it from their dashboard; confirming
// locks the calendar. Payments can layer on later without changing this flow.
function normalizeInput(body: Partial<ReservationInput>): ReservationInput {
  if (!body.listingId || !body.guestName || !body.guestPhone || !body.category || !body.checkIn) {
    throw new Error("Missing booking details");
  }
  return {
    listingId: body.listingId,
    guestName: body.guestName.trim(),
    guestPhone: body.guestPhone.trim(),
    guestEmail: body.guestEmail?.trim() || null,
    category: body.category as ListingCategory,
    checkIn: body.checkIn,
    checkOut: body.checkOut || null,
    startTime: body.startTime || null,
    durationHours: body.durationHours ? Number(body.durationHours) : null,
    guestsCount: Math.max(1, Number(body.guestsCount || 1)),
    unitsReserved: Math.max(1, Number(body.unitsReserved || 1)),
    note: body.note?.trim() || null,
  };
}

export async function POST(request: Request) {
  try {
    // Booking requests require a signed-in guest (keeps them accountable).
    const serverSupabase = await createServerSupabase();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to request a booking." }, { status: 401 });
    }

    const input = normalizeInput((await request.json()) as Partial<ReservationInput>);
    const admin = createAdminClient();

    const { data: listingData, error: listingError } = await admin
      .from("listings")
      .select("*, host:hosts(user_id, phone)")
      .eq("id", input.listingId)
      .single();

    if (listingError || !listingData) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const listing = listingData as Listing & { host?: { user_id?: string; phone?: string } | null };
    if (!listing.is_active) {
      return NextResponse.json({ error: "This listing is not accepting requests right now." }, { status: 400 });
    }

    const categories = getListingCategories(listing);
    if (!categories.includes(input.category)) {
      return NextResponse.json({ error: "This booking type is not available for this listing" }, { status: 400 });
    }

    // A host can't request their own listing.
    if (listing.host?.user_id && listing.host.user_id === user.id) {
      return NextResponse.json({ error: "You can't request your own listing." }, { status: 400 });
    }

    const { start, end, durationHours } = buildBookingWindow(input, listing);
    const amounts = calculateBookingAmounts(listing, input, start, end);

    const legacyCheckIn = start.toISOString().slice(0, 10);
    const legacyCheckOut = input.category === "overnight" ? end.toISOString().slice(0, 10) : null;
    const legacyStartTime = input.category === "overnight" ? null : start.toISOString().slice(11, 16);

    const { data: bookingData, error: bookingError } = await admin
      .from("bookings")
      .insert({
        listing_id: listing.id,
        host_id: listing.host_id,
        user_id: user.id,
        guest_name: input.guestName,
        guest_phone: input.guestPhone,
        guest_email: input.guestEmail,
        category: input.category,
        check_in: legacyCheckIn,
        check_out: legacyCheckOut,
        start_time: legacyStartTime,
        duration_hours: input.category === "hourly" ? durationHours : null,
        guests: input.guestsCount,
        guests_count: input.guestsCount,
        units_reserved: input.unitsReserved,
        note: input.note,
        request_note: input.note,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        total_amount: amounts.totalAmount,
        // Free request — no money is collected up front.
        deposit_amount: 0,
        platform_fee_amount: 0,
        host_payout_amount: amounts.hostPayoutAmount,
        currency: amounts.currency,
        status: "requested",
        source: "web_request",
      })
      .select("id, booking_token, token")
      .single();

    if (bookingError || !bookingData) {
      return NextResponse.json(
        { error: bookingError?.message || "Could not create the request" },
        { status: 400 }
      );
    }

    const booking = bookingData as { id: string; booking_token?: string; token?: string };
    const code = booking.booking_token || booking.token || "BEDDN";
    const title = listingTitle(listing);

    // Tell the host they have a request to act on.
    await Promise.allSettled([
      listing.host?.phone
        ? sendSms({
            to: listing.host.phone,
            bookingId: booking.id,
            eventType: "host_new_request",
            message: `New Beddn booking request for ${title} (${code}). Open your dashboard to confirm or decline.`,
          })
        : Promise.resolve(),
      sendAdminSms(`New Beddn booking request: ${title} (${code}).`, booking.id),
    ]);

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      bookingToken: booking.booking_token || booking.token,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the request" },
      { status: 500 }
    );
  }
}
