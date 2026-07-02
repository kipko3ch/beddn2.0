import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminSms, sendSms } from "@/lib/notifications/server";
import { sendEmail } from "@/lib/email/server";
import { bookingConfirmedEmail, bookingRejectedEmail } from "@/lib/email/templates";
import { listingTitle } from "@/lib/bookings/shared";
import type { BookingStatus, Listing, ListingCategory } from "@/lib/types";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://beddn.com").replace(/\/$/, "");

interface DbHost {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  is_verified?: boolean;
}

interface DbListing extends Partial<Listing> {
  id: string;
  host_id: string;
  name: string;
  title?: string | null;
  booking_mode?: Listing["booking_mode"];
  verification_status?: Listing["verification_status"];
  listing_status?: Listing["listing_status"];
}

interface DbBooking {
  id: string;
  listing_id: string;
  host_id: string;
  user_id?: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email?: string | null;
  category: ListingCategory;
  status: BookingStatus;
  booking_token?: string | null;
  token?: string | null;
  deposit_amount: number;
  platform_fee_amount: number;
  host_payout_amount: number;
  currency: string;
  payment_id?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  units_reserved?: number | null;
}

interface DbPayment {
  id: string;
  booking_id: string;
  provider_reference: string;
  amount: number;
  currency: string;
  status: string;
}

function bookingCode(booking: Pick<DbBooking, "booking_token" | "token">) {
  return booking.booking_token || booking.token || "BEDDN";
}

// When an overnight booking is confirmed, decrement the per-night inventory in
// listing_calendar_days so those dates can't be double-booked and guests see an
// accurate "rooms left" count. Hourly/experience slots are handled separately
// by reserve_booking_slot / availability_slots.
async function blockCalendarForBooking(
  supabase: ReturnType<typeof createAdminClient>,
  booking: DbBooking,
  listing: DbListing
) {
  if (booking.category !== "overnight") return;
  const start = booking.start_datetime ? new Date(booking.start_datetime) : null;
  const end = booking.end_datetime ? new Date(booking.end_datetime) : null;
  if (!start || Number.isNaN(start.getTime())) return;

  const totalUnits = Math.max(1, Number(listing.total_units ?? 1));
  const reserved = Math.max(1, Number(booking.units_reserved ?? 1));
  const listingId = booking.listing_id;

  const days: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = end && !Number.isNaN(end.getTime()) ? new Date(end) : null;
  if (endDay) endDay.setHours(0, 0, 0, 0);
  if (endDay && endDay > cursor) {
    while (cursor < endDay) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    days.push(cursor.toISOString().slice(0, 10));
  }

  for (const date of days) {
    const { data: existing } = await supabase
      .from("listing_calendar_days")
      .select("units_open")
      .eq("listing_id", listingId)
      .eq("date", date)
      .maybeSingle();
    const current = existing?.units_open ?? totalUnits;
    const nextOpen = Math.max(0, Number(current) - reserved);
    await supabase.from("listing_calendar_days").upsert(
      {
        listing_id: listingId,
        date,
        units_open: nextOpen,
        is_blocked: nextOpen <= 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id,date" }
    );
  }
}

async function getBundle(bookingId: string) {
  const supabase = createAdminClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error("Booking not found");
  }

  const typedBooking = booking as DbBooking;

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", typedBooking.listing_id)
    .single();

  if (listingError || !listing) {
    throw new Error("Listing not found");
  }

  const typedListing = listing as DbListing;

  const { data: host, error: hostError } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", typedBooking.host_id || typedListing.host_id)
    .single();

  if (hostError || !host) {
    throw new Error("Host not found");
  }

  return {
    supabase,
    booking: typedBooking,
    listing: typedListing,
    host: host as DbHost,
  };
}

