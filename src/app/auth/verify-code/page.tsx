"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Check, Copy, ArrowRight, ShieldCheck, Laptop, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

function VerifyCodeContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "------";
  const email = searchParams.get("email") || "";
  const tokenHash = searchParams.get("token_hash") || "";
  const next = searchParams.get("next") || "/";
  const type = searchParams.get("type") || "magiclink";

  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  const forceLoginUrl = tokenHash
    ? `/api/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(
        type
      )}&force=1&next=${encodeURIComponent(next)}`
    : "";

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
            <ShieldCheck className="size-3.5 text-[#e8547b]" />
            Sign-in verification code
          </div>

          <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] leading-tight">
            Use this code on your device
          </h1>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            You clicked the link on this device, but you requested sign-in on your other device
            {email ? <> for <strong className="text-[#2b000a] font-semibold">{email}</strong></> : ""}.
          </p>

          {/* Visual Device Switch Illustration */}
          <div className="my-6 flex items-center justify-center gap-3 text-stone-400">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
              <Smartphone className="size-5" />
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-[#a3193d]">
              code <ArrowRight className="size-3.5" />
            </span>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]">
              <Laptop className="size-5" />
            </div>
          </div>

          {/* Big Code Display */}
          <div className="rounded-2xl border-2 border-dashed border-[#e8547b]/40 bg-[#fdf2f4]/50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#a3193d] mb-2">
              Your 6-Digit Code
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 font-mono text-3xl sm:text-4xl font-black tracking-widest text-[#800020]">
              {code.split("").map((digit, idx) => (
                <span
                  key={idx}
                  className="flex size-11 sm:size-12 items-center justify-center rounded-xl bg-white border border-[#f9c8d4] shadow-xs"
                >
                  {digit}
                </span>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={copyCode}
              className="mt-4 h-9 gap-1.5 rounded-full border-stone-300 bg-white px-4 text-xs font-bold text-stone-700 hover:border-[#800020] hover:text-[#800020]"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  Code copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-stone-500" />
                  Copy code
                </>
              )}
            </Button>
          </div>

          <p className="mt-4 text-xs text-stone-500">
            Enter these 6 digits on your original screen to finish signing in immediately.
          </p>

          {/* Alternative: Continue on this device */}
          {forceLoginUrl && (
            <div className="mt-6 border-t border-stone-100 pt-5">
              <p className="text-xs text-stone-500 mb-2">Want to use this device instead?</p>
              <a
                href={forceLoginUrl}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#800020] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#6b1029] transition"
              >
                Sign in on this device
                <ArrowRight className="size-4" />
              </a>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          <Link href={ROUTES.home} className="hover:text-stone-600 underline">
            Return to Beddn homepage
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
        </div>
      }
    >
      <VerifyCodeContent />
    </Suspense>
  );
}
