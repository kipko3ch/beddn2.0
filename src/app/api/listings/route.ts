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
  "minimum_hours",
  "check_in_time",
  "check_out_time",
  "amenities",
  "house_rules",
  "is_active",
  "listing_status",
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
  payload: AnyRecord;
}

async function resolveContext(userId: string) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: host }] = await Promise.all([
    admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle(),
    admin.from("hosts").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  return { admin, isAdmin: Boolean(profile?.is_admin), host };
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

// Create a listing.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ListingRequest;
  const { admin, isAdmin, host } = await resolveContext(auth.user.id);

  if (!host) {
    return NextResponse.json(
      { error: "Create a host profile before listing." },
      { status: 400 }
    );
  }

  const row: AnyRecord = {
    ...pick(body.payload, HOST_FIELDS),
    ...(isAdmin ? pick(body.payload, ADMIN_FIELDS) : {}),
    host_id: host.id, // never trust client-supplied host_id
    updated_at: new Date().toISOString(),
  };

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

  const { admin, isAdmin, host } = await resolveContext(auth.user.id);

  const { data: existing } = await admin
    .from("listings")
    .select("id, host_id")
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

  const { error } = await admin
    .from("listings")
    .update(row)
    .eq("id", body.listingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await saveImages(admin, body.listingId, body.imageUrls);
  return NextResponse.json({ id: body.listingId });
}
