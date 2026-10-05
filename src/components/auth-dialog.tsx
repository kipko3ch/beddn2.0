"use client";

import { useState, useEffect, type ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROUTES } from "@/lib/routes";

export function AuthDialog({
  children,
  mode = "signin",
  defaultHostIntent = false,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: {
  children?: React.ReactNode;
  mode?: "signin" | "signup";
  defaultHostIntent?: boolean;
  /** Start open without needing a trigger click (e.g. auto-prompt login). */
  defaultOpen?: boolean;
  /** Controlled open state — omit to let the dialog manage its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const supabase = createClient();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [authMode, setAuthMode] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAuthMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!open) {
      setSent(false);
      setEmail("");
      setSentEmail("");
      setSentAt(null);
      setTimeLeft(null);
      setError("");
      setWorking(false);
    }
  }, [open]);

  // 10-minute countdown timer for OTP / magic link
  useEffect(() => {
    if (!sent || !sentAt) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, 600 - Math.floor((Date.now() - sentAt) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sent, sentAt]);

  function publicBaseUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
  }

  function callbackUrl() {
    const next = defaultHostIntent
      ? ROUTES.dashboard
      : `${window.location.pathname}${window.location.search}`;
    return `${publicBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next || ROUTES.home)}`;
  }

  function magicLinkNext() {
    const next = defaultHostIntent
      ? ROUTES.dashboard
      : `${window.location.pathname}${window.location.search}`;
    return next || ROUTES.home;
  }

  async function continueWithGoogle() {
    setError("");
    setWorking(true);
    // On success the browser redirects away; if it errors (or the redirect
    // never happens) re-enable the button so it isn't stuck disabled.
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (authError) {
      setError(authError.message);
      setWorking(false);
    }
  }

  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Automatically close dialog if session becomes active (e.g. user clicked link on this device)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && open) {
        setOpen(false);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, open, setOpen]);

  async function sendMagicLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email address to receive a magic link.");
      return;
    }
    setError("");
    setWorking(true);

    // Register flow ID in cookie so confirm endpoint knows this device initiated the flow
    const flowId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    document.cookie = `beddn_auth_flow=${flowId}; path=/; max-age=600; SameSite=Lax`;

    let failed = "";
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, next: magicLinkNext(), flowId }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        failed = data.error || "Could not send the magic link. Please try again.";
      }
    } catch {
      failed = "Could not send the magic link. Please try again.";
    }
    setWorking(false);
    if (failed) {
      setError(failed);
      return;
    }
    setSentEmail(normalizedEmail);
    setSentAt(Date.now());
    setSent(true);
  }

  async function verifyOtpCode(event: React.FormEvent) {
    event.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    if (sentAt && Date.now() - sentAt > 10 * 60 * 1000) {
      setError("This code has expired (valid for 10 minutes). Please click 'Resend email' below.");
      return;
    }

    setError("");
    setVerifyingOtp(true);
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: sentEmail,
      token: cleanCode,
      type: "email",
    });
    setVerifyingOtp(false);
    if (otpError) {
      setError(otpError.message || "Invalid or expired code. Please try again.");
      return;
    }
    setOpen(false);
    window.location.href = magicLinkNext();
  }

  async function continueWithEmail(event: React.FormEvent) {
    event.preventDefault();
    await sendMagicLink();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Render the caller's button as the trigger itself. Wrapping it in a
          <span> previously broke Base UI's native-button semantics, which made
          the login dialog fail to open on some clicks. Omit entirely for
          controlled/auto-open usage with no trigger element. */}
      {children && <DialogTrigger render={children as ReactElement} />}
      <DialogContent className="max-w-[min(100vw-1.5rem,560px)] gap-0 rounded-none p-0 sm:rounded-2xl" showCloseButton={false}>
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-[#003d22] hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="px-8 pb-8 pt-12 sm:px-11 sm:pb-10">
          {sent ? (
            /* --- DEDICATED OVERLAY: "Check your email" (Clean minimal white, styled like main) --- */
            <div>
              <div className="mb-6">
                <p className="mb-6 font-brand text-3xl leading-none text-[#2b000a]">Beddn</p>
                <DialogTitle className="max-w-sm text-3xl font-bold leading-tight text-[#2b000a]">
                  Check your email.
                </DialogTitle>
                <DialogDescription className="mt-3 max-w-sm text-sm text-stone-600 leading-relaxed">
                  We sent a sign-in link and verification code to{" "}
                  <strong className="font-semibold text-stone-900">{sentEmail}</strong>.
                  Tap the link in your email, or enter your 6-digit code below:
                </DialogDescription>
              </div>

              {/* 6-Digit OTP Form - clean minimal white without colored box */}
              <form onSubmit={verifyOtpCode} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    <span>Enter 6-digit code</span>
                    {timeLeft !== null && timeLeft > 0 ? (
                      <span className="text-amber-700 font-semibold lowercase tracking-normal">
                        expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                      </span>
                    ) : timeLeft === 0 ? (
                      <span className="text-rose-600 font-semibold lowercase tracking-normal">
                        expired (10m)
                      </span>
                    ) : null}
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpCode(val);
                      setError("");
                    }}
                    placeholder="• • • • • •"
                    className="h-14 rounded-2xl border-stone-300 bg-white text-center font-mono text-2xl font-bold tracking-[10px] text-[#2b000a] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>

                {error && <p className="px-1 text-xs font-semibold text-rose-600">{error}</p>}

                <Button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length < 6}
                  className="h-13 w-full rounded-full bg-[#800020] hover:bg-[#68001a] text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
                >
                  {verifyingOtp ? "Verifying code..." : "Sign in with code"}
                </Button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={sendMagicLink}
                    disabled={working}
                    className="font-bold text-[#800020] hover:underline disabled:opacity-60"
                  >
                    {working ? "Resending..." : "Resend email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setOtpCode("");
                      setError("");
                    }}
                    className="text-stone-500 hover:text-stone-800 underline"
                  >
                    Change email
                  </button>
                </div>
              </form>

              {/* Clean social login at the bottom */}
              <div className="mt-8 space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-stone-200" />
                  <span className="absolute bg-white px-3 text-xs text-stone-400 font-medium uppercase tracking-wider">
                    or
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={continueWithGoogle}
                  disabled={working}
                  className="h-13 w-full rounded-full border-stone-300 text-sm font-bold text-stone-800 hover:bg-stone-50 transition"
                >
                  <Image
                    src="/google.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3 size-5"
                    aria-hidden="true"
                  />
                  Continue with Google
                </Button>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                By proceeding, you agree to our{" "}
                <Link href={ROUTES.terms} className="underline">
                  Terms of Use
                </Link>{" "}
                and confirm you have read our{" "}
                <Link href={ROUTES.privacy} className="underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          ) : (
            /* --- DEFAULT VIEW: Welcome / Sign in / Google + Direct Email --- */
            <div>
              <div className="mb-8">
                <p className="mb-6 font-brand text-3xl leading-none text-[#2b000a]">Beddn</p>
                <DialogTitle className="max-w-sm text-3xl font-bold leading-tight text-[#2b000a]">
                  {defaultHostIntent
                    ? "Start hosting on Beddn."
                    : authMode === "signup"
                    ? "Create your Beddn account."
                    : "Welcome back to Beddn."}
                </DialogTitle>
                <DialogDescription className="mt-3 max-w-sm">
                  {defaultHostIntent
                    ? "Create your account, then set up your host profile and publish your first listing."
                    : authMode === "signup"
                    ? "Sign up in seconds to save stays, reserve faster, and connect with verified hosts."
                    : "Sign in to access your saved trips, manage bookings, and contact hosts."}
                </DialogDescription>
              </div>

              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={continueWithGoogle}
                  disabled={working}
                  className="h-14 w-full rounded-full border-[#2b000a] text-base font-bold"
                >
                  <Image
                    src="/google.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="mr-4 size-6"
                    aria-hidden="true"
                  />
                  Continue with Google
                </Button>

                {/* Direct Email Input Form */}
                <div className="space-y-4 pt-1">
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-stone-200" />
                    <span className="absolute bg-white px-3 text-xs text-stone-400 font-medium uppercase tracking-wider">
                      or
                    </span>
                  </div>

                  <form onSubmit={continueWithEmail} className="space-y-3">
                    <div>
                      <Input
                        type="email"
                        required
                        autoFocus={false}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        placeholder="Enter your email address"
                        className="h-13 rounded-full border-stone-300 bg-white px-5 text-sm text-[#181113] placeholder:text-stone-400 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                      />
                    </div>

                    {error && <p className="px-2 text-xs font-semibold text-rose-600">{error}</p>}

                    <Button
                      type="submit"
                      disabled={working}
                      className="h-13 w-full rounded-full bg-[#800020] hover:bg-[#68001a] text-base font-bold text-white shadow-sm transition active:scale-[0.99]"
                    >
                      {working ? "Sending link..." : "Continue with email"}
                    </Button>
                  </form>
                </div>

                {defaultHostIntent && (
                  <div className="rounded-2xl border bg-[#fbf7f8] p-4 text-sm">
                    <span className="font-bold text-[#2b000a]">After you sign in</span>
                    <span className="mt-1 block text-muted-foreground">
                      We&apos;ll take you straight to host setup. Verification only controls the badge — your listing can go live right away.
                    </span>
                  </div>
                )}
              </div>

              {!defaultHostIntent && (
                <div className="mt-5 text-center text-xs text-muted-foreground">
                  {authMode === "signup" ? (
                    <p>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signin");
                          setError("");
                        }}
                        className="font-bold text-[#800020] underline-offset-4 hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  ) : (
                    <p>
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setError("");
                        }}
                        className="font-bold text-[#800020] underline-offset-4 hover:underline"
                      >
                        Sign up
                      </button>
                    </p>
                  )}
                </div>
              )}

              <p className="mt-8 text-center text-xs text-muted-foreground">
                By proceeding, you agree to our{" "}
                <Link href={ROUTES.terms} className="underline">
                  Terms of Use
                </Link>{" "}
                and confirm you have read our{" "}
                <Link href={ROUTES.privacy} className="underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
