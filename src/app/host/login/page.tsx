"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";

// Dedicated host sign-in. Lives under /host but renders standalone (the host
// layout passes this route through without the dashboard chrome or auth gate).
export default function HostLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  // Already signed in? Go straight to the dashboard (if not rejected).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("hosts")
          .select("status")
          .eq("user_id", data.user.id)
          .maybeSingle()
          .then(async ({ data: host }) => {
            if (host?.status === "rejected") {
              await supabase.auth.signOut();
              setError("Your host profile has been rejected. Access is denied.");
            } else {
              router.replace(ROUTES.dashboard);
            }
          });
      }
    });
  }, [supabase, router]);

  function publicBaseUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
  }

  function callbackUrl() {
    return `${publicBaseUrl()}/api/auth/callback?next=${encodeURIComponent(ROUTES.dashboard)}`;
  }

  async function continueWithGoogle() {
    setError("");
    setWorking(true);
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
        body: JSON.stringify({ email: normalizedEmail, next: ROUTES.dashboard }),
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
    <div className="flex min-h-screen flex-col bg-white font-sans text-[#181113]">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href={ROUTES.home} className="font-brand text-3xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <Link href={ROUTES.search} className="rounded-full px-3 py-2 text-sm hover:bg-muted">
            Explore stays
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <span className="mb-6 inline-flex w-fit rounded-full bg-[#f8eef2] px-3 py-1 text-xs font-bold uppercase tracking-widest text-crimson">
          Host
        </span>
        <h1 className="font-brand text-4xl leading-tight text-[#2b000a]">Welcome back, host.</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Sign in to manage your listings, inquiries, calendar, and bookings. New here? Signing in
          creates your host account automatically.
        </p>

        <div className="mt-8 space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={continueWithGoogle}
            disabled={working}
            className="h-14 w-full rounded-full border-[#2b000a] text-base font-bold"
          >
            <Image src="/google.svg" alt="" width={24} height={24} className="mr-4 size-6" aria-hidden="true" />
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
                className="font-bold text-crimson underline-offset-4 hover:underline disabled:opacity-60"
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
                className="h-12 w-full rounded-full bg-[#800020] font-bold hover:bg-merlot"
              >
                {working ? "Sending..." : "Send magic link"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          By proceeding, you agree to our{" "}
          <Link href={ROUTES.terms} className="underline">
            Terms of Use
          </Link>{" "}
          and our{" "}
          <Link href={ROUTES.privacy} className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