export async function userCanManageBooking(userId: string, bookingId: string) {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (profile?.is_admin) return true;

  const { data: booking } = await supabase
    .from("bookings")
    .select("host_id")
    .eq("id", bookingId)
    .single();

  if (!booking?.host_id) return false;

  const { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("id", booking.host_id)
    .eq("user_id", userId)
    .single();

  return Boolean(host);
}

export async function handleSuccessfulPayment(reference: string, rawResponse: unknown) {
  const supabase = createAdminClient();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("provider", "paystack")
    .eq("provider_reference", reference)
    .single();

  if (paymentError || !payment) {
    throw new Error("Payment not found");
  }

  const typedPayment = payment as DbPayment;
  const { booking, listing, host } = await getBundle(typedPayment.booking_id);

  await supabase
    .from("payments")
    .update({
      status: "success",
      raw_response: rawResponse,
      verified_at: new Date().toISOString(),
    })
    .eq("id", typedPayment.id);

  if (booking.status === "confirmed" || booking.status === "completed") {
    return { booking, status: booking.status };
  }

  const autoAccept =
    listing.booking_mode === "auto_accept" &&
    listing.verification_status === "verified" &&
    listing.listing_status === "active";

  if (autoAccept) {
    return confirmBooking(booking.id, "system");
  }

  await supabase
    .from("bookings")
    .update({
      status: "paid_pending_host",
      payment_id: typedPayment.id,
    })
    .eq("id", booking.id);

  const title = listingTitle(listing);
  const code = bookingCode(booking);

  await Promise.allSettled([
    sendSms({
      to: booking.guest_phone,
      bookingId: booking.id,
      eventType: "user_payment_received",
      message: `Beddn received your reserve fee for ${title}. Your booking ${code} is awaiting host confirmation.`,
    }),
    sendSms({
      to: host.phone,
      bookingId: booking.id,
      eventType: "host_new_paid_booking",
      message: `New Beddn booking request for ${title}. Visit your dashboard to accept or reject. Ref: ${code}.`,
    }),
    sendAdminSms(`New paid Beddn booking awaiting host: ${title} (${code}).`, booking.id),
  ]);

  return { booking: { ...booking, status: "paid_pending_host" as BookingStatus }, status: "paid_pending_host" };
}

export async function handleFailedPayment(reference: string, rawResponse: unknown) {
  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("provider", "paystack")
    .eq("provider_reference", reference)
    .single();

  if (!payment) return;

  const typedPayment = payment as DbPayment;
  await supabase
    .from("payments")
    .update({ status: "failed", raw_response: rawResponse })
    .eq("id", typedPayment.id);

  await supabase
    .from("bookings")
    .update({ status: "payment_failed" })
    .eq("id", typedPayment.booking_id);
}

export async function confirmBooking(bookingId: string, acceptedBy: string) {
  const { supabase, booking, listing, host } = await getBundle(bookingId);

  if (booking.status === "confirmed" || booking.status === "completed") {
    return { booking, status: booking.status };
  }

  const { data: reserved, error: reserveError } = await supabase.rpc(
    "reserve_booking_slot",
    { p_booking_id: bookingId }
  );

  if (reserveError || reserved !== true) {
    await supabase
      .from("bookings")
      .update({ status: "disputed" })
      .eq("id", bookingId);

    await Promise.allSettled([
      sendSms({
        to: booking.guest_phone,
        bookingId,
        eventType: "availability_conflict",
        message: `Beddn received your payment for ${listingTitle(listing)}, but availability changed. Admin will assist you. Ref: ${bookingCode(booking)}.`,
      }),
      sendAdminSms(
        `Payment success but availability conflict for ${listingTitle(listing)} (${bookingCode(booking)}).`,
        bookingId
      ),
    ]);

    return { booking: { ...booking, status: "disputed" as BookingStatus }, status: "disputed" };
  }

  const now = new Date().toISOString();
  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      host_accepted_at: acceptedBy === "system" ? null : now,
      host_confirmed_at: acceptedBy === "system" ? null : now,
    })
    .eq("id", bookingId);

  // Lock the calendar so these dates can't be taken again.
  await blockCalendarForBooking(supabase, booking, listing);

  await supabase.from("host_balances").upsert(
    {
      host_id: booking.host_id || listing.host_id,
      booking_id: booking.id,
      amount: booking.host_payout_amount,
      currency: booking.currency,
      status: "held",
      available_at: null,
    },
    { onConflict: "booking_id" }
  );

  const title = listingTitle(listing);
  const code = bookingCode(booking);

  await Promise.allSettled([
    sendSms({
      to: booking.guest_phone,
      bookingId,
      eventType: "booking_confirmed",
      message: `Your Beddn booking ${code} for ${title} is confirmed. Open your booking page for address and host contact.`,
    }),
    sendSms({
      to: host.phone,
      bookingId,
      eventType: "host_booking_confirmed",
      message: `Beddn booking ${code} for ${title} is confirmed. Guest: ${booking.guest_name}, ${booking.guest_phone}.`,
    }),
    sendAdminSms(`Beddn booking confirmed: ${title} (${code}).`, bookingId),
    ...(booking.guest_email
      ? [
          sendEmail({
            to: booking.guest_email,
            eventType: "booking_confirmed",
            ...bookingConfirmedEmail({
              guestName: booking.guest_name,
              listingName: title,
              bookingCode: code,
              bookingUrl: `${SITE_URL}/booking/${code}`,
            }),
          }),
        ]
      : []),
  ]);

  return { booking: { ...booking, status: "confirmed" as BookingStatus }, status: "confirmed" };
}

export async function rejectBooking(bookingId: string) {
  const { supabase, booking, listing } = await getBundle(bookingId);

  await supabase
    .from("bookings")
    .update({ status: "rejected" })
    .eq("id", bookingId);

  await Promise.allSettled([
    sendSms({
      to: booking.guest_phone,
      bookingId,
      eventType: "booking_rejected",
      message: `Your Beddn booking ${bookingCode(booking)} for ${listingTitle(listing)} was rejected by the host. Admin will assist with resolution/refund.`,
    }),
    sendAdminSms(
      `Host rejected booking ${bookingCode(booking)} for ${listingTitle(listing)}. Manual resolution needed.`,
      bookingId
    ),
    ...(booking.guest_email
      ? [
          sendEmail({
            to: booking.guest_email,
            eventType: "booking_rejected",
            ...bookingRejectedEmail({
              guestName: booking.guest_name,
              listingName: listingTitle(listing),
              bookingCode: bookingCode(booking),
            }),
          }),
        ]
      : []),
  ]);

  return { booking: { ...booking, status: "rejected" as BookingStatus }, status: "rejected" };
}

export async function completeBooking(bookingId: string) {
  const { supabase, booking, listing, host } = await getBundle(bookingId);
  const now = new Date().toISOString();

  await supabase
    .from("bookings")
    .update({ status: "completed", completed_at: now })
    .eq("id", bookingId);

  await supabase
    .from("host_balances")
    .update({ status: "withdrawable", available_at: now })
    .eq("booking_id", bookingId)
    .eq("status", "held");

  await Promise.allSettled([
    sendSms({
      to: booking.guest_phone,
      bookingId,
      eventType: "booking_completed_feedback",
      message: `Thanks for using Beddn. Please leave feedback for ${listingTitle(listing)} using your booking code ${bookingCode(booking)}.`,
    }),
    sendSms({
      to: host.phone,
      bookingId,
      eventType: "host_balance_withdrawable",
      message: `Booking ${bookingCode(booking)} is completed. Your reserve-fee balance is now withdrawable in Beddn.`,
    }),
  ]);

  return { booking: { ...booking, status: "completed" as BookingStatus }, status: "completed" };
}
