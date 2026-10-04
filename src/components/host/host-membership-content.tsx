"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Star, Sparkles, MessageCircle, ArrowLeft } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

type BillingPeriod = "daily" | "monthly";
type CurrencyCode = "KES" | "USD" | "EUR" | "GBP" | "UGX" | "TZS" | "RWF";

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string; rateFromKes: number }[] = [
  { code: "KES", label: "KES (Kenya Shilling)", symbol: "KES ", rateFromKes: 1 },
  { code: "USD", label: "USD (US Dollar)", symbol: "$", rateFromKes: 0.0077 },
  { code: "EUR", label: "EUR (Euro)", symbol: "€", rateFromKes: 0.007 },
  { code: "GBP", label: "GBP (British Pound)", symbol: "£", rateFromKes: 0.0059 },
  { code: "UGX", label: "UGX (Uganda Shilling)", symbol: "UGX ", rateFromKes: 28.5 },
  { code: "TZS", label: "TZS (Tanzania Shilling)", symbol: "TZS ", rateFromKes: 20 },
  { code: "RWF", label: "RWF (Rwanda Franc)", symbol: "RWF ", rateFromKes: 10.5 },
];

// Base prices in KES:
// Pro: 30 KES / day | Monthly discount: 650 KES / mo (saves 28% vs 30*30=900)
// Pro Plus: 50 KES / day | Monthly discount: 1,100 KES / mo (saves 27% vs 50*30=1500)
const TIER_PRICES_KES = {
  pro: {
    daily: 30,
    monthly: 650,
  },
  proPlus: {
    daily: 50,
    monthly: 1100,
  },
};

