"use client";

import { useState } from "react";
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
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function continueWithGoogle() {
    setWorking(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  async function continueWithEmail(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setWorking(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    setWorking(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span>{children}</span>} />
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
            <Image
              src="/logo.png"
              alt="Beddn"
              width={64}
              height={64}
              className="mb-6 size-16 rounded-2xl object-contain"
            />
            <DialogTitle className="max-w-sm text-3xl font-bold leading-tight text-[#2b000a]">
              Sign in to unlock the best of Beddn.
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-sm">
              Save trips, reserve faster, track bookings, or apply to become a verified host.
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
                Continue with email
              </Button>
            ) : sent ? (
              <div className="rounded-2xl bg-[#fbf7f8] p-4 text-sm">
                Check your email for a secure sign-in link. If you are new, your account will be created.
              </div>
            ) : (
              <form onSubmit={continueWithEmail} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  {working ? "Sending..." : "Send sign-in link"}
                </Button>
              </form>
            )}

            <Link
              href={ROUTES.newListing}
              className="block rounded-2xl border bg-[#fbf7f8] p-4 text-sm hover:border-[#800020]"
              onClick={() => setOpen(false)}
            >
              <span className="font-bold text-[#2b000a]">
                {defaultHostIntent ? "Continue host application" : "Want to host?"}
              </span>
              <span className="mt-1 block text-muted-foreground">
                Apply first. Admin approval is required before creating listings.
              </span>
            </Link>
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
