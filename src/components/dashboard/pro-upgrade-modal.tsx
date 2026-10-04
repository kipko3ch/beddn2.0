"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, X, MessageCircle, ArrowRight, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import FUIPricingSectionWithOnePlan, { PricingPlan, PricingFeature } from "@/components/ui/colorful-pricing";

export function ProUpgradeModal({
  trigger,
  hostName,
  activeTier,
  expiresAt,
}: {
  trigger?: React.ReactNode;
  hostName?: string;
  activeTier?: string | null;
  expiresAt?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const whatsappMessage = encodeURIComponent(
    `Hello Beddn team, I am ${hostName || "a host"} and I would like to upgrade my listing to Beddn Pro tier.`
  );
  const whatsappUrl = `https://wa.me/254727993661?text=${whatsappMessage}`;

  const featuredWhatsappMessage = encodeURIComponent(
    `Hello Beddn team, I am ${hostName || "a host"} and I am interested in Featured Carousel placement for my property.`
  );
  const featuredWhatsappUrl = `https://wa.me/254727993661?text=${featuredWhatsappMessage}`;

  const proPlan: PricingPlan = {
    name: "Beddn Pro",
    desc: "For active hosts seeking steady inquiries, verified trust, and priority placement.",
    price: "2,500",
    currency: "KES ",
    period: "/mo",
    isMostPop: true,
    features: [
      "Verified Pro Badge on your listing card",
      "Priority Search Ranking above standard spaces",
      "Direct WhatsApp inquiries & instant guest reach",
      "Highlighted card border in search results",
      "Detailed inquiry & impression metrics",
      "Zero commission on direct guest bookings",
    ],
  };

  const hostFeatures: PricingFeature[] = [
    {
      name: "Verified Trust & Credibility",
      desc: "Stand out to guests across East Africa with the official Verified Host badge on your profile and listings.",
      icon: <ShieldCheck className="w-5 h-5 text-[#800020]" />,
    },
    {
      name: "Priority Search Placement",
      desc: "Appear at the top of search results in your city (Nairobi, Mombasa, Diani, Kampala) when travelers search for stays.",
      icon: <TrendingUp className="w-5 h-5 text-[#800020]" />,
    },
    {
      name: "Instant WhatsApp Conversions",
      desc: "Connect directly with verified guests through 1-tap WhatsApp chat without unnecessary platform delays.",
      icon: <Zap className="w-5 h-5 text-[#800020]" />,
    },
    {
      name: "Dedicated Host Support",
      desc: "Get priority listing assistance, rapid M-Pesa activation, and personalized advice from the Beddn team.",
      icon: <Sparkles className="w-5 h-5 text-[#800020]" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as any)
          ) : (
            <button className="rounded-full bg-[#800020] text-white font-bold px-4 py-2 text-xs shadow-xs hover:bg-[#68001a] transition">
              Upgrade to Pro
            </button>
          )
        }
      />
      <DialogContent
        className="max-w-4xl lg:max-w-5xl overflow-hidden rounded-3xl p-0 border border-stone-200/90 bg-white shadow-2xl max-h-[92vh] overflow-y-auto"
        showCloseButton={false}
      >
        {/* Top bar with close button & active status */}
        <div className="relative flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-white sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-brand font-extrabold text-stone-900 tracking-tight text-sm">
              Beddn Host Membership
            </span>
            {activeTier && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf2f4] px-2.5 py-0.5 text-[11px] font-bold text-[#800020] border border-[#f9c8d4]">
                <Star className="size-3 fill-[#800020]" />
                {activeTier} Active {expiresAt ? `· Exp ${expiresAt}` : ""}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Spacious, premium FUIPricingSectionWithOnePlan component */}
        <div className="p-4 sm:p-6 lg:p-8">
          <FUIPricingSectionWithOnePlan
            badgeText="Listing Promotions"
            title="Upgrade Your Listing"
            titleHighlight="Presence"
            description="Gain higher visibility across East Africa, stand out with verified badges, and connect directly with high-intent travelers."
            plan={proPlan}
            features={hostFeatures}
            ctaText="Request Pro Tier via WhatsApp"
            ctaHref={whatsappUrl}
            className="py-6 md:py-8 bg-transparent"
          />

          {/* Featured tier banner / alternative */}
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-stone-200 text-stone-700 shadow-xs">
                <Star className="size-5 text-[#800020]" />
              </div>
              <div>
                <h4 className="font-brand text-sm sm:text-base font-bold text-stone-900">
                  Looking for Homepage Spotlight &amp; Featured Carousels?
                </h4>
                <p className="text-xs text-stone-500">
                  Get top-tier placement on Beddn&apos;s homepage, city banners, and social promotion.
                </p>
              </div>
            </div>
            <a
              href={featuredWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-800 hover:border-[#800020] hover:text-[#800020] transition shadow-xs"
            >
              <span>Contact for Featured</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>

        {/* Clean Footer Note */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex flex-wrap items-center gap-2">
            <MessageCircle className="size-4 text-[#800020]" />
            <span>Fast activation via M-Pesa or Bank transfer.</span>
            <Link
              href="/host/pro"
              onClick={() => setOpen(false)}
              className="text-[#800020] font-bold hover:underline"
            >
              Open dedicated membership page →
            </Link>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="rounded-full text-stone-600 hover:text-stone-900"
          >
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
