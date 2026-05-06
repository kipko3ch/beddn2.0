import { NextResponse } from "next/server";
import {
  handleFailedPayment,
  handleSuccessfulPayment,
} from "@/lib/bookings/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
  const origin = url.origin;

  if (!reference) {
    return NextResponse.redirect(`${origin}/?payment=missing-reference`);
  }

  let bookingToken: string | null = null;

  try {
    const verified = await verifyPaystackTransaction(reference);
    const admin = createAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("booking:bookings(booking_token, token)")
      .eq("provider", "paystack")
      .eq("provider_reference", reference)
      .single();

    const nestedBooking = payment?.booking as
      | { booking_token?: string | null; token?: string | null }
      | undefined;
    bookingToken = nestedBooking?.booking_token || nestedBooking?.token || null;

    if (verified.status === "success") {
      await handleSuccessfulPayment(reference, verified);
    } else {
      await handleFailedPayment(reference, verified);
    }
  } catch {
    return NextResponse.redirect(`${origin}/?payment=verification-failed`);
  }

  return NextResponse.redirect(
    bookingToken
      ? `${origin}/booking/${bookingToken}`
      : `${origin}/?payment=verified`
  );
}
