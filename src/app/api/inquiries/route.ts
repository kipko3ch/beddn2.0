import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWhatsAppUrl, normalizeWhatsApp } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email/server";
import { inquiryReceivedEmail } from "@/lib/email/templates";
import type { AvailabilityStatus } from "@/lib/types";

// Lead capture. Login is required before any host contact is revealed; the
// host phone number is only ever returned inside the wa.me link of a saved
// inquiry. Payments/negotiation happen on WhatsApp, off-platform.

interface InquiryBody {
  listingId?: string;
  guestName?: string;
  guestWhatsapp?: string;
  category?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  hourlySlot?: string | null;
  guestsCount?: number;
  message?: string | null;
  availabilityStatus?: AvailabilityStatus;
  sessionId?: string | null;
  utmSource?: string | null;
  // Hidden honeypot — must stay empty for a real human.
  company?: string;
}

const VALID_AVAILABILITY: AvailabilityStatus[] = [
  "AVAILABLE",
  "UNAVAILABLE",
  "NEEDS_CONFIRMATION",
];

// Per-instance rate limit: max submissions per IP within the window.
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "0.0.0.0";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  // Contact reveal requires login — this is the core spam gate.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required to contact host." }, { status: 401 });
  }

  let body: InquiryBody;
  try {
    body = (await request.json()) as InquiryBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: silently accept-looking but reject bots that fill the field.
  if (body.company && body.company.trim() !== "") {
    return NextResponse.json({ error: "Could not send inquiry." }, { status: 400 });
  }

  const guestName = (body.guestName ?? "").trim();
  const guestWhatsapp = normalizeWhatsApp(body.guestWhatsapp ?? "");
  if (guestName.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (guestWhatsapp.length < 7) {
    return NextResponse.json({ error: "Please enter a valid WhatsApp number." }, { status: 400 });
  }
  if (!body.listingId) {
    return NextResponse.json({ error: "Missing listing." }, { status: 400 });
  }

  const ip = clientIp(request);
  const ipHash = hashIp(ip);
  if (rateLimited(ipHash)) {
    return NextResponse.json(
      { error: "Too many inquiries right now. Please try again shortly." },
      { status: 429 }
    );
  }

  const admin = createAdminClient();

  // Listing must exist and be active; pull host + name for the WhatsApp link.
  const { data: listing } = await admin
    .from("listings")
    .select("id, slug, name, title, host_id, is_active, host:hosts(id, phone, user_id)")
    .eq("id", body.listingId)
    .maybeSingle();

  if (!listing || !listing.is_active) {
    return NextResponse.json({ error: "Listing not available." }, { status: 404 });
  }

  const host = (listing.host ?? null) as { id?: string; phone?: string; user_id?: string } | null;

  // A host can't inquire on their own listing.
  if (host?.user_id && host.user_id === user.id) {
    return NextResponse.json(
      { error: "This is your own listing — you can't send yourself an inquiry." },
      { status: 400 }
    );
  }
  const availabilityStatus: AvailabilityStatus = VALID_AVAILABILITY.includes(
    body.availabilityStatus as AvailabilityStatus
  )
    ? (body.availabilityStatus as AvailabilityStatus)
    : "NEEDS_CONFIRMATION";

  // Dedupe: same guest + listing + check-in within 30 min returns the existing
  // lead instead of creating a duplicate.
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: existing } = await admin
    .from("inquiries")
    .select("id")
    .eq("guest_user_id", user.id)
    .eq("listing_id", listing.id)
    .eq("check_in", body.checkIn || null)
    .gte("created_at", since)
    .maybeSingle();

  const listingName = (listing.title || listing.name) as string;

  if (existing) {
    const whatsappUrl = host?.phone
      ? buildWhatsAppUrl(host.phone, {
          listingName,
          guestName,
          category: body.category,
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          hourlySlot: body.hourlySlot,
          guests: body.guestsCount,
        })
      : null;
    return NextResponse.json({ inquiryId: existing.id, whatsappUrl, duplicate: true });
  }

  const { data: inserted, error } = await admin
    .from("inquiries")
    .insert({
      listing_id: listing.id,
      host_id: host?.id ?? listing.host_id ?? null,
      guest_user_id: user.id,
      guest_name: guestName,
      guest_whatsapp: guestWhatsapp,
      category: body.category ?? null,
      check_in: body.checkIn || null,
      check_out: body.checkOut || null,
      hourly_slot: body.hourlySlot || null,
      guests_count: body.guestsCount && body.guestsCount > 0 ? body.guestsCount : 1,
      message: body.message?.trim() || null,
      availability_status: availabilityStatus,
      session_id: body.sessionId || null,
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
      utm_source: body.utmSource || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire the analytics event server-side too (reliable, not blocked by adblock).
  void admin.from("listing_events").insert({
    listing_id: listing.id,
    user_id: user.id,
    event_type: "INQUIRY_SUBMITTED",
    session_id: body.sessionId || null,
    ip_hash: ipHash,
    metadata: { inquiry_id: inserted.id, availability_status: availabilityStatus },
  });

  const whatsappUrl = host?.phone
    ? buildWhatsAppUrl(host.phone, {
        listingName,
        guestName,
        category: body.category,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        hourlySlot: body.hourlySlot,
        guests: body.guestsCount,
      })
    : null;

  // Email the guest a confirmation that primes the review (fire-and-forget;
  // no-ops to a log row when ZeptoMail isn't configured). Uses their auth email.
  if (user.email) {
    const origin = new URL(request.url).origin;
    const reviewUrl = `${origin}/review?listing=${listing.slug}`;
    const { subject, html } = inquiryReceivedEmail({ guestName, listingName, reviewUrl, whatsappUrl });
    void sendEmail({ to: user.email, subject, html, eventType: "inquiry_received" });
  }

  return NextResponse.json({ inquiryId: inserted.id, whatsappUrl });
}

// Host/admin: list inquiries for the caller's listings (or all, if admin).
export async function GET() {
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

  let query = admin
    .from("inquiries")
    .select("*, listing:listings(name, title, city)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!profile?.is_admin) {
    const { data: host } = await admin
      .from("hosts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!host) return NextResponse.json({ inquiries: [] });
    query = query.eq("host_id", host.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ inquiries: data ?? [] });
}

// Host/admin: update an inquiry's status.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; status?: string };
  const allowed = ["NEW", "CONTACTED", "BOOKED", "NOT_BOOKED", "SPAM"];
  if (!body.id || !body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // Hosts may only update inquiries on their own listings.
  let hostId: string | null = null;
  if (!profile?.is_admin) {
    const { data: host } = await admin
      .from("hosts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!host) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    hostId = host.id;
  }

  let update = admin
    .from("inquiries")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id);
  if (hostId) update = update.eq("host_id", hostId);

  const { error } = await update;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
