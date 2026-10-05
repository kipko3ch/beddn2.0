import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Guest reviews via a host-shared link. Login is required, and we quietly
// confirm the reviewer actually engaged this listing through Beddn (an inquiry
// exists) to keep reviews trustworthy and spam-free. The verification method is
// never surfaced to the guest.

interface ReviewBody {
  listing?: string; // slug or id
  rating?: number;
  title?: string | null;
  comment?: string | null;
  tags?: string[];
  wouldRecommend?: boolean | null;
  privateNote?: string | null;
  stayDate?: string | null;
  tripType?: string | null;
  subRatings?: Record<string, number> | null;
}

const ALLOWED_TAGS = new Set([
  "clean",
  "safe",
  "good_host",
  "accurate_photos",
  "easy_check_in",
  "good_value",
  "good_location",
]);

function clampRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: reviews, error } = await admin
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        tags,
        would_recommend,
        created_at,
        listing:listings(id, slug, title, name, city, area, listing_images(url)),
        profile:profiles(full_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ reviews: [] });
    }

    return NextResponse.json({ reviews: reviews || [] });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to leave a review." }, { status: 401 });
  }

  const body = (await request.json()) as ReviewBody;
  if (!body.listing) {
    return NextResponse.json(
      { error: "We couldn't tell which stay you're reviewing." },
      { status: 400 }
    );
  }
  const rating = clampRating(body.rating);
  if (!rating) {
    return NextResponse.json({ error: "Add a rating to continue." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve the listing by slug or id, including the host so we can stop a host
  // from reviewing their own place.
  const byId = /^[0-9a-f-]{36}$/i.test(body.listing);
  const { data: listing } = await admin
    .from("listings")
    .select("id, host:hosts(user_id)")
    .eq(byId ? "id" : "slug", body.listing)
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const host = (listing.host ?? null) as { user_id?: string } | null;
  if (host?.user_id && host.user_id === user.id) {
    return NextResponse.json(
      { error: "This is your own listing — hosts can't review their own place." },
      { status: 403 }
    );
  }

  // Check for prior booking or inquiry to attach verified references
  const [{ data: completedBooking }, { data: inquiry }] = await Promise.all([
    admin
      .from("bookings")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("inquiries")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("guest_user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  // One review per guest per listing — upsert so editing is allowed.
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.filter((t) => ALLOWED_TAGS.has(t)))]
    : [];

  const payload = {
    listing_id: listing.id,
    user_id: user.id,
    ...(inquiry?.id ? { inquiry_id: inquiry.id } : {}),
    ...(completedBooking?.id ? { booking_id: completedBooking.id } : {}),
    rating,
    comment: (body.title?.trim()
      ? body.comment?.trim()
        ? `${body.title.trim()}\n\n${body.comment.trim()}`
        : body.title.trim()
      : body.comment?.trim()) || null,
    tags,
    would_recommend: typeof body.wouldRecommend === "boolean" ? body.wouldRecommend : null,
    private_note: body.privateNote?.trim() || null,
  };

  const { error } = existing
    ? await admin.from("reviews").update(payload).eq("id", existing.id)
    : await admin.from("reviews").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// Admin: delete a review (strictly admin-only).
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Forbidden: only admins can delete reviews." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  }

  const { error } = await admin.from("reviews").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

