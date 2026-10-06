import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAndNormalizePhone } from "@/lib/phone";
import { recordAuditLog } from "@/lib/audit";

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
  "owner_id",
  "ownership_state",
  "private_owner_name",
  "private_owner_email",
  "private_notes",
  "contact_phone",
  "contact_name",
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
      .select("id, is_verified, verification_status")
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

async function resolveHostByUserId(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ id: string }> {
  const { data: existingHost } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingHost) return existingHost;

  const { data: userProfile } = await admin
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", userId)
    .maybeSingle();

  const { data: newHost, error } = await admin
    .from("hosts")
    .insert({
      user_id: userId,
      name: userProfile?.full_name || userProfile?.email?.split("@")[0] || "Beddn Host",
      phone: userProfile?.phone || "",
      is_verified: false,
    })
    .select("id")
    .single();

  if (error || !newHost) {
    throw new Error(`Could not resolve host profile for user: ${error?.message}`);
  }
  return newHost;
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
  if (urls.length === 0) return "Oops, photos are required before publishing. Please add at least one photo.";
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
  if (!hostId && !isAdmin) {
    return NextResponse.json(
      { error: hostCreateError ?? "Could not resolve host profile" },
      { status: 400 }
    );
  }

  const row: AnyRecord = {
    ...pick(body.payload, HOST_FIELDS),
    ...(isAdmin ? pick(body.payload, ADMIN_FIELDS) : {}),
    updated_at: new Date().toISOString(),
  };

  // When ready to go live, don't wait for admin confirmation — publish directly live.
  if (row.listing_status === "draft") {
    row.listing_status = "draft";
    row.is_active = false;
  } else {
    row.listing_status = "active";
    row.is_active = true;
  }

  // Handle ownership assignment
  let targetOwnershipState: "owned" | "managed_by_admin" | "unclaimed" = "owned";
  let targetOwnerId: string | null = auth.user.id;
  let targetHostId: string | null = hostId || null;

  if (isAdmin && body.payload.ownership_state) {
    const requestedState = body.payload.ownership_state as string;
    if (requestedState === "unclaimed") {
      targetOwnershipState = "unclaimed";
      targetOwnerId = null;
      targetHostId = null;

      // Unclaimed listing phone validation
      const rawContactPhone = body.payload.contact_phone;
      const isPublishing = row.listing_status !== "draft";
      if (isPublishing || rawContactPhone) {
        const phoneVal = validateAndNormalizePhone(rawContactPhone);
        if (!phoneVal.isValid) {
          return NextResponse.json(
            { error: phoneVal.error || "A valid contact phone with country code is required for unclaimed listings." },
            { status: 400 }
          );
        }
        row.contact_phone = phoneVal.normalized;
      }
      row.contact_name = (body.payload.contact_name as string)?.trim() || "Beddn";
    } else if (requestedState === "managed_by_admin") {
      targetOwnershipState = "managed_by_admin";
      const assignedUserId = (body.payload.owner_id as string) || auth.user.id;
      targetOwnerId = assignedUserId;
      const assignedHost = await resolveHostByUserId(admin, assignedUserId);
      targetHostId = assignedHost.id;
      row.contact_phone = null;
      row.contact_name = null;
    }
  }

  row.ownership_state = targetOwnershipState;
  row.owner_id = targetOwnerId;
  row.host_id = targetHostId;

  if (isAdmin) {
    row.created_by_admin_id = auth.user.id;
  }

  // If host is verified, automatically mark any listing they create as verified
  const isHostVerified = Boolean(
    host && ((host as any).is_verified === true || (host as any).verification_status === "verified")
  );
  if (isHostVerified) {
    row.is_verified = true;
    row.verification_status = "verified";
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

  // Audit log for admin created listing
  if (isAdmin) {
    await recordAuditLog({
      actorId: auth.user.id,
      action: "admin_created_listing",
      entityType: "listing",
      entityId: listing.id,
      details: {
        ownership_state: targetOwnershipState,
        owner_id: targetOwnerId,
        contact_phone: row.contact_phone,
      },
    });
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
    .select("id, host_id, owner_id, ownership_state, listing_status")
    .eq("id", body.listingId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Permission check: admin can edit any listing; host can edit if they are owner or host_id matches
  const isOwner = Boolean(
    (existing as any).owner_id === auth.user.id ||
    (host && existing.host_id === host.id)
  );

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row: AnyRecord = {
    ...pick(body.payload, HOST_FIELDS),
    ...(isAdmin ? pick(body.payload, ADMIN_FIELDS) : {}),
    updated_at: new Date().toISOString(),
  };

  // When ready to go live, publish directly live without waiting for admin confirmation.
  if ("listing_status" in row) {
    if (row.listing_status === "draft") {
      row.listing_status = "draft";
      row.is_active = false;
    } else {
      row.listing_status = "active";
      row.is_active = true;
    }
  }

  // Handle Admin reassign, unassign, or handover
  if (isAdmin && "ownership_state" in body.payload) {
    const requestedState = body.payload.ownership_state as string;
    if (requestedState === "unclaimed") {
      row.ownership_state = "unclaimed";
      row.owner_id = null;
      row.host_id = null;

      const rawContactPhone = body.payload.contact_phone;
      const isPublishing = (row.listing_status || existing.listing_status) !== "draft";
      if (isPublishing || rawContactPhone) {
        const phoneVal = validateAndNormalizePhone(rawContactPhone);
        if (!phoneVal.isValid) {
          return NextResponse.json(
            { error: phoneVal.error || "A valid contact phone with country code is required for unclaimed listings." },
            { status: 400 }
          );
        }
        row.contact_phone = phoneVal.normalized;
      }
      row.contact_name = (body.payload.contact_name as string)?.trim() || "Beddn";
    } else if (requestedState === "managed_by_admin" || requestedState === "owned") {
      row.ownership_state = requestedState;
      const assignedUserId = (body.payload.owner_id as string) || (existing as any).owner_id || auth.user.id;
      row.owner_id = assignedUserId;
      const assignedHost = await resolveHostByUserId(admin, assignedUserId);
      row.host_id = assignedHost.id;
      row.contact_phone = null;
      row.contact_name = null;
    }
  }

  // If host is verified, automatically maintain/mark listing as verified on update
  const isHostVerified = Boolean(
    host && ((host as any).is_verified === true || (host as any).verification_status === "verified")
  );
  if (isHostVerified) {
    row.is_verified = true;
    row.verification_status = "verified";
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

  if (isAdmin) {
    await recordAuditLog({
      actorId: auth.user.id,
      action: "admin_updated_listing",
      entityType: "listing",
      entityId: body.listingId,
      details: {
        ownership_state: row.ownership_state || existing.ownership_state,
        owner_id: row.owner_id,
      },
    });
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
