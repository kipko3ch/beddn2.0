import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Fields a host is allowed to set on their own listing.
const HOST_FIELDS = [
  "slug",
  "title",
  "name",
  "description",
  "country",
  "city",
  "area",
  "property_type",
  "experience_types",
  "private_address",
  "check_in_instructions",
  "latitude",
  "longitude",
  "categories",
  "category",
  "hourly_price",
  "overnight_price",
  "experience_price",
  "deposit_amount",
  "currency",
  "total_units",
  "available_units",
  "available_days",
  "minimum_hours",
  "check_in_time",
  "check_out_time",
  "amenities",
  "house_rules",
  "listing_status",
  "experience_duration",
  "experience_meeting_point",
  "experience_group_size",
  "experience_requirements",
] as const;

// Fields only an admin may set.
const ADMIN_FIELDS = [
  "booking_mode",
  "platform_fee_type",
  "platform_fee_value",
  "verification_status",
  "is_verified",
] as const;

type AnyRecord = Record<string, unknown>;

function pick(source: AnyRecord, keys: readonly string[]): AnyRecord {
  const out: AnyRecord = {};
  for (const key of keys) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

interface ListingRequest {
  listingId?: string;
  imageUrls?: string[];
  availabilitySlots?: Array<{
    startDatetime: string;
    endDatetime: string;
    totalUnits?: number;
    availableUnits?: number;
  }>;
  payload: AnyRecord;
}

async function resolveContext(userId: string) {
  const admin = createAdminClient();
  const [profileRes, hostRes] = await Promise.all([
    admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle(),
    // limit(1) instead of maybeSingle(): tolerant of duplicate host rows, which
    // would otherwise make maybeSingle() error and look like "no host".
    admin
      .from("hosts")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);
  return {
    admin,
    isAdmin: Boolean(profileRes.data?.is_admin),
    host: hostRes.data?.[0] ?? null,
    hostError: hostRes.error,
  };
}

// Returns the user's host id, creating a host on the fly if none exists, so an
// authenticated user is never blocked at the end of the wizard.
async function ensureHostId(
  admin: ReturnType<typeof createAdminClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  host: { id: string } | null
) {
  if (host) return { hostId: host.id as string, error: null as string | null };
  const { data, error } = await admin
    .from("hosts")
    .insert({
      user_id: user.id,
      name:
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Beddn host",
      phone: "",
      is_verified: false,
    })
    .select("id")
    .single();
  return { hostId: data?.id as string | undefined, error: error?.message ?? null };
}

async function saveImages(
  admin: ReturnType<typeof createAdminClient>,
  listingId: string,
  imageUrls: string[] | undefined
) {
  if (!imageUrls) return;
  await admin.from("listing_images").delete().eq("listing_id", listingId);
  const urls = imageUrls.map((u) => u.trim()).filter(Boolean);
  if (urls.length > 0) {
    await admin
      .from("listing_images")
      .insert(urls.map((url, i) => ({ listing_id: listingId, url, position: i })));
  }
}

async function saveAvailabilitySlots(
  admin: ReturnType<typeof createAdminClient>,
  listingId: string,
  slots: ListingRequest["availabilitySlots"] | undefined,
  fallbackUnits: number
) {
  const rows = (slots ?? [])
    .filter((slot) => slot.startDatetime && slot.endDatetime)
    .map((slot) => {
      const totalUnits = Math.max(1, Number(slot.totalUnits || fallbackUnits || 1));
      const availableUnits = Math.max(0, Number(slot.availableUnits ?? totalUnits));
      return {
        listing_id: listingId,
        start_datetime: slot.startDatetime,
        end_datetime: slot.endDatetime,
        total_units: totalUnits,
        booked_units: 0,
        available_units: Math.min(availableUnits, totalUnits),
        status: availableUnits > 0 ? "available" : "blocked",
      };
    });

  if (rows.length === 0) return;
  await admin.from("availability_slots").upsert(rows, {
    onConflict: "listing_id,start_datetime,end_datetime",
  });
}

function validatePublishable(row: AnyRecord, imageUrls: string[] | undefined) {
  const status = String(row.listing_status ?? "");
  if (status === "draft") return null;
  const categories = Array.isArray(row.categories) ? (row.categories as string[]) : [];
  const urls = (imageUrls ?? []).map((url) => url.trim()).filter(Boolean);
  if (urls.length === 0) return "Oops, add at least one photo before publishing.";
  if (!row.property_type) return "Oops, choose what kind of place this is.";
  if (!row.country || !row.city || !row.area) return "Oops, add the public area guests will see.";
  if (!row.private_address) return "Oops, add the private address before publishing.";
  if (categories.includes("hourly") && Number(row.hourly_price ?? 0) <= 0) {
    return "Oops, add an hourly price before publishing.";
  }
  if (categories.includes("overnight") && Number(row.overnight_price ?? 0) <= 0) {
    return "Oops, add a night price before publishing.";
  }
  if (categories.includes("experience") && Number(row.experience_price ?? 0) <= 0) {
    return "Oops, add an experience price before publishing.";
  }
  return null;
}

// Create a listing.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ListingRequest;
  const { admin, isAdmin, host, hostError } = await resolveContext(auth.user.id);

  // A query error here means the DB was unreachable — surface it instead of the
  // misleading "create a host profile" message.
  if (hostError) {
    return NextResponse.json(
      { error: `Could not verify host profile: ${hostError.message}` },
      { status: 500 }
    );
  }

  const { hostId, error: hostCreateError } = await ensureHostId(
    admin,
    auth.user,
    host
  );
  if (!hostId) {
    return NextResponse.json(
      { error: hostCreateError ?? "Could not resolve host profile" },
      { status: 400 }
    );
  }

  const row: AnyRecord = {
    ...pick(body.payload, HOST_FIELDS),
    ...(isAdmin ? pick(body.payload, ADMIN_FIELDS) : {}),
    host_id: hostId, // never trust client-supplied host_id
    updated_at: new Date().toISOString(),
  };

  // Hosts can't publish themselves live — anything but a draft enters review.
  // (is_active is derived from listing_status by a DB trigger.)
  if (!isAdmin) {
    row.listing_status = row.listing_status === "draft" ? "draft" : "pending_review";
  }

  const publishError = validatePublishable(row, body.imageUrls);
  if (publishError) {
    return NextResponse.json({ error: publishError }, { status: 400 });
  }

  const { data: listing, error } = await admin
    .from("listings")
    .insert(row)
    .select("id, slug")
    .single();

  if (error || !listing) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create listing" },
      { status: 400 }
    );
  }

  await saveImages(admin, listing.id, body.imageUrls);
  await saveAvailabilitySlots(
    admin,
    listing.id,
    body.availabilitySlots,
    Number(row.total_units || 1)
  );
  return NextResponse.json({ id: listing.id, slug: listing.slug });
}

