import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitClaim, sendClaimOtp, checkRateLimit } from "@/lib/claims";
import type { ClaimRelationship } from "@/lib/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ hasPendingClaim: false });
  }

  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");

  if (!listingId) {
    return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: claim } = await admin
    .from("listing_claims")
    .select("id, status")
    .eq("listing_id", listingId)
    .eq("user_id", auth.user.id)
    .eq("status", "pending")
    .maybeSingle();

  return NextResponse.json({
    hasPendingClaim: Boolean(claim),
    claimId: claim?.id,
  });
}

export async function POST(request: Request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Rate limit claim submissions (max 4 submissions per hour per IP)
  const rateCheck = checkRateLimit(`claim:ip:${clientIp}`, 4, 3600);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many claim submissions from your network. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const {
    listingId,
    relationship,
    message,
    fullName,
    email,
    password,
  } = body as {
    listingId?: string;
    relationship?: ClaimRelationship;
    message?: string;
    fullName?: string;
    email?: string;
    password?: string;
  };

  if (!listingId) {
    return NextResponse.json({ error: "Missing listing ID." }, { status: 400 });
  }

  const validRelationships: ClaimRelationship[] = ["owner", "manager", "caretaker"];
  if (!relationship || !validRelationships.includes(relationship)) {
    return NextResponse.json({ error: "Please select a valid relationship (Owner, Manager, or Caretaker)." }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: auth } = await supabase.auth.getUser();

  let targetUserId = auth.user?.id;
  let targetEmail = auth.user?.email;
  let targetFullName = (auth.user?.user_metadata?.full_name as string) || fullName?.trim() || "";
  let isEmailVerified = Boolean(auth.user?.email_confirmed_at);

  // If user is not logged in, create the account now
  if (!targetUserId) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    const cleanName = (fullName || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    // Try to create user
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      user_metadata: { full_name: cleanName },
      email_confirm: false,
    });

    if (createError) {
      if (createError.message?.toLowerCase().includes("already registered") || createError.message?.toLowerCase().includes("unique constraint")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in first.", userExists: true },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: createError.message || "Could not create account." }, { status: 400 });
    }

    targetUserId = newUser.user.id;
    targetEmail = cleanEmail;
    targetFullName = cleanName;
    isEmailVerified = false;
  }

  if (!targetEmail) {
    return NextResponse.json({ error: "Could not resolve claimant email." }, { status: 400 });
  }

  try {
    const { claim, emailMatchesOwner } = await submitClaim({
      listingId,
      userId: targetUserId,
      fullName: targetFullName,
      email: targetEmail,
      relationship,
      message,
      emailVerified: isEmailVerified,
      clientIp,
    });

    // If email is not yet verified, send OTP
    if (!isEmailVerified) {
      const { data: listing } = await admin
        .from("listings")
        .select("name, title")
        .eq("id", listingId)
        .single();
      const listingTitle = listing?.title || listing?.name || "the property";

      const otpResult = await sendClaimOtp(targetEmail, claim.id, listingTitle, clientIp);
      if (!otpResult.success) {
        console.warn("Failed to dispatch OTP during claim creation:", otpResult.error);
      }

      return NextResponse.json({
        ok: true,
        claimId: claim.id,
        needsOtp: true,
        email: targetEmail,
        emailMatchesOwner,
      });
    }

    return NextResponse.json({
      ok: true,
      claimId: claim.id,
      needsOtp: false,
      emailMatchesOwner,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit claim.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
