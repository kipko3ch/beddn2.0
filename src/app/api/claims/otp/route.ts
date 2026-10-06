import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClaimOtp, verifyClaimOtp } from "@/lib/claims";

export async function POST(request: Request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const body = await request.json().catch(() => ({}));
  const { action, claimId, email, code } = body as {
    action?: "resend" | "verify";
    claimId?: string;
    email?: string;
    code?: string;
  };

  if (!claimId || !email) {
    return NextResponse.json({ error: "Missing claim ID or email." }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  const admin = createAdminClient();

  // Validate claim exists
  const { data: claim, error: claimErr } = await admin
    .from("listing_claims")
    .select("id, listing_id, listing:listings(name, title)")
    .eq("id", claimId)
    .single();

  if (claimErr || !claim) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }

  const listingTitle = (claim.listing as any)?.title || (claim.listing as any)?.name || "the property";

  if (action === "resend") {
    const res = await sendClaimOtp(cleanEmail, claimId, listingTitle, clientIp);
    if (!res.success) {
      return NextResponse.json(
        { error: res.error, cooldownRemaining: res.cooldownRemaining },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, message: "A new 6-digit verification code has been sent." });
  }

  if (action === "verify") {
    if (!code) {
      return NextResponse.json({ error: "Please enter the 6-digit code." }, { status: 400 });
    }

    const res = await verifyClaimOtp(cleanEmail, claimId, code);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      emailMatchesOwner: res.emailMatchesOwner,
      message: "Email successfully verified! We will review your claim and get back to you.",
    });
  }

  return NextResponse.json({ error: "Invalid action. Must be 'resend' or 'verify'." }, { status: 400 });
}