// Update an existing listing.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ListingRequest;
  if (!body.listingId) {
    return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
  }

  const { admin, isAdmin, host, hostError } = await resolveContext(auth.user.id);
  if (hostError) {
    return NextResponse.json(
      { error: `Could not verify host profile: ${hostError.message}` },
      { status: 500 }
    );
  }

  const { data: existing } = await admin
    .from("listings")
    .select("id, host_id, listing_status")
    .eq("id", body.listingId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (!isAdmin && (!host || existing.host_id !== host.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row: AnyRecord = {
    ...pick(body.payload, HOST_FIELDS),
    ...(isAdmin ? pick(body.payload, ADMIN_FIELDS) : {}),
    updated_at: new Date().toISOString(),
  };

  // Hosts can't flip their own visibility. Keep an already-live listing live on
  // edit; otherwise a non-draft save enters review. Admins control status via
  // the admin dashboard, not this field.
  if (!isAdmin && "listing_status" in row) {
    if (row.listing_status === "draft") {
      row.listing_status = "draft";
    } else if (existing.listing_status === "active") {
      row.listing_status = "active";
    } else {
      row.listing_status = "pending_review";
    }
  }

  const publishError = validatePublishable(row, body.imageUrls);
  if (publishError) {
    return NextResponse.json({ error: publishError }, { status: 400 });
  }

  const { error } = await admin
    .from("listings")
    .update(row)
    .eq("id", body.listingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await saveImages(admin, body.listingId, body.imageUrls);
  await saveAvailabilitySlots(
    admin,
    body.listingId,
    body.availabilitySlots,
    Number(row.total_units || 1)
  );
  return NextResponse.json({ id: body.listingId });
}
