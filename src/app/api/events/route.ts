import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingEventType } from "@/lib/types";

// Fire-and-forget analytics ingest. Never fails the caller; best effort.
const VALID_EVENTS: ListingEventType[] = [
  "LISTING_VIEW",
  "CALENDAR_DATE_SELECTED",
  "AVAILABILITY_CHECKED",
  "INQUIRY_STARTED",
  "LOGIN_REQUIRED_FOR_CONTACT",
  "INQUIRY_SUBMITTED",
  "WHATSAPP_CLICK",
  "EXPERIENCE_LINK_CLICK",
  "GROUP_LINK_CLICK",
];

function hashIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  let body: {
    eventType?: string;
    listingId?: string | null;
    sessionId?: string | null;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (!body.eventType || !VALID_EVENTS.includes(body.eventType as ListingEventType)) {
    return NextResponse.json({ ok: true });
  }

  // user_id is best-effort: include it when there is a session, otherwise null.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  try {
    const admin = createAdminClient();
    await admin.from("listing_events").insert({
      listing_id: body.listingId ?? null,
      user_id: userId,
      event_type: body.eventType,
      session_id: body.sessionId ?? null,
      ip_hash: hashIp(request),
      user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
      metadata: body.metadata ?? {},
    });
  } catch {
    // Swallow — analytics must never break the UX.
  }

  return NextResponse.json({ ok: true });
}
