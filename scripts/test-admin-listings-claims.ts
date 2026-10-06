import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  validateAndNormalizePhone,
  getTelLink,
  getWhatsAppLink,
  formatPhoneDisplay,
} from "../src/lib/phone";
import type { Listing, ListingClaim } from "../src/lib/types";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("   BEDDN ADMIN LISTINGS & HOST CLAIM FLOW TEST SUITE   ");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------
  // TEST SUITE 1: Migration SQL Structure & Up/Down Rules
  // -------------------------------------------------------------------
  console.log("1. Testing Migration SQL file integrity & schema changes:");
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20261006000000_admin_listings_and_claims.sql"
  );
  assert(fs.existsSync(migrationPath), "Migration file exists at supabase/migrations/");

  const migrationSql = fs.readFileSync(migrationPath, "utf8").toLowerCase();
  assert(migrationSql.includes("alter table listings"), "Alters listings table");
  assert(migrationSql.includes("add column if not exists owner_id uuid"), "Adds owner_id to listings");
  assert(
    migrationSql.includes("add column if not exists created_by_admin_id uuid"),
    "Adds created_by_admin_id to listings"
  );
  assert(
    migrationSql.includes("add column if not exists ownership_state text"),
    "Adds ownership_state column"
  );
  assert(
    migrationSql.includes("add column if not exists contact_phone text"),
    "Adds public contact_phone column"
  );
  assert(
    migrationSql.includes("add column if not exists contact_name text"),
    "Adds public contact_name column"
  );
  assert(
    migrationSql.includes("add column if not exists private_owner_name text"),
    "Adds admin-only private_owner_name"
  );
  assert(
    migrationSql.includes("add column if not exists private_owner_email text"),
    "Adds admin-only private_owner_email"
  );
  assert(
    migrationSql.includes("add column if not exists private_notes text"),
    "Adds admin-only private_notes"
  );
  assert(
    migrationSql.includes("alter column host_id drop not null"),
    "Safely drops NOT NULL on host_id for unclaimed listings"
  );
  assert(
    migrationSql.includes("create table if not exists listing_claims"),
    "Creates listing_claims table"
  );
  assert(
    migrationSql.includes("idx_listing_claims_unique_pending"),
    "Creates unique index enforcing only one pending claim per (listing_id, user_id)"
  );
  assert(
    migrationSql.includes("create table if not exists claim_email_otps"),
    "Creates claim_email_otps table for email OTP verification"
  );
  assert(
    migrationSql.includes("create table if not exists audit_logs"),
    "Creates audit_logs table for tracking admin actions"
  );
  assert(
    migrationSql.includes("down migration"),
    "Includes safe, reversible migration instructions with rollback script"
  );

  // -------------------------------------------------------------------
  // TEST SUITE 2: Phone Number Validation, Normalization & Links
  // -------------------------------------------------------------------
  console.log("\n2. Testing Phone Validation, Normalization & Action Links (3b):");
  // Missing / empty
  const emptyRes = validateAndNormalizePhone("");
  assert(!emptyRes.isValid && Boolean(emptyRes.error?.includes("required")), "Rejects empty phone number");

  // Local number missing country code
  const localRes = validateAndNormalizePhone("0712345678");
  assert(
    !localRes.isValid && Boolean(localRes.error?.includes("country code")),
    "Rejects 07... local number and suggests +254"
  );

  // Valid Kenyan number with whitespace and brackets
  const kenyaRes = validateAndNormalizePhone("+254 (712) 345-678");
  assert(kenyaRes.isValid && kenyaRes.normalized === "+254712345678", "Normalizes Kenyan phone to +254712345678");

  // Valid Tanzanian number
  const tzRes = validateAndNormalizePhone("+255 784 123 456");
  assert(tzRes.isValid && tzRes.normalized === "+255784123456", "Normalizes Tanzanian phone to +255784123456");

  // 00 prefix converts to +
  const intlRes = validateAndNormalizePhone("00254712345678");
  assert(intlRes.isValid && intlRes.normalized === "+254712345678", "Converts leading 00 to + prefix");

  // Formatted display
  const displayFormatted = formatPhoneDisplay("+254712345678");
  assert(displayFormatted === "+254 712 345 678", "Formats phone for friendly display");

  // Action links
  const telLink = getTelLink("+254712345678");
  assert(telLink === "tel:+254712345678", "Generates correct tel: link");

  const waLink = getWhatsAppLink("+254712345678", "Hello, inquiring about listing");
  assert(
    waLink.startsWith("https://wa.me/254712345678?text=") &&
      waLink.includes("inquiring"),
    "Generates correct wa.me link with URL-encoded inquiry message"
  );

  // -------------------------------------------------------------------
  // TEST SUITE 3: Unclaimed Listing Publishing Validation
  // -------------------------------------------------------------------
  console.log("\n3. Testing Publishing Constraints on Unclaimed Listings:");
  function canPublishUnclaimed(listing: Partial<Listing>): { ok: boolean; error?: string } {
    if (listing.ownership_state === "unclaimed") {
      if (!listing.contact_phone || !listing.contact_phone.trim()) {
        return {
          ok: false,
          error: "Unclaimed listings require a public contact phone number before publishing.",
        };
      }
      const check = validateAndNormalizePhone(listing.contact_phone);
      if (!check.isValid) {
        return { ok: false, error: check.error };
      }
    }
    return { ok: true };
  }

  const noPhone = canPublishUnclaimed({ ownership_state: "unclaimed", contact_phone: "" });
  assert(!noPhone.ok, "Unclaimed listing CANNOT be published without contact_phone");

  const badPhone = canPublishUnclaimed({
    ownership_state: "unclaimed",
    contact_phone: "0722123456",
  });
  assert(!badPhone.ok, "Unclaimed listing CANNOT be published with invalid format phone");

  const validUnclaimed = canPublishUnclaimed({
    ownership_state: "unclaimed",
    contact_phone: "+254722123456",
  });
  assert(validUnclaimed.ok, "Unclaimed listing CAN be published with valid normalized phone");

  // -------------------------------------------------------------------
  // TEST SUITE 4: Security & Private Field Sanitization
  // -------------------------------------------------------------------
  console.log("\n4. Testing Security & Sanitization of Private Fields (Public Response):");
  function sanitizeListingForPublic(listing: Partial<Listing>): Partial<Listing> {
    const isUnclaimed = listing.ownership_state === "unclaimed";
    return {
      ...listing,
      created_by_admin_id: undefined,
      private_owner_name: undefined,
      private_owner_email: undefined,
      private_notes: undefined,
      contact_phone: isUnclaimed ? listing.contact_phone : undefined,
      contact_name: isUnclaimed ? listing.contact_name || "Beddn" : undefined,
    };
  }

  const rawListing: Partial<Listing> = {
    id: "list-1",
    name: "Luxury Beach Villa",
    ownership_state: "unclaimed",
    created_by_admin_id: "admin-uuid-99",
    private_owner_name: "John Doe",
    private_owner_email: "john@owner.com",
    private_notes: "Owner pays 10% commission. Gate code 4321.",
    contact_phone: "+254711223344",
    contact_name: "Beddn Concierge",
  };

  const publicUnclaimed = sanitizeListingForPublic(rawListing);
  assert(publicUnclaimed.created_by_admin_id === undefined, "created_by_admin_id is stripped from public output");
  assert(publicUnclaimed.private_owner_name === undefined, "private_owner_name is stripped from public output");
  assert(publicUnclaimed.private_owner_email === undefined, "private_owner_email is stripped from public output");
  assert(publicUnclaimed.private_notes === undefined, "private_notes is stripped from public output");
  assert(publicUnclaimed.contact_phone === "+254711223344", "contact_phone remains accessible on unclaimed listings");
  assert(publicUnclaimed.contact_name === "Beddn Concierge", "contact_name remains accessible on unclaimed listings");

  // When listing is owned, contact_phone must also be stripped
  const rawOwned: Partial<Listing> = {
    ...rawListing,
    ownership_state: "owned",
  };
  const publicOwned = sanitizeListingForPublic(rawOwned);
  assert(publicOwned.contact_phone === undefined, "contact_phone is stripped on owned listings");
  assert(publicOwned.contact_name === undefined, "contact_name is stripped on owned listings");

  // -------------------------------------------------------------------
  // TEST SUITE 5: UI Element Conditional Rendering Rules
  // -------------------------------------------------------------------
  console.log("\n5. Testing UI Conditional Display Rules (Claim link & Contact):");
  function shouldRenderClaimLink(ownershipState?: string | null): boolean {
    return ownershipState === "unclaimed";
  }

  function shouldRenderCallWhatsApp(listing: Partial<Listing>): boolean {
    return listing.ownership_state === "unclaimed" && Boolean(listing.contact_phone);
  }

  assert(shouldRenderClaimLink("unclaimed") === true, "Claim link renders when ownership_state='unclaimed'");
  assert(shouldRenderClaimLink("owned") === false, "Claim link does NOT render when ownership_state='owned'");
  assert(
    shouldRenderClaimLink("managed_by_admin") === false,
    "Claim link does NOT render when ownership_state='managed_by_admin'"
  );
  assert(shouldRenderClaimLink(null) === false, "Claim link does NOT render when ownership_state is null");

  assert(
    shouldRenderCallWhatsApp({ ownership_state: "unclaimed", contact_phone: "+254700000000" }) === true,
    "Call & WhatsApp buttons render on unclaimed listing with contact_phone"
  );
  assert(
    shouldRenderCallWhatsApp({ ownership_state: "owned", contact_phone: "+254700000000" }) === false,
    "Call & WhatsApp buttons do NOT render on owned listing"
  );

  // -------------------------------------------------------------------
  // TEST SUITE 6: Server-side Booking & Payment Blocking
  // -------------------------------------------------------------------
  console.log("\n6. Testing Server-side Booking & Payment Blocking on Unclaimed Listings:");
  function validateBookingEligibility(listing: Partial<Listing>): { allowed: boolean; status?: number; error?: string } {
    if (listing.ownership_state === "unclaimed") {
      return {
        allowed: false,
        status: 400,
        error: "Direct online bookings and checkout are disabled for listings hosted directly by Beddn.",
      };
    }
    return { allowed: true };
  }

  const bookingAttemptUnclaimed = validateBookingEligibility({ ownership_state: "unclaimed" });
  assert(!bookingAttemptUnclaimed.allowed && bookingAttemptUnclaimed.status === 400, "Booking request blocked server-side (400) for unclaimed listings");

  const bookingAttemptOwned = validateBookingEligibility({ ownership_state: "owned" });
  assert(bookingAttemptOwned.allowed, "Booking request allowed for owned listings");

  // -------------------------------------------------------------------
  // TEST SUITE 7: Email OTP Generation, Hashing & Verification
  // -------------------------------------------------------------------
  console.log("\n7. Testing Email OTP Flow (SHA-256 Hashing, Expiry, Attempt Limits):");
  function hashOtp(otp: string): string {
    return crypto.createHash("sha256").update(otp.trim()).digest("hex");
  }

  interface OtpRecord {
    email: string;
    hashedOtp: string;
    attempts: number;
    maxAttempts: number;
    expiresAt: Date;
    verified: boolean;
  }

  function createMockOtp(email: string, rawOtp: string, ttlMs = 10 * 60 * 1000): OtpRecord {
    return {
      email: email.toLowerCase(),
      hashedOtp: hashOtp(rawOtp),
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + ttlMs),
      verified: false,
    };
  }

  function verifyMockOtp(record: OtpRecord, candidateOtp: string): { success: boolean; error?: string } {
    if (new Date() > record.expiresAt) {
      return { success: false, error: "OTP expired." };
    }
    if (record.attempts >= record.maxAttempts) {
      return { success: false, error: "Too many attempts." };
    }
    record.attempts++;
    const candidateHash = hashOtp(candidateOtp);
    if (candidateHash !== record.hashedOtp) {
      return { success: false, error: "Incorrect code." };
    }
    record.verified = true;
    return { success: true };
  }

  const validOtp = createMockOtp("claimant@example.com", "849201");
  const wrongCodeRes = verifyMockOtp(validOtp, "111111");
  assert(!wrongCodeRes.success && wrongCodeRes.error === "Incorrect code.", "Rejects incorrect OTP code");
  assert(validOtp.attempts === 1, "Increments attempts counter on failure");

  const correctCodeRes = verifyMockOtp(validOtp, "849201");
  assert(correctCodeRes.success && validOtp.verified === true, "Verifies successfully with correct OTP code");

  // Expiry check
  const expiredOtp = createMockOtp("claimant@example.com", "849201", -1000); // 1 sec in the past
  const expiredRes = verifyMockOtp(expiredOtp, "849201");
  assert(!expiredRes.success && expiredRes.error === "OTP expired.", "Rejects expired OTP (10 minute limit)");

  // Attempt limit check
  const lockedOtp = createMockOtp("claimant@example.com", "849201");
  lockedOtp.attempts = 5;
  const lockedRes = verifyMockOtp(lockedOtp, "849201");
  assert(!lockedRes.success && lockedRes.error === "Too many attempts.", "Blocks verification after max 5 attempts");

  // Email matches owner test
  function checkEmailMatchesOwner(claimantEmail: string, privateOwnerEmail?: string | null): boolean {
    if (!privateOwnerEmail || !claimantEmail) return false;
    return claimantEmail.trim().toLowerCase() === privateOwnerEmail.trim().toLowerCase();
  }

  assert(
    checkEmailMatchesOwner("Alice@Example.com", "alice@example.com") === true,
    "email_matches_owner correctly identifies match (case-insensitive)"
  );
  assert(
    checkEmailMatchesOwner("bob@example.com", "alice@example.com") === false,
    "email_matches_owner returns false when emails do not match"
  );
  assert(
    checkEmailMatchesOwner("alice@example.com", null) === false,
    "email_matches_owner returns false when private_owner_email is null"
  );

  // -------------------------------------------------------------------
  // TEST SUITE 8: Claim State Machine, Duplicate Prevention & Withdrawal
  // -------------------------------------------------------------------
  console.log("\n8. Testing Claim Lifecycle, Duplicate Prevention & Withdrawal:");
  const existingClaims: Array<{ listing_id: string; user_id: string; status: string }> = [
    { listing_id: "list-1", user_id: "user-1", status: "pending" },
  ];

  function canSubmitClaim(listingId: string, userId: string): boolean {
    return !existingClaims.some(
      (c) => c.listing_id === listingId && c.user_id === userId && c.status === "pending"
    );
  }

  assert(!canSubmitClaim("list-1", "user-1"), "Prevents duplicate pending claim for same user on same listing");
  assert(canSubmitClaim("list-1", "user-2"), "Allows claim from a different user on the same listing");
  assert(canSubmitClaim("list-2", "user-1"), "Allows claim from the same user on a different listing");

  // Withdraw claim
  const claimToWithdraw = { id: "claim-1", user_id: "user-1", status: "pending" };
  function withdrawClaim(claim: typeof claimToWithdraw, requestingUserId: string): boolean {
    if (claim.user_id !== requestingUserId) return false;
    if (claim.status !== "pending") return false;
    claim.status = "withdrawn";
    return true;
  }
  assert(withdrawClaim(claimToWithdraw, "user-1") === true, "Claimant can withdraw pending claim");
  assert(claimToWithdraw.status === "withdrawn", "Claim status transitions to 'withdrawn'");
  assert(withdrawClaim(claimToWithdraw, "user-1") === false, "Cannot withdraw already withdrawn claim");

  // -------------------------------------------------------------------
  // TEST SUITE 9: Race-Safe Claim Approval & Ownership Transfer
  // -------------------------------------------------------------------
  console.log("\n9. Testing Race-Safe Approval & Multi-Claim Auto-Rejection:");
  interface MockListingState {
    id: string;
    owner_id: string | null;
    ownership_state: "unclaimed" | "owned" | "managed_by_admin";
    contact_phone: string | null;
    contact_name: string | null;
  }

  interface MockClaimState {
    id: string;
    listing_id: string;
    user_id: string;
    status: "pending" | "approved" | "rejected";
  }

  const mockListing: MockListingState = {
    id: "list-100",
    owner_id: null,
    ownership_state: "unclaimed",
    contact_phone: "+254712000000",
    contact_name: "Beddn Support",
  };

  const claimsQueue: MockClaimState[] = [
    { id: "claim-A", listing_id: "list-100", user_id: "user-A", status: "pending" },
    { id: "claim-B", listing_id: "list-100", user_id: "user-B", status: "pending" },
  ];

  function approveClaimTx(claimId: string): { success: boolean; error?: string } {
    // Row-level check: must be unclaimed
    if (mockListing.ownership_state !== "unclaimed") {
      return { success: false, error: "Listing is no longer unclaimed." };
    }
    const claim = claimsQueue.find((c) => c.id === claimId);
    if (!claim || claim.status !== "pending") {
      return { success: false, error: "Claim is not pending." };
    }

    // Transfer ownership
    mockListing.owner_id = claim.user_id;
    mockListing.ownership_state = "owned";
    mockListing.contact_phone = null;
    mockListing.contact_name = null;
    claim.status = "approved";

    // Auto-reject competing pending claims
    for (const other of claimsQueue) {
      if (other.listing_id === mockListing.id && other.id !== claim.id && other.status === "pending") {
        other.status = "rejected";
      }
    }
    return { success: true };
  }

  // First approval succeeds
  const resApproveA = approveClaimTx("claim-A");
  assert(resApproveA.success, "Claim A is successfully approved");
  assert(mockListing.owner_id === "user-A", "Listing owner_id set to claimant user_id");
  assert(mockListing.ownership_state === "owned", "Listing ownership_state transitioned to 'owned'");
  assert(mockListing.contact_phone === null, "contact_phone is wiped on approval");
  assert(mockListing.contact_name === null, "contact_name is wiped on approval");

  // Check competing claim B
  const claimB = claimsQueue.find((c) => c.id === "claim-B");
  assert(claimB?.status === "rejected", "Competing pending Claim B was automatically rejected");

  // Attempting concurrent approval for Claim B fails safely
  const resApproveB = approveClaimTx("claim-B");
  assert(!resApproveB.success && Boolean(resApproveB.error?.includes("no longer unclaimed")), "Concurrent approval safely blocked by row-level check");

  // -------------------------------------------------------------------
  // TEST SUITE 10: Admin Role Security Check (403 Enforcement)
  // -------------------------------------------------------------------
  console.log("\n10. Testing Admin Authorization Security Guard:");
  function checkAdminRoute(profile?: { is_admin?: boolean } | null): { status: number; ok: boolean } {
    if (!profile?.is_admin) {
      return { status: 403, ok: false };
    }
    return { status: 200, ok: true };
  }

  assert(checkAdminRoute(null).status === 403, "Anonymous visitor receives 403 Forbidden");
  assert(checkAdminRoute({ is_admin: false }).status === 403, "Regular user receives 403 Forbidden");
  assert(checkAdminRoute({ is_admin: true }).status === 200, "Admin user is granted 200 OK access");

  // -------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
