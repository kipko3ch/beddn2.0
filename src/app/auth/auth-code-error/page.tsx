"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Clock, ShieldAlert, ArrowRight, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "expired";
  const isExpired = reason === "expired";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#fdf2f4]/60 via-[#fcfafb] to-white px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Brand logo */}
        <Link href={ROUTES.home} className="inline-block mb-6">
          <span className="font-brand text-4xl text-[#2b000a] tracking-tight hover:opacity-90 transition">
            Beddn
          </span>
        </Link>

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-[#f3cfd9] bg-white p-6 sm:p-8 shadow-xl shadow-rose-950/5">
          {/* Badge */}
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#fdf2f4] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#a3193d] border border-[#f9c8d4]">
            {isExpired ? (
              <>
                <Clock className="size-3.5 text-[#e8547b]" />
                Link expired
              </>
            ) : (
              <>
                <ShieldAlert className="size-3.5 text-[#e8547b]" />
                Invalid sign-in link
              </>
            )}
          </div>

          <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] leading-tight">
            {isExpired ? "This sign-in link has expired" : "Sign-in link could not be verified"}
          </h1>

          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            {isExpired
              ? "For your account security, Beddn magic links and 6-digit verification codes expire after 10 minutes. Please request a fresh sign-in link."
              : "This sign-in link is no longer valid or has already been used. Please request a new link to continue."}
          </p>

          <div className="my-6 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-xs text-stone-600">
            <p className="font-semibold text-stone-800 mb-1">⏱️ 10-Minute Expiration Policy</p>
            <p>
              To protect your reservations and personal details, authentication emails are strictly time-limited.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href={ROUTES.home}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#800020] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#6b1029] transition"
            >
              <RefreshCw className="size-4" />
              Request a new sign-in link
            </Link>

            <Link
              href={ROUTES.home}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              Return to Beddn homepage
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Need help footer */}
          <div className="mt-6 border-t border-stone-100 pt-5">
            <p className="text-xs text-stone-500 mb-2">Need quick assistance?</p>
            <a
              href="https://wa.me/254727993661?text=Hello%20Beddn%2C%20I%20need%20help%20signing%20in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003d22] hover:underline"
            >
              <MessageSquare className="size-3.5 text-[#25D366]" />
              Chat with Beddn Concierge on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
        </div>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
