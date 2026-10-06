"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@iconify/react";
import { toastManager } from "@/components/ui/toast";
import type { ClaimRelationship } from "@/lib/types";

interface ListingClaimModalProps {
  listingId: string;
  listingTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPendingClaim?: boolean;
  pendingClaimId?: string;
  onClaimSuccess?: () => void;
  onClaimWithdrawn?: () => void;
  onOpenLogin?: () => void;
}

export function ListingClaimModal({
  listingId,
  listingTitle,
  open,
  onOpenChange,
  hasPendingClaim = false,
  pendingClaimId,
  onClaimSuccess,
  onClaimWithdrawn,
  onOpenLogin,
}: ListingClaimModalProps) {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string; full_name?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [relationship, setRelationship] = useState<ClaimRelationship>("owner");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // OTP step
  const [step, setStep] = useState<"form" | "otp" | "success" | "pending_view">(
    hasPendingClaim ? "pending_view" : "form"
  );
  const [activeClaimId, setActiveClaimId] = useState<string>(pendingClaimId || "");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    async function loadAuth() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          full_name: (data.user.user_metadata?.full_name as string) || "",
        });
        setFullName((data.user.user_metadata?.full_name as string) || "");
        setEmail(data.user.email || "");
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    }
    if (open) {
      loadAuth();
      if (hasPendingClaim) {
        setStep("pending_view");
        if (pendingClaimId) setActiveClaimId(pendingClaimId);
      } else {
        setStep("form");
        setError("");
        setOtpCode("");
      }
    }
  }, [open, hasPendingClaim, pendingClaimId, supabase.auth]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmitClaim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          relationship,
          message: message.trim() || undefined,
          fullName: user ? undefined : fullName.trim(),
          email: user ? undefined : email.trim().toLowerCase(),
          password: user ? undefined : password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.userExists && onOpenLogin) {
          setError(data.error);
          return;
        }
        setError(data.error || "Failed to submit claim. Please try again.");
        return;
      }

      setActiveClaimId(data.claimId);

      if (data.needsOtp) {
        setStep("otp");
        setCooldown(60);
        toastManager.add({
          title: "Verification code sent",
          description: `A 6-digit code was sent to ${data.email || email}.`,
          type: "info",
        });
      } else {
        setStep("success");
        onClaimSuccess?.();
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setError("");
    setVerifyingOtp(true);

    try {
      const res = await fetch("/api/claims/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          claimId: activeClaimId,
          email: user?.email || email.trim().toLowerCase(),
          code: otpCode.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }

      setStep("success");
      onClaimSuccess?.();
    } catch {
      setError("Could not verify code. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0 || resending) return;
    setError("");
    setResending(true);

    try {
      const res = await fetch("/api/claims/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend",
          claimId: activeClaimId,
          email: user?.email || email.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not resend code.");
        if (data.cooldownRemaining) setCooldown(data.cooldownRemaining);
        return;
      }

      setCooldown(60);
      toastManager.add({
        title: "Code resent",
        description: "A new 6-digit code has been dispatched to your email.",
        type: "success",
      });
    } catch {
      setError("Failed to resend code.");
    } finally {
      setResending(false);
    }
  }

  async function handleWithdrawClaim() {
    if (!activeClaimId || withdrawing) return;
    if (!confirm("Are you sure you want to withdraw your claim for this listing?")) return;

    setWithdrawing(true);
    try {
      const res = await fetch(`/api/claims/${activeClaimId}/withdraw`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not withdraw claim.");
        return;
      }

      toastManager.add({
        title: "Claim withdrawn",
        description: "Your pending claim has been successfully withdrawn.",
        type: "info",
      });
      onClaimWithdrawn?.();
      onOpenChange(false);
    } catch {
      alert("Failed to withdraw claim.");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl border border-[#f3cfd9] bg-white text-stone-900 shadow-2xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]">
              <Icon icon="solar:diploma-verified-bold-duotone" className="size-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">
              Listing Ownership
            </span>
          </div>
          <DialogTitle className="font-brand text-xl font-bold text-[#2b000a]">
            {step === "otp"
              ? "Verify your email"
              : step === "success"
              ? "Claim received"
              : step === "pending_view"
              ? "Claim in review"
              : "Claim this listing"}
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            {listingTitle}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: FORM                                                              */}
        {/* ========================================================================= */}
        {step === "form" && (
          <form onSubmit={handleSubmitClaim} className="mt-4 space-y-4">
            {!user && !loadingUser && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="claim-fullName" className="text-xs font-semibold text-stone-700">
                    Full name
                  </Label>
                  <Input
                    id="claim-fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Grace Mwangi"
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="claim-email" className="text-xs font-semibold text-stone-700">
                    Email address
                  </Label>
                  <Input
                    id="claim-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="claim-password" className="text-xs font-semibold text-stone-700">
                    Create password
                  </Label>
                  <Input
                    id="claim-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-10 text-xs"
                  />
                </div>
              </>
            )}

            {user && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#2b000a]">{user.full_name || "Signed in"}</p>
                  <p className="text-stone-500 text-[11px]">{user.email}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Verified account
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="claim-relationship" className="text-xs font-semibold text-stone-700">
                Your role or relationship
              </Label>
              <select
                id="claim-relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as ClaimRelationship)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-900 focus:border-[#800020] focus:outline-none"
              >
                <option value="owner">Property Owner / Landlord</option>
                <option value="manager">Property Manager / Host Operator</option>
                <option value="caretaker">Caretaker / Authorized Agent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="claim-message" className="text-xs font-semibold text-stone-700">
                Message or verification note <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="claim-message"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. I run this apartment in Kilimani. You can verify my contact."
                className="text-xs"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-full bg-[#800020] hover:bg-[#600018] text-white font-bold text-xs shadow-xs"
              >
                {submitting ? "Submitting claim…" : "Continue to verify"}
              </Button>
            </div>

            {!user && onOpenLogin && (
              <p className="text-center text-[11px] text-stone-500 pt-1">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenLogin();
                  }}
                  className="font-bold text-[#800020] hover:underline"
                >
                  Log in instead
                </button>
              </p>
            )}
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: OTP VERIFICATION                                                  */}
        {/* ========================================================================= */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <Icon icon="solar:letter-unread-bold" className="size-4 text-amber-800" />
                Check your email inbox
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                We sent a 6-digit confirmation code to <strong>{user?.email || email}</strong>. It expires in 10 minutes.
              </p>
            </div>

            <div className="space-y-1.5 text-center">
              <Label htmlFor="claim-otp" className="text-xs font-bold text-stone-700 block text-left">
                Enter 6-digit code
              </Label>
              <Input
                id="claim-otp"
                type="text"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="h-12 text-center text-xl font-mono font-bold tracking-widest text-[#2b000a]"
              />
            </div>

            <Button
              type="submit"
              disabled={verifyingOtp || otpCode.length < 6}
              className="w-full h-11 rounded-full bg-[#800020] hover:bg-[#600018] text-white font-bold text-xs shadow-xs"
            >
              {verifyingOtp ? "Verifying code…" : "Verify & submit claim"}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                disabled={cooldown > 0 || resending}
                onClick={handleResendOtp}
                className="text-[11px] font-semibold text-[#800020] hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : resending ? "Resending…" : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SUCCESS                                                           */}
        {/* ========================================================================= */}
        {step === "success" && (
          <div className="mt-4 space-y-4 text-center">
            <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Icon icon="solar:check-circle-bold" className="size-8" />
            </div>
            <div>
              <h3 className="font-brand text-lg font-bold text-[#2b000a]">
                Thanks, we&apos;ll review and get back to you!
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 max-w-sm mx-auto">
                We review every ownership claim to keep guests and hosts safe across East Africa.
                You&apos;ll receive an email as soon as your listing is handed over to your host dashboard.
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-500">
              In the meantime, the place remains live on Beddn as &ldquo;Hosted by Beddn&rdquo; so travelers can discover it.
            </div>

            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-full bg-stone-900 text-white font-bold text-xs"
            >
              Done
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: ALREADY PENDING VIEW                                              */}
        {/* ========================================================================= */}
        {step === "pending_view" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Icon icon="solar:clock-circle-bold" className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold text-amber-950 text-sm">
                    Claim currently in review
                  </p>
                  <p className="leading-relaxed text-amber-900 text-xs">
                    You have already submitted an ownership claim for this property. Our support team is verifying your ownership details.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full h-10 rounded-full bg-stone-900 text-white font-bold text-xs"
              >
                Close
              </Button>
              <button
                type="button"
                disabled={withdrawing}
                onClick={handleWithdrawClaim}
                className="w-full h-9 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-rose-700 transition"
              >
                {withdrawing ? "Withdrawing claim…" : "Withdraw this claim"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