export function HostMembershipContent({
  hostName,
  activeTier,
  expiresAt,
  backUrl = "/host",
}: {
  hostName?: string;
  activeTier?: string | null;
  expiresAt?: string | null;
  backUrl?: string;
}) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("KES");

  const curr = CURRENCIES.find((c) => c.code === selectedCurrency) || CURRENCIES[0];

  function formatConvertedPrice(kesAmount: number, period: BillingPeriod) {
    if (curr.code === "KES") {
      return `${curr.symbol}${kesAmount.toLocaleString()}`;
    }
    const converted = kesAmount * curr.rateFromKes;
    if (curr.code === "UGX" || curr.code === "TZS" || curr.code === "RWF") {
      return `${curr.symbol}${Math.round(converted).toLocaleString()}`;
    }
    // For USD, EUR, GBP
    return `${curr.symbol}${period === "daily" ? converted.toFixed(2) : Math.round(converted).toString()}`;
  }

  const proPriceDisplay = formatConvertedPrice(
    billingPeriod === "daily" ? TIER_PRICES_KES.pro.daily : TIER_PRICES_KES.pro.monthly,
    billingPeriod
  );

  const proPlusPriceDisplay = formatConvertedPrice(
    billingPeriod === "daily" ? TIER_PRICES_KES.proPlus.daily : TIER_PRICES_KES.proPlus.monthly,
    billingPeriod
  );

  const periodSuffix = billingPeriod === "daily" ? "/day" : "/mo";

  const proWhatsappMessage = encodeURIComponent(
    `Hello Beddn team, I am ${hostName || "a host"} and I would like to upgrade my listing to Beddn Pro tier (${billingPeriod === "daily" ? "Daily plan at 30 KES/day" : "Monthly plan at 650 KES/mo"}).`
  );
  const proWhatsappUrl = `https://wa.me/254727993661?text=${proWhatsappMessage}`;

  const proPlusWhatsappMessage = encodeURIComponent(
    `Hello Beddn team, I am ${hostName || "a host"} and I would like to upgrade my listing to Beddn Pro Plus tier (${billingPeriod === "daily" ? "Daily plan at 50 KES/day" : "Monthly plan at 1,100 KES/mo"}).`
  );
  const proPlusWhatsappUrl = `https://wa.me/254727993661?text=${proPlusWhatsappMessage}`;

  const featuredWhatsappMessage = encodeURIComponent(
    `Hello Beddn team, I am ${hostName || "a host"} and I am interested in Featured Carousel placement for my property.`
  );
  const featuredWhatsappUrl = `https://wa.me/254727993661?text=${featuredWhatsappMessage}`;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:border-[#800020] hover:text-[#800020] transition shadow-2xs"
            title="Back to dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#800020]">
              <Sparkles className="size-3 text-[#800020]" />
              <span>Beddn Host Membership</span>
            </div>
            <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
              Listing Promotions
            </h1>
          </div>
        </div>

        {activeTier && (
          <div className="flex items-center gap-2 rounded-2xl bg-[#fdf2f4] px-4 py-2 border border-[#f9a8d4] text-xs text-[#800020] self-start sm:self-auto shadow-2xs">
            <VerifiedBadge variant="icon" size="xs" />
            <span>
              Active Tier: <strong>{activeTier}</strong> {expiresAt ? `(Expires ${expiresAt})` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Hero Header Section */}
      <div className="space-y-3 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf2f4] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#800020] border border-[#f9a8d4]/70">
          <VerifiedBadge variant="icon" size="xs" />
          Listing Promotions
        </div>
        <h2 className="font-brand text-3xl sm:text-4xl font-extrabold text-[#2b000a] tracking-tight">
          Upgrade Your Listing Presence
        </h2>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          Gain higher visibility across East Africa, stand out with verified badges, and connect directly with high-intent travelers.
        </p>
      </div>

      {/* Reduced-Icon Clean 4 Value Props Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-[#800020]/30 hover:shadow-sm">
          <p className="font-mono text-[11px] font-bold text-[#800020] uppercase tracking-wider">01 / TRUST</p>
          <h3 className="font-brand font-bold text-sm text-stone-900">Verified Trust &amp; Credibility</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Stand out to guests across East Africa with the official Verified Host badge on your profile and listings.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-[#800020]/30 hover:shadow-sm">
          <p className="font-mono text-[11px] font-bold text-[#800020] uppercase tracking-wider">02 / RANKING</p>
          <h3 className="font-brand font-bold text-sm text-stone-900">Priority Search Placement</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Appear at the top of search results in your city (Nairobi, Mombasa, Diani, Kampala) when travelers search for stays.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-[#800020]/30 hover:shadow-sm">
          <p className="font-mono text-[11px] font-bold text-[#800020] uppercase tracking-wider">03 / CONVERSION</p>
          <h3 className="font-brand font-bold text-sm text-stone-900">Instant WhatsApp Conversions</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Connect directly with verified guests through 1-tap WhatsApp chat without unnecessary platform delays.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-[#800020]/30 hover:shadow-sm">
          <p className="font-mono text-[11px] font-bold text-[#800020] uppercase tracking-wider">04 / SUPPORT</p>
          <h3 className="font-brand font-bold text-sm text-stone-900">Dedicated Host Support</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Get priority listing assistance, rapid M-Pesa activation, and personalized advice from the Beddn team.
          </p>
        </div>
      </div>

      {/* Controls Bar: Billing Frequency Toggle & Currency Converter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs">
        {/* Billing Period Selector (Daily vs Monthly) */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-stone-700">Billing Period:</span>
          <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-1">
            <button
              type="button"
              onClick={() => setBillingPeriod("daily")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                billingPeriod === "daily"
                  ? "bg-[#800020] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Daily Plan
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingPeriod === "monthly"
                  ? "bg-[#800020] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>Monthly Plan</span>
              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                billingPeriod === "monthly" ? "bg-white/20 text-white" : "bg-[#fdf2f4] text-[#800020]"
              }`}>
                Save ~28%
              </span>
            </button>
          </div>
        </div>

        {/* Currency Converter Dropdown */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-stone-700">Currency:</span>
          <div className="relative">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
              className="appearance-none rounded-full border border-stone-200 bg-stone-50 pl-4 pr-8 py-1.5 text-xs font-bold text-stone-800 focus:border-[#800020] focus:bg-white outline-none shadow-2xs transition"
              aria-label="Select pricing currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.label.split("(")[0].trim()})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Tier-Based Pricing Grid: Beddn Pro vs Beddn Pro Plus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        {/* Tier 1: Beddn Pro */}
        <div className="flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs transition-all hover:shadow-lg">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
                  Beddn Pro
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-stone-500 leading-relaxed">
                  For active hosts seeking steady inquiries, verified trust, and priority placement.
                </p>
              </div>
            </div>

            {/* Price Box */}
            <div className="mt-6 flex items-baseline gap-2 border-y border-stone-100 py-4">
              <span className="font-brand text-3xl sm:text-4xl font-extrabold text-[#2b000a] tracking-tight">
                {proPriceDisplay}
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-500">
                {periodSuffix}
              </span>
              {billingPeriod === "monthly" && (
                <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Cheaper Rate
                </span>
              )}
            </div>

            {/* What's Included */}
            <div className="mt-6 space-y-3.5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-400">
                What&apos;s Included:
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-stone-600">
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0" />
                  <span>Verified Pro Badge on your listing card</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0" />
                  <span>Priority Search Ranking above standard spaces</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0" />
                  <span>Direct WhatsApp inquiries &amp; instant guest reach</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0" />
                  <span>Highlighted card border in search results</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0" />
                  <span>Detailed inquiry &amp; impression metrics</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0" />
                  <span>Zero commission on direct guest bookings</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <a
              href={proWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#800020] bg-white px-5 text-sm font-bold text-[#800020] hover:bg-[#fdf2f4] transition shadow-xs"
            >
              <WhatsAppIcon className="size-4.5 text-[#25D366] shrink-0" />
              <span>Request Pro Tier via WhatsApp</span>
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>

        {/* Tier 2: Beddn Pro Plus (Most Popular & Highlighted) */}
        <div className="relative flex flex-col justify-between rounded-3xl border-2 border-[#800020] bg-white p-6 sm:p-8 shadow-xl">
          <span className="absolute -top-3.5 right-6 rounded-full bg-[#800020] text-white px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider shadow-xs">
            Most Popular
          </span>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
                    Beddn Pro Plus
                  </h3>
                  <VerifiedBadge variant="icon" size="sm" />
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-stone-500 leading-relaxed">
                  For top-tier hosts &amp; managers seeking maximum exposure, featured spotlights, and VIP matching.
                </p>
              </div>
            </div>

            {/* Price Box */}
            <div className="mt-6 flex items-baseline gap-2 border-y border-stone-100 py-4">
              <span className="font-brand text-3xl sm:text-4xl font-extrabold text-[#2b000a] tracking-tight">
                {proPlusPriceDisplay}
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-500">
                {periodSuffix}
              </span>
              {billingPeriod === "monthly" && (
                <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-[#800020] bg-[#fdf2f4] border border-[#f9a8d4] px-2.5 py-0.5 rounded-full">
                  Save 27% Monthly
                </span>
              )}
            </div>

            {/* What's Included */}
            <div className="mt-6 space-y-3.5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-400">
                What&apos;s Included:
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
                <li className="flex items-center gap-2.5 font-medium">
                  <Check className="size-4 text-[#800020] shrink-0 stroke-[2.5]" />
                  <span>Everything in Beddn Pro included</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0 stroke-[2.5]" />
                  <span>Homepage Spotlight &amp; Featured Carousel placement</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0 stroke-[2.5]" />
                  <span>Top of City &amp; Category search results</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0 stroke-[2.5]" />
                  <span>Verified Host Plus badge with pink rosette seal</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0 stroke-[2.5]" />
                  <span>Dedicated VIP host concierge support from Beddn team</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#800020] shrink-0 stroke-[2.5]" />
                  <span>Priority guest inquiry routing and high-intent matching</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <a
              href={proPlusWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#800020] to-[#590016] hover:from-[#68001a] hover:to-[#400010] text-white px-5 text-sm font-bold shadow-md hover:shadow-lg transition active:scale-[0.99]"
            >
              <WhatsAppIcon className="size-4.5 text-[#25D366] shrink-0" />
              <span>Request Pro Plus via WhatsApp</span>
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Featured Spotlight Alternative Banner */}
      <div className="rounded-3xl border border-stone-200/90 bg-stone-50/70 p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white border border-stone-200 text-stone-700 shadow-2xs shrink-0">
            <Star className="size-5 text-[#800020] fill-[#800020]" />
          </div>
          <div>
            <h4 className="font-brand text-base font-bold text-stone-900">
              Looking for Homepage Spotlight &amp; Featured Carousels?
            </h4>
            <p className="mt-0.5 text-xs sm:text-sm text-stone-500 leading-relaxed">
              Get top-tier placement on Beddn&apos;s homepage, city banners, and social promotion.
            </p>
          </div>
        </div>
        <a
          href={featuredWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-bold text-stone-800 hover:border-[#800020] hover:text-[#800020] shadow-2xs transition shrink-0"
        >
          <span>Contact for Featured</span>
          <ArrowRight className="size-3.5" />
        </a>
      </div>

      {/* Activation & Payment Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-[#800020]" />
          <span>Fast activation via M-Pesa or Bank transfer. Tiers are activated quickly upon confirmation.</span>
        </div>
        <span>Dedicated host concierge: +254 727 993 661</span>
      </div>
    </div>
  );
}
