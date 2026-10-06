"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

// Shown inside the host area when a host account exists but isn't approved yet.
export function HostApprovalScreen({ status }: { status: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push(ROUTES.home);
    router.refresh();
  }

  const copy: Record<string, { title: string; body: string; image: string }> = {
    pending: {
      title: "Your host account is under review",
      body:
        "Thanks for applying to host on Beddn. Our team is verifying your details to keep the community safe and trusted. You'll be able to publish your listings as soon as you're approved — usually within a few hours.",
      image: "/images/empty-host-needed.png",
    },
    rejected: {
      title: "Your host application wasn't approved",
      body:
        "We couldn't approve your host account this time. If you think this is an oversight or have updated your details, please contact admin directly.",
      image: "/images/state-auth-error.png",
    },
    suspended: {
      title: "Your host account is paused",
      body:
        "Your hosting access is temporarily paused. Please contact Beddn admin directly to restore your host status.",
      image: "/images/state-auth-error.png",
    },
  };
  const c = copy[status] ?? copy.pending;

  return (
    <div className="min-h-screen bg-[#faf8f8] font-sans text-stone-900">
      <header className="border-b border-stone-100 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href={ROUTES.home} className="font-brand text-2xl font-black tracking-tight text-[#800020]">
            Beddn
          </Link>
          <span className="rounded-full bg-[#fdf2f4] px-3 py-1 text-xs font-bold text-[#800020] border border-[#f9c8d4]">
            Host Onboarding
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12 sm:py-16 text-center">
        <div className="relative mx-auto mb-6 h-36 w-36 sm:h-40 sm:w-40 drop-shadow-md">
          <Image
            src={c.image}
            alt={c.title}
            fill
            className="object-contain"
            priority
          />
        </div>

        <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
          {c.title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-stone-600 leading-relaxed">
          {c.body}
        </p>

        {/* Taking too long banner */}
        <div className="mt-8 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs text-center space-y-3">
          <p className="text-xs font-bold text-stone-700">
            Taking too long? Contact admin directly
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <a
              href="https://wa.me/254727993661?text=Hi%20Beddn%20Admin,%20my%20host%20account%20is%20pending%20review.%20Please%20assist%20with%20verification."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] px-4 text-xs font-bold text-white shadow-xs transition"
            >
              <WhatsAppIcon className="size-4" />
              <span>WhatsApp Admin</span>
            </a>
            <a
              href="tel:+254727993661"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-4 text-xs font-bold text-stone-800 transition"
            >
              <Icon icon="solar:phone-calling-bold-duotone" className="size-4 text-[#800020]" />
              <span>Call +254 727 993 661</span>
            </a>
          </div>
        </div>

        {/* Action navigation */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={ROUTES.search}
            className="inline-flex h-10 items-center rounded-xl border border-stone-200 bg-white px-5 text-xs font-bold text-stone-700 hover:border-[#800020] hover:text-[#800020] shadow-2xs transition"
          >
            Explore Beddn Stays
          </Link>
          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="inline-flex h-10 items-center rounded-xl border border-stone-200 bg-stone-50 px-5 text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-50 cursor-pointer transition"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </main>
    </div>
  );
}
