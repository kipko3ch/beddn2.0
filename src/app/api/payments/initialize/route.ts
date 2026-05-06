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
import {
  generatePaystackReference,
  initializePaystackTransaction,
} from "@/lib/payments/paystack";
import type { Listing, ListingCategory } from "@/lib/types";

function fallbackEmail(phone: string) {
  const cleaned = phone.replace(/\D/g, "") || Date.now().toString();
  return `guest-${cleaned}@payments.beddn.africa`;
}

function normalizeInput(body: Partial<ReservationInput>): ReservationInput {
  if (!body.listingId || !body.guestName || !body.guestPhone || !body.category || !body.checkIn) {
    throw new Error("Missing reservation details");
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
    const body = (await request.json()) as Partial<ReservationInput>;
    const input = normalizeInput(body);
    const origin = new URL(request.url).origin;
    const admin = createAdminClient();

    const { data: listingData, error: listingError } = await admin
      .from("listings")
      .select("*")
      .eq("id", input.listingId)
      .single();

    if (listingError || !listingData) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const listing = listingData as Listing;
    const categories = getListingCategories(listing);
    if (!categories.includes(input.category)) {
      return NextResponse.json(
        { error: "This booking type is not available for this listing" },
        { status: 400 }
      );
    }

    const { start, end, durationHours } = buildBookingWindow(input, listing);
    const amounts = calculateBookingAmounts(listing, input, start, end);
    const reference = generatePaystackReference();

    let userId: string | null = null;
    try {
      const serverSupabase = await createServerSupabase();
      const { data } = await serverSupabase.auth.getUser();
      userId = data.user?.id || null;
    } catch {
      userId = null;
    }

    const legacyCheckIn = start.toISOString().slice(0, 10);
    const legacyCheckOut =
      input.category === "overnight" ? end.toISOString().slice(0, 10) : null;
    const legacyStartTime =
      input.category === "overnight" ? null : start.toISOString().slice(11, 16);

    const { data: bookingData, error: bookingError } = await admin
      .from("bookings")
      .insert({
        listing_id: listing.id,
        host_id: listing.host_id,
        user_id: userId,
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
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        total_amount: amounts.totalAmount,
        deposit_amount: amounts.depositAmount,
        platform_fee_amount: amounts.platformFeeAmount,
        host_payout_amount: amounts.hostPayoutAmount,
        currency: amounts.currency,
        status: "pending_payment",
      })
      .select("id, booking_token, token")
      .single();

    if (bookingError || !bookingData) {
      return NextResponse.json(
        { error: bookingError?.message || "Could not create booking" },
        { status: 400 }
      );
    }

    const booking = bookingData as { id: string; booking_token?: string; token?: string };
    const { data: paymentData, error: paymentError } = await admin
      .from("payments")
      .insert({
        booking_id: booking.id,
        provider: "paystack",
        provider_reference: reference,
        reference,
        amount: amounts.depositAmount,
        currency: amounts.currency,
        status: "initialized",
        customer_phone: input.guestPhone,
        customer_email: input.guestEmail,
        method: "paystack",
      })
      .select("id")
      .single();

    if (paymentError || !paymentData) {
      return NextResponse.json(
        { error: paymentError?.message || "Could not create payment" },
        { status: 400 }
      );
    }

    await admin
      .from("bookings")
      .update({ payment_id: paymentData.id })
      .eq("id", booking.id);

    const paystack = await initializePaystackTransaction({
      amount: amounts.depositAmount,
      currency: amounts.currency,
      email: input.guestEmail || fallbackEmail(input.guestPhone),
      reference,
      callbackUrl: `${origin}/api/payments/paystack/callback`,
      metadata: {
        booking_id: booking.id,
        booking_token: booking.booking_token || booking.token,
        listing_id: listing.id,
        listing_title: listingTitle(listing),
        customer_phone: input.guestPhone,
      },
    });

    return NextResponse.json({
      bookingId: booking.id,
      bookingToken: booking.booking_token || booking.token,
      paymentReference: reference,
      authorizationUrl: paystack.authorization_url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment initialization failed" },
      { status: 500 }
    );
  }
}
