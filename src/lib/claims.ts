import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/server";
import {
  claimOtpEmail,
  claimSubmittedClaimantEmail,
  claimSubmittedAdminEmail,
  claimApprovedEmail,
  claimRejectedEmail,
} from "@/lib/email/templates";
import { recordAuditLog } from "@/lib/audit";
import type { ClaimRelationship, ClaimStatus, Listing, ListingClaim } from "@/lib/types";

// In-memory rate limiting map for quick sliding-window checks (per IP / user)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, maxCount: number, windowSeconds: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (existing.count >= maxCount) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  existing.count += 1;
  return { allowed: true };
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Sends a 6-digit verification code to the claimant's email via ZeptoMail.
 * Enforces cooldown and 10-minute expiry with SHA-256 hashed storage.
 */
export async function sendClaimOtp(
  email: string,
  claimId: string,
  listingTitle: string,
  clientIp?: string
): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Rate limit OTP requests (5 per 10 mins per email/ip)
  const ipKey = clientIp ? `otp:ip:${clientIp}` : "";
  const emailKey = `otp:email:${normalizedEmail}`;

  if (ipKey && !checkRateLimit(ipKey, 8, 600).allowed) {
    return { success: false, error: "Too many requests from this network. Please wait a few minutes." };
  }
  if (!checkRateLimit(emailKey, 5, 600).allowed) {
    return { success: false, error: "Too many codes requested for this email. Please wait 10 minutes." };
  }

  const admin = createAdminClient();

  // Check resend cooldown (60 seconds)
  const { data: recentOtp } = await admin
    .from("claim_email_otps")
    .select("last_sent_at")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentOtp?.last_sent_at) {
    const elapsed = Math.floor((Date.now() - new Date(recentOtp.last_sent_at).getTime()) / 1000);
    if (elapsed < 60) {
      return { success: false, error: `Please wait ${60 - elapsed} seconds before requesting a new code.`, cooldownRemaining: 60 - elapsed };
    }
  }

  // Generate 6-digit random code
  const code = crypto.randomInt(100000, 999999).toString();
  const otpHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Store hashed OTP
  const { error: insertError } = await admin.from("claim_email_otps").insert({
    email: normalizedEmail,
    claim_id: claimId,
    otp_hash: otpHash,
    attempts: 0,
    max_attempts: 5,
    expires_at: expiresAt,
    last_sent_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("sendClaimOtp insert error:", insertError);
    return { success: false, error: "Could not create verification code. Please try again." };
  }

  // Send via ZeptoMail
  const { subject, html } = claimOtpEmail({ code, listingTitle });
  const sendResult = await sendEmail({
    to: normalizedEmail,
    subject,
    html,
    eventType: "claim_otp",
  });

  if (sendResult.status === "failed") {
    return { success: false, error: "Failed to send email. Please check your email address." };
  }

  return { success: true };
}

/**
 * Validates a 6-digit OTP code submitted by the claimant.
 */
