import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  const file = fs.readFileSync(".env.local", "utf8");
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || env[match[1]] !== undefined) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(url, serviceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const password = env.BEDDN_TEST_PASSWORD || "BeddnTest123!";
const hostEmail = env.BEDDN_TEST_HOST_EMAIL || "host@beddn.test";
const guestEmail = env.BEDDN_TEST_GUEST_EMAIL || "guest@beddn.test";

async function assertTables() {
  for (const table of ["profiles", "hosts", "listings"]) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      throw new Error(
        `Missing table "${table}". Apply supabase/schema.sql and supabase/migrations/20260506000000_beddn_mvp_booking_system.sql first.`
      );
    }
  }
}

async function hasMvpListingColumns() {
  const { error } = await supabase
    .from("listings")
    .select("id,title,currency,booking_mode,total_units,verification_status,listing_status")
    .limit(1);
  return !error;
}

async function findOrCreateUser(email, metadata) {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = listData.users.find((user) => user.email === email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  return data.user;
}

async function upsertProfile(user, isAdmin = false) {
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
    phone: user.user_metadata?.phone || null,
    is_admin: isAdmin,
  });
  if (error) throw error;
}

async function upsertHost(user) {
  const { data: existing } = await supabase
    .from("hosts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("hosts")
      .update({
        name: "Beddn Test Host",
        phone: "+254700000001",
        is_verified: true,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("hosts")
    .insert({
      user_id: user.id,
      name: "Beddn Test Host",
      phone: "+254700000001",
      is_verified: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertListing(hostId, mvpColumns) {
  const slug = "test-nairobi-suite";
  const legacyPayload = {
    host_id: hostId,
    slug,
    name: "Test Nairobi Suite",
    description:
      "A verified test listing for Beddn MVP booking, Paystack, SMS, host acceptance, and availability checks.",
    country: "Kenya",
    city: "Nairobi",
    area: "Westlands",
    private_address: "Test building, Westlands, Nairobi",
    latitude: -1.2676,
    longitude: 36.8108,
    categories: ["hourly", "overnight"],
    hourly_price: 1500,
    overnight_price: 6500,
    experience_price: null,
    deposit_amount: 1000,
    amenities: ["WiFi", "Parking", "Hot water", "Security"],
    house_rules: "Respect check-in instructions. Keep the host updated by phone.",
    is_active: true,
    is_verified: true,
  };

  const mvpPayload = mvpColumns
    ? {
        title: legacyPayload.name,
        category: legacyPayload.categories,
        approximate_location_public: true,
        check_in_instructions:
          "Call the host when you arrive. Exact unit details are shared after confirmation.",
        currency: "KES",
        total_units: 3,
        available_units: 3,
        booking_mode: "manual_accept",
        verification_status: "verified",
        listing_status: "active",
        platform_fee_type: "fixed",
        platform_fee_value: 200,
        check_in_time: "14:00",
        check_out_time: "10:00",
        minimum_hours: 2,
        available_days: [0, 1, 2, 3, 4, 5, 6],
      }
    : {};

  const payload = { ...legacyPayload, ...mvpPayload };
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const result = existing
    ? await supabase.from("listings").update(payload).eq("id", existing.id).select("id").single()
    : await supabase.from("listings").insert(payload).select("id").single();

  if (result.error) throw result.error;

  await supabase.from("listing_images").delete().eq("listing_id", result.data.id);
  await supabase.from("listing_images").insert([
    {
      listing_id: result.data.id,
      url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
      position: 0,
    },
    {
      listing_id: result.data.id,
      url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
      position: 1,
    },
  ]);

  return result.data.id;
}

await assertTables();
const mvpColumns = await hasMvpListingColumns();
const host = await findOrCreateUser(hostEmail, {
  full_name: "Beddn Test Host",
  phone: "+254700000001",
});
const guest = await findOrCreateUser(guestEmail, {
  full_name: "Beddn Test Guest",
  phone: "+254700000002",
});

await upsertProfile(host, false);
await upsertProfile(guest, false);
const hostId = await upsertHost(host);
const listingId = await upsertListing(hostId, mvpColumns);

console.log("Seed complete");
console.log(`Host login: ${hostEmail}`);
console.log(`Guest login: ${guestEmail}`);
console.log(`Password: ${password}`);
console.log(`Listing slug: test-nairobi-suite`);
console.log(`Listing id: ${listingId}`);
