"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

export interface PricingFeature {
  name: string;
  desc: string;
  icon?: React.ReactNode;
}

export interface PricingPlan {
  name: string;
  desc: string;
  price: number | string;
  currency?: string;
  period?: string;
  isMostPop?: boolean;
  features: string[];
}

export interface ColorfulPricingProps {
  plan?: PricingPlan;
  features?: PricingFeature[];
  badgeText?: string;
  title?: string;
  titleHighlight?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  className?: string;
}

export default function FUIPricingSectionWithOnePlan({
  plan: propPlan,
  features: propFeatures,
  badgeText = "Pricing",
  title = "The right price for you",
  titleHighlight = "whoever you are",
  description = "Boost your listing visibility across East Africa, stand out with verified badges, and connect with more travelers.",
  ctaText = "Get Started",
  ctaHref,
  onCtaClick,
  className,
}: ColorfulPricingProps = {}) {
  const plan: PricingPlan = propPlan || {
    name: "Beddn Pro",
    desc: "Everything you need to accelerate bookings and maximize host earnings.",
    price: 19,
    currency: "$",
    period: "/mo",
    isMostPop: true,
    features: [
      "Verified Pro host badge on all listings",
      "Priority search placement above standard spaces",
      "Featured placement in East Africa city guides",
      "Direct WhatsApp & instant guest inquiries",
      "Advanced analytics & booking conversion insights",
      "Highlighted card borders in search results",
      "Priority customer & dispute support",
      "Zero hidden booking commission fees",
    ],
  };

  const defaultFeatures: PricingFeature[] = [
    {
      name: "Scalable Reach",
      desc: "Reach thousands of travelers and guests searching for stays across Nairobi, Mombasa, Kampala, and Kigali.",
      icon: <Icon icon="solar:chart-2-bold-duotone" className="w-5 h-5 text-[#800020]" />,
    },
    {
      name: "Flexible Monetization",
      desc: "Accept payments seamlessly via M-Pesa, card, or direct bank transfer with prompt activation and support.",
      icon: <Icon icon="solar:bolt-bold-duotone" className="w-5 h-5 text-[#800020]" />,
    },
    {
      name: "Smooth Experience",
      desc: "Designed to keep your calendar full with actionable recommendations, real-time views, and instant alerts.",
      icon: <Icon icon="solar:stars-minimalistic-bold-duotone" className="w-5 h-5 text-[#800020]" />,
    },
    {
      name: "Verified & Secure",
      desc: "Gain instant guest trust with verified badges and dedicated Beddn safety and onboarding assistance.",
      icon: <Icon icon="solar:shield-check-bold-duotone" className="w-5 h-5 text-[#800020]" />,
    },
  ];

  const features = propFeatures || defaultFeatures;

  return (
    <section
      className={cn(
        "relative py-10 md:py-14 w-full flex p-3 md:p-6 justify-center bg-stone-50/50 dark:bg-stone-950/20 rounded-3xl overflow-hidden",
        className
      )}
    >
      {/* Subtle brand radial glow (maintaining Beddn theme palette) */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-full w-full bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(128,0,32,0.08),rgba(255,255,255,0))]"></div>

      <div className="relative z-10 max-w-screen-xl w-full mx-auto text-stone-600 dark:text-stone-300 md:px-4">
        {/* Header */}
        <div className="relative max-w-xl space-y-2.5 px-2 md:px-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf2f4] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#800020] border border-[#f9c8d4]/70">
            <Icon icon="solar:stars-minimalistic-bold-duotone" className="size-3.5 text-[#800020]" />
            {badgeText}
          </div>

          <h2 className="font-brand text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2b000a] dark:text-stone-100 tracking-tight leading-tight">
            {title}{" "}
            {titleHighlight && (
              <>
                <br className="hidden sm:inline" />
                <span className="text-[#800020]">{titleHighlight}</span>
              </>
            )}
          </h2>

          <div className="max-w-xl">
            <p className="text-stone-500 dark:text-stone-400 text-sm sm:text-base leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="mt-10 md:mt-14 justify-between gap-8 lg:gap-12 md:flex items-start">
          {/* Left Column: Feature Highlights */}
          <ul className="flex-1 max-w-md space-y-7 px-2 md:px-0">
            {features.map((item, idx) => (
              <li key={idx} className="flex gap-x-4 items-start">
                <div className="flex-none w-11 h-11 rounded-2xl bg-[#fdf2f4] border border-[#f9c8d4]/80 text-[#800020] flex items-center justify-center shadow-xs">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-brand text-base sm:text-lg font-bold tracking-tight text-[#2b000a] dark:text-stone-100">
                    {item.name}
                  </h4>
                  <p className="text-stone-500 dark:text-stone-400 mt-1 text-xs sm:text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Right Column: High-Impact Pricing Card */}
          <div className="flex-1 flex flex-col mt-8 md:mt-0 md:max-w-lg lg:max-w-xl rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-stone-100 dark:border-stone-800 bg-gradient-to-b from-[#fdf2f4]/30 to-white dark:from-stone-900 dark:to-stone-900">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-xs">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#800020] bg-[#fdf2f4] border border-[#f9c8d4] px-2.5 py-0.5 rounded-full mb-2">
                    Most Popular
                  </div>
                  <h3 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] dark:text-stone-100 tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    {plan.desc}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-brand text-3xl sm:text-4xl font-extrabold text-[#2b000a] dark:text-stone-100 tracking-tight">
                    {plan.currency || "$"}{plan.price}
                  </span>
                  <span className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium block">
                    {plan.period || "/mo"}
                  </span>
                </div>
              </div>

              {ctaHref ? (
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 w-full font-brand font-bold text-center rounded-2xl text-sm sm:text-base bg-gradient-to-r from-[#800020] to-[#5a0016] hover:from-[#68001a] hover:to-[#400010] text-white px-5 py-3 shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 group"
                >
                  <span>{ctaText}</span>
                  <Icon icon="solar:arrow-right-linear" className="size-4 transition-transform group-hover:translate-x-1" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onCtaClick}
                  className="mt-6 w-full font-brand font-bold text-center rounded-2xl text-sm sm:text-base bg-gradient-to-r from-[#800020] to-[#5a0016] hover:from-[#68001a] hover:to-[#400010] text-white px-5 py-3 shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 group"
                >
                  <span>{ctaText}</span>
                  <Icon icon="solar:arrow-right-linear" className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>

            {/* Plan Features Checklist */}
            <div className="p-6 sm:p-8 bg-stone-50/40 dark:bg-stone-900/50">
              <p className="font-brand text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-4">
                What&apos;s Included:
              </p>
              <ul className="space-y-3 sm:grid sm:grid-cols-2 md:block lg:grid lg:gap-3 lg:space-y-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                {plan.features.map((featureItem, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <div className="flex-none size-4 rounded-full bg-[#fdf2f4] text-[#800020] flex items-center justify-center">
                      <Icon icon="solar:check-read-linear" className="size-3 text-[#800020] stroke-[2]" />
                    </div>
                    <span className="leading-snug">{featureItem}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { FUIPricingSectionWithOnePlan };