export async function verifyClaimOtp(
  email: string,
  claimId: string,
  enteredCode: string
): Promise<{ success: boolean; error?: string; emailMatchesOwner?: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = enteredCode.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, error: "Please enter the 6-digit code." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Find the latest active OTP record for this claim
  const { data: otpRecord, error } = await admin
    .from("claim_email_otps")
    .select("*")
    .eq("claim_id", claimId)
    .eq("email", normalizedEmail)
    .is("verified_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !otpRecord) {
    return { success: false, error: "Verification code expired or not found. Please request a new code." };
  }

  if (otpRecord.attempts >= otpRecord.max_attempts) {
    return { success: false, error: "Maximum attempts reached. Please request a new code." };
  }

  const submittedHash = hashOtp(cleanCode);

  if (submittedHash !== otpRecord.otp_hash) {
    const nextAttempts = otpRecord.attempts + 1;
    await admin
      .from("claim_email_otps")
      .update({ attempts: nextAttempts })
      .eq("id", otpRecord.id);

    const remaining = Math.max(0, otpRecord.max_attempts - nextAttempts);
    if (remaining === 0) {
      return { success: false, error: "Too many incorrect attempts. Please request a new code." };
    }
    return { success: false, error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
  }

  // Code matches! Mark OTP as verified
  await admin
    .from("claim_email_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", otpRecord.id);

  // Fetch listing to check if verified email matches private_owner_email
  const { data: claimData } = await admin
    .from("listing_claims")
    .select("listing_id, user_id")
    .eq("id", claimId)
    .single();

  let emailMatchesOwner = false;
  if (claimData) {
    const { data: listingData } = await admin
      .from("listings")
      .select("private_owner_email")
      .eq("id", claimData.listing_id)
      .single();

    if (
      listingData?.private_owner_email &&
      listingData.private_owner_email.trim().toLowerCase() === normalizedEmail
    ) {
      emailMatchesOwner = true;
    }

    // Update claim status
    await admin
      .from("listing_claims")
      .update({
        email_verified: true,
        email_matches_owner: emailMatchesOwner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimId);

    // If Supabase user email was unverified, confirm it now
    if (claimData.user_id) {
      await admin.auth.admin.updateUserById(claimData.user_id, { email_confirm: true }).catch(() => null);
    }
  }

  return { success: true, emailMatchesOwner };
}

/**
 * Creates a claim for an unclaimed listing.
 */
export async function submitClaim(input: {
  listingId: string;
  userId: string;
  fullName: string;
  email: string;
  relationship: ClaimRelationship;
  message?: string | null;
  emailVerified?: boolean;
  clientIp?: string;
}): Promise<{ claim: ListingClaim; emailMatchesOwner: boolean }> {
  const admin = createAdminClient();

  // 1. Check listing is unclaimed
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, slug, name, title, ownership_state, private_owner_email")
    .eq("id", input.listingId)
    .single();

  if (listingError || !listing) {
    throw new Error("Listing not found.");
  }

  if (listing.ownership_state !== "unclaimed") {
    throw new Error("This listing is already owned or assigned to a host and cannot be claimed.");
  }

  // 2. Check duplicate pending claim
  const { data: existingClaim } = await admin
    .from("listing_claims")
    .select("id, status")
    .eq("listing_id", input.listingId)
    .eq("user_id", input.userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingClaim) {
    throw new Error("You already have a pending claim for this listing.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const emailMatchesOwner = Boolean(
    listing.private_owner_email &&
    listing.private_owner_email.trim().toLowerCase() === normalizedEmail
  );

  const emailVerified = Boolean(input.emailVerified);

  // 3. Insert claim
  const { data: claim, error: insertError } = await admin
    .from("listing_claims")
    .insert({
      listing_id: input.listingId,
      user_id: input.userId,
      full_name: input.fullName.trim(),
      relationship: input.relationship,
      message: input.message?.trim() || null,
      status: "pending",
      email_verified: emailVerified,
      email_matches_owner: emailVerified && emailMatchesOwner,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertError || !claim) {
    console.error("submitClaim error:", insertError);
    throw new Error(insertError?.message || "Failed to submit claim.");
  }

  // Audit log
  await recordAuditLog({
    actorId: input.userId,
    action: "claim_submitted",
    entityType: "listing_claim",
    entityId: claim.id,
    details: {
      listing_id: input.listingId,
      relationship: input.relationship,
      email_verified: emailVerified,
      email_matches_owner: emailVerified && emailMatchesOwner,
    },
  });

  const listingTitle = listing.title || listing.name;

  // Send confirmation to claimant
  const claimantMail = claimSubmittedClaimantEmail({
    claimantName: input.fullName,
    listingTitle,
  });
  await sendEmail({
    to: normalizedEmail,
    subject: claimantMail.subject,
    html: claimantMail.html,
    eventType: "claim_submitted_claimant",
  });

  // Notify admin
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || "admin@beddn.com";
  const adminMail = claimSubmittedAdminEmail({
    claimantName: input.fullName,
    claimantEmail: normalizedEmail,
    relationship: input.relationship,
    listingTitle,
    listingId: input.listingId,
    claimId: claim.id,
    emailMatchesOwner: emailVerified && emailMatchesOwner,
  });
  await sendEmail({
    to: adminEmail,
    subject: adminMail.subject,
    html: adminMail.html,
    eventType: "claim_submitted_admin",
  });

  return { claim: claim as ListingClaim, emailMatchesOwner };
}

/**
 * Withdraws a pending claim.
 */
export async function withdrawClaim(claimId: string, userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: claim, error } = await admin
    .from("listing_claims")
    .select("id, user_id, status, listing_id")
    .eq("id", claimId)
    .single();

  if (error || !claim) {
    throw new Error("Claim not found.");
  }

  if (claim.user_id !== userId) {
    throw new Error("You do not have permission to withdraw this claim.");
  }

  if (claim.status !== "pending") {
    throw new Error(`Cannot withdraw a claim with status '${claim.status}'.`);
  }

  await admin
    .from("listing_claims")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", claimId);

  await recordAuditLog({
    actorId: userId,
    action: "claim_withdrawn",
    entityType: "listing_claim",
    entityId: claimId,
    details: { listing_id: claim.listing_id },
  });
}

/**
 * Approves a claim in a safe, atomic sequence:
 * 1. Checks listing is currently 'unclaimed'.
 * 2. Ensures the claimant has an active host record.
 * 3. Assigns listing to claimant, clears contact fields, sets ownership_state = 'owned'.
 * 4. Marks claim 'approved'.
 * 5. Auto-rejects other competing pending claims on that listing.
 * 6. Emails notifications.
 */
export async function approveClaim(claimId: string, adminUserId: string): Promise<void> {
  const admin = createAdminClient();

  // 1. Fetch claim
  const { data: claim, error: claimError } = await admin
    .from("listing_claims")
    .select("*, listing:listings(id, slug, name, title, ownership_state, owner_id)")
    .eq("id", claimId)
    .single();

  if (claimError || !claim) {
    throw new Error("Claim not found.");
  }

  if (claim.status !== "pending") {
    throw new Error(`Claim is already ${claim.status}.`);
  }

  const listing = claim.listing as Listing;
  if (!listing) {
    throw new Error("Associated listing not found.");
  }

  // Race check: Ensure listing is still unclaimed
  if (listing.ownership_state !== "unclaimed") {
    throw new Error("Listing has already been claimed or assigned to another host.");
  }

  // 2. Fetch or create host record for claimant
  let hostId: string | null = null;
  const { data: hostList } = await admin
    .from("hosts")
    .select("id")
    .eq("user_id", claim.user_id)
    .limit(1);

  if (hostList && hostList.length > 0) {
    hostId = hostList[0].id;
  } else {
    // Create host profile
    const { data: newHost, error: hostError } = await admin
      .from("hosts")
      .insert({
        user_id: claim.user_id,
        name: claim.full_name,
        phone: "",
        is_verified: false,
      })
      .select("id")
      .single();

    if (hostError || !newHost) {
      throw new Error(`Could not initialize host profile: ${hostError?.message}`);
    }
    hostId = newHost.id;
  }

  const now = new Date().toISOString();

  // 3. Atomically update the listing to 'owned'
  // Conditional WHERE ownership_state = 'unclaimed' ensures race safety against concurrent approvals
  const { data: updatedListing, error: updateListingError } = await admin
    .from("listings")
    .update({
      owner_id: claim.user_id,
      host_id: hostId,
      ownership_state: "owned",
      contact_phone: null,
      contact_name: null,
      updated_at: now,
    })
    .eq("id", listing.id)
    .eq("ownership_state", "unclaimed")
    .select("id")
    .maybeSingle();

  if (updateListingError || !updatedListing) {
    throw new Error("Failed to transfer listing. It may have already been claimed by another host.");
  }

  // 4. Mark this claim approved
  await admin
    .from("listing_claims")
    .update({
      status: "approved",
      reviewed_by: adminUserId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", claimId);

  // 5. Auto-reject other competing pending claims on this listing
  const { data: competingClaims } = await admin
    .from("listing_claims")
    .select("id, user_id, full_name")
    .eq("listing_id", listing.id)
    .eq("status", "pending")
    .neq("id", claimId);

  if (competingClaims && competingClaims.length > 0) {
    const politeReason = "Another claim for this property has been verified and approved by Beddn.";
    await admin
      .from("listing_claims")
      .update({
        status: "rejected",
        rejection_reason: politeReason,
        reviewed_by: adminUserId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("listing_id", listing.id)
      .eq("status", "pending")
      .neq("id", claimId);

    // Send polite rejection email to competing claimants
    for (const comp of competingClaims) {
      const { data: compUser } = await admin.auth.admin.getUserById(comp.user_id);
      if (compUser.user?.email) {
        const mail = claimRejectedEmail({
          claimantName: comp.full_name,
          listingTitle: listing.title || listing.name,
          reason: politeReason,
        });
        await sendEmail({
          to: compUser.user.email,
          subject: mail.subject,
          html: mail.html,
          eventType: "claim_auto_rejected",
        });
      }
    }
  }

  // 6. Audit log
  await recordAuditLog({
    actorId: adminUserId,
    action: "claim_approved",
    entityType: "listing_claim",
    entityId: claimId,
    details: {
      listing_id: listing.id,
      new_owner_id: claim.user_id,
      competing_rejected_count: competingClaims?.length || 0,
    },
  });

  // 7. Email the approved host
  const { data: claimantUser } = await admin.auth.admin.getUserById(claim.user_id);
  if (claimantUser.user?.email) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://beddn.com").replace(/\/$/, "");
    const manageUrl = `${siteUrl}/host/listings`;
    const mail = claimApprovedEmail({
      claimantName: claim.full_name,
      listingTitle: listing.title || listing.name,
      manageUrl,
    });
    await sendEmail({
      to: claimantUser.user.email,
      subject: mail.subject,
      html: mail.html,
      eventType: "claim_approved",
    });
  }
}

/**
 * Rejects a claim with an admin-supplied reason.
 */
export async function rejectClaim(claimId: string, adminUserId: string, reason: string): Promise<void> {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error("A rejection reason is required.");
  }

  const admin = createAdminClient();

  const { data: claim, error } = await admin
    .from("listing_claims")
    .select("*, listing:listings(name, title)")
    .eq("id", claimId)
    .single();

  if (error || !claim) {
    throw new Error("Claim not found.");
  }

  if (claim.status !== "pending") {
    throw new Error(`Cannot reject claim with status '${claim.status}'.`);
  }

  const now = new Date().toISOString();

  await admin
    .from("listing_claims")
    .update({
      status: "rejected",
      rejection_reason: cleanReason,
      reviewed_by: adminUserId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", claimId);

  await recordAuditLog({
    actorId: adminUserId,
    action: "claim_rejected",
    entityType: "listing_claim",
    entityId: claimId,
    details: {
      listing_id: claim.listing_id,
      reason: cleanReason,
    },
  });

  // Email claimant
  const { data: claimantUser } = await admin.auth.admin.getUserById(claim.user_id);
  if (claimantUser.user?.email) {
    const listingTitle = claim.listing?.title || claim.listing?.name || "the property";
    const mail = claimRejectedEmail({
      claimantName: claim.full_name,
      listingTitle,
      reason: cleanReason,
    });
    await sendEmail({
      to: claimantUser.user.email,
      subject: mail.subject,
      html: mail.html,
      eventType: "claim_rejected",
    });
  }
}
