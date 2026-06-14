"use client";

import { useState, type ReactElement } from "react";
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
  defaultHostIntent = false,
}: {
  children: React.ReactNode;
  defaultHostIntent?: boolean;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  function publicBaseUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
  }

  function callbackUrl() {
    const next = defaultHostIntent
      ? ROUTES.newListing
      : `${window.location.pathname}${window.location.search}`;
    return `${publicBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next || ROUTES.home)}`;
  }

  function magicLinkNext() {
    const next = defaultHostIntent
      ? ROUTES.newListing
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

  async function sendMagicLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email address to receive a magic link.");
      return;
    }
    setError("");
    setWorking(true);
    let failed = "";
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, next: magicLinkNext() }),
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
    setSent(true);
  }

  async function continueWithEmail(event: React.FormEvent) {
    event.preventDefault();
    await sendMagicLink();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Render the caller's button as the trigger itself. Wrapping it in a
          <span> previously broke Base UI's native-button semantics, which made
          the login dialog fail to open on some clicks. */}
      <DialogTrigger render={children as ReactElement} />
      <DialogContent className="max-w-[min(100vw-1.5rem,560px)] gap-0 rounded-none p-0 sm:rounded-2xl" showCloseButton={false}>
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-[#003d22] hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="px-8 pb-8 pt-12 sm:px-11 sm:pb-10">
          <div className="mb-8">
            <p className="mb-6 font-brand text-3xl leading-none text-[#2b000a]">Beddn</p>
            <DialogTitle className="max-w-sm text-3xl font-bold leading-tight text-[#2b000a]">
              {defaultHostIntent ? "Start hosting on Beddn." : "Log in once. You are signed up."}
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-sm">
              {defaultHostIntent
                ? "Create your account, then set up your host profile and publish your first listing."
                : "Save trips, reserve faster, and manage your bookings with one secure account."}
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

            {!showEmail ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmail(true)}
                className="h-14 w-full rounded-full border-[#2b000a] text-base font-bold"
              >
                <Mail className="mr-4 h-5 w-5" />
                Continue with magic link via email
              </Button>
            ) : sent ? (
              <div className="space-y-3 rounded-2xl bg-[#fbf7f8] p-4 text-sm">
                <p>
                  Magic link sent to <span className="font-semibold text-[#2b000a]">{sentEmail}</span>.
                  Open it from the same device to finish signing in.
                </p>
                {error && <p className="text-red-700">{error}</p>}
                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={working}
                  className="font-bold text-[#800020] underline-offset-4 hover:underline disabled:opacity-60"
                >
                  {working ? "Sending..." : "Send magic link again"}
                </button>
              </div>
            ) : (
              <form onSubmit={continueWithEmail} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  className="h-12 rounded-full border-[#2b000a] px-5"
                  required
                />
                {error && <p className="text-sm text-red-700">{error}</p>}
                <Button
                  type="submit"
                  disabled={working}
                  className="h-12 w-full rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
                >
                  {working ? "Sending..." : "Send magic link"}
                </Button>
              </form>
            )}

            {defaultHostIntent && (
              <div className="rounded-2xl border bg-[#fbf7f8] p-4 text-sm">
                <span className="font-bold text-[#2b000a]">After you sign in</span>
                <span className="mt-1 block text-muted-foreground">
                  We&apos;ll take you straight to host setup. Verification only controls the badge — your listing can go live right away.
                </span>
              </div>
            )}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
