import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminSms } from "@/lib/notifications/server";

interface FeedbackBody {
  bookingToken: string;
  guestPhone: string;
  rating: number;
  cleanliness?: number | null;
  accuracy?: number | null;
  safety?: number | null;
  communication?: number | null;
  comment?: string | null;
  wouldBookAgain?: boolean | null;
  issueReported?: boolean;
  issueType?: string | null;
  isPublicReview?: boolean;
}

function score(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(5, Math.max(1, numeric)) : null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as FeedbackBody;
  const token = body.bookingToken?.trim();
  const phone = body.guestPhone?.trim();
  const rating = score(body.rating);

  if (!token || !phone || !rating) {
    return NextResponse.json({ error: "Missing feedback details" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, guest_phone, status, user_id, listing_id")
    .eq("booking_token", token)
    .single();

  if (!booking || booking.guest_phone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status !== "completed") {
    return NextResponse.json(
      { error: "Feedback is available after the booking is completed" },
      { status: 400 }
    );
  }

  const isPublicReview = Boolean(body.isPublicReview && booking.user_id);

  const { error } = await supabase.from("feedback").upsert(
    {
      booking_id: booking.id,
      rating,
      cleanliness: score(body.cleanliness),
      accuracy: score(body.accuracy),
      safety: score(body.safety),
      communication: score(body.communication),
      comment: body.comment?.trim() || null,
      would_book_again: body.wouldBookAgain ?? null,
      issue_reported: Boolean(body.issueReported),
      issue_type: body.issueType?.trim() || null,
      is_public_review: isPublicReview,
    },
    { onConflict: "booking_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (isPublicReview) {
    await supabase.from("reviews").upsert(
      {
        booking_id: booking.id,
        listing_id: booking.listing_id,
        user_id: booking.user_id,
        rating,
        comment: body.comment?.trim() || null,
      },
      { onConflict: "booking_id" }
    );
  }

  if (rating <= 2 || body.issueReported) {
    await sendAdminSms(
      `Beddn feedback alert: rating ${rating}/5 for booking ${token}. ${body.issueType || "Issue reported"}`,
      booking.id
    );
  }

  return NextResponse.json({ ok: true });
}
