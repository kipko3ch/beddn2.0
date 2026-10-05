import Link from "next/link";
import { Header } from "@/components/header";
import { ROUTES } from "@/lib/routes";
import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Impact | Beddn",
  description:
    "How authentic reviews elevate hospitality, boost local host livelihoods, and build trusted travel across East Africa.",
};

export default function CommunityImpactPage() {
  return (
    <div className="min-h-screen bg-[#faf8f7] text-[#181113]">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={ROUTES.review}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-[#800020] transition"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to reviews</span>
          </Link>
        </div>

        {/* Hero Section (Clean, elegant, no cheap pill badge) */}
        <div className="mb-10 max-w-3xl">
          <span className="text-xs font-bold tracking-wider uppercase text-[#800020]">
            Beddn Social & Economic Impact
          </span>
          <h1 className="mt-2 font-brand text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2b000a] tracking-tight">
            Community Impact at Beddn
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
            How authentic reviews elevate hospitality, boost local host livelihoods, and build trusted travel across East Africa.
          </p>
        </div>

        {/* 3 Impact Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: 100% Genuine, Verified Stays */}
          <div className="flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs transition hover:shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-stone-400">
                  STAYS
                </span>
                <span className="flex size-7 items-center justify-center rounded-full bg-[#fdf2f4] text-[#800020]">
                  <ShieldCheck className="size-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-brand text-3xl sm:text-4xl font-black text-[#2b000a]">100%</span>
                <span className="text-xs font-mono text-stone-400">genuine</span>
              </div>
              <h3 className="mt-4 font-brand font-bold text-base text-stone-900">
                100% Genuine, Verified Stays
              </h3>
              <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
                Only travelers with confirmed bookings can post reviews. No paid endorsements or manipulated boosts.
              </p>
            </div>

            {/* Dual-Tone Stacked Bar Chart */}
            <div className="mt-8 pt-5 border-t border-stone-100">
              <div className="flex items-end justify-between gap-2 h-36 px-1">
                {[
                  { label: "JAN", top: "200k", topH: "40%", botH: "50%" },
                  { label: "FEB", top: "210k", topH: "48%", botH: "52%" },
                  { label: "MAR", top: "200k", topH: "40%", botH: "45%" },
                  { label: "APR", top: "180k", topH: "28%", botH: "50%" },
                  { label: "MAY", top: "190k", topH: "36%", botH: "46%" },
                  { label: "JUN", top: "205k", topH: "46%", botH: "54%" },
                ].map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[9px] font-mono text-stone-400 mb-1 group-hover:text-[#800020] transition">
                      {bar.top}
                    </span>
                    <div className="w-full flex flex-col gap-1 items-center">
                      <div
                        style={{ height: bar.topH }}
                        className="w-full rounded-md bg-[#800020] transition-colors group-hover:bg-[#600018]"
                      />
                      <div
                        style={{ height: bar.botH }}
                        className="w-full rounded-md bg-[#fbcfe8] transition-colors"
                      />
                    </div>
                    <span className="mt-2 text-[9px] font-mono text-stone-400 uppercase font-semibold">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center font-mono text-[10px] text-stone-400 mt-3">
                Monthly verified traveler impressions
              </p>
            </div>
          </div>

          {/* Card 2: Supporting Local Entrepreneurs */}
          <div className="flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs transition hover:shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-stone-400">
                  LOCAL IMPACT
                </span>
                <span className="flex size-7 items-center justify-center rounded-full bg-[#fdf2f4] text-[#800020]">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-brand text-3xl sm:text-4xl font-black text-[#2b000a]">3.4x</span>
                <span className="text-xs font-mono text-stone-400">/ earnings</span>
              </div>
              <h3 className="mt-4 font-brand font-bold text-base text-stone-900">
                Supporting Local Entrepreneurs
              </h3>
              <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
                High ratings directly boost host earnings and help local operators build sustainable hospitality businesses.
              </p>
            </div>

            {/* Matrix of Ratings & Trust */}
            <div className="mt-8 pt-5 border-t border-stone-100">
              <div className="grid grid-cols-7 gap-2 place-items-center py-2">
                {Array.from({ length: 35 }).map((_, idx) => {
                  const isFilled = idx >= 8;
                  return (
                    <div
                      key={idx}
                      className={`size-4 sm:size-5 rounded-full transition-transform hover:scale-125 flex items-center justify-center ${
                        isFilled
                          ? "bg-[#800020] text-white shadow-2xs"
                          : "bg-[#fce7ec] text-transparent"
                      }`}
                    >
                      <Star className="size-2 sm:size-2.5 fill-current" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[11px] font-semibold text-stone-700">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>84% high-trust booking conversions</span>
              </div>
            </div>
          </div>

          {/* Card 3: Actionable Feedback Loop (Clean Modern Layout - No Broken Curved Speedometer) */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#4a0014] bg-gradient-to-b from-[#3b000e] via-[#2b000a] to-[#1a0006] p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-rose-300/80">
                  FEEDBACK LOOP
                </span>
                <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-rose-300">
                  <Zap className="size-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-brand text-3xl sm:text-4xl font-black text-white">48h</span>
                <span className="text-xs font-mono text-rose-200/70">/ resolution</span>
              </div>
              <h3 className="mt-4 font-brand font-bold text-base text-white">
                Actionable Feedback Loop
              </h3>
              <p className="mt-1.5 text-xs text-rose-100/75 leading-relaxed">
                Your feedback helps hosts quickly upgrade amenities, Wi-Fi, and check-in smoothness for the next traveler.
              </p>
            </div>

            {/* Clean, High-Precision Metrics Panel */}
            <div className="mt-8 pt-5 border-t border-rose-950/60 space-y-4">
              {/* Satisfaction Score Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-rose-200/80 font-medium">Guest Satisfaction Index</span>
                  <span className="font-mono font-bold text-white">98.4%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-[#ff70a6] w-[98.4%]" />
                </div>
              </div>

              {/* Host Response Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] font-mono uppercase text-rose-300/70 block">
                    Avg Turnaround
                  </span>
                  <span className="font-brand text-lg font-bold text-white mt-0.5 block">
                    Under 2 Days
                  </span>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] font-mono uppercase text-rose-300/70 block">
                    Host Action Rate
                  </span>
                  <span className="font-brand text-lg font-bold text-white mt-0.5 block">
                    94% Resolved
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Impact Narrative */}
        <div className="mt-12 rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-10 shadow-xs">
          <div className="max-w-3xl">
            <h2 className="font-brand text-2xl sm:text-3xl font-bold text-[#2b000a]">
              Why verified reviews matter to East African hospitality
            </h2>
            <p className="mt-4 text-sm text-stone-600 leading-relaxed">
              In growing travel hubs like Nairobi, Mombasa, Dar es Salaam, and Zanzibar, travelers frequently encounter mismatched expectations—from inaccurate photos to unpredictable check-ins. Beddn’s closed review ecosystem ensures that every single score comes from an authenticated booking.
            </p>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              For local hosts, these ratings are more than vanity metrics: they unlock higher search visibility, instant booking status, and reliable income without exorbitant middlemen fees.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-stone-100">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fdf2f4] text-[#800020]">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900">Zero Fake Reviews</h4>
                <p className="text-xs text-stone-500 mt-1 leading-normal">
                  Reviews are strictly unlocked upon confirmed checkout.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fdf2f4] text-[#800020]">
                <HeartHandshake className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900">Direct Host Empowerment</h4>
                <p className="text-xs text-stone-500 mt-1 leading-normal">
                  Feedback loops let small hospitality operators thrive and scale.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fdf2f4] text-[#800020]">
                <Users className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900">Transparent Hospitality</h4>
                <p className="text-xs text-stone-500 mt-1 leading-normal">
                  Genuine ratings build trust for guests traveling across borders.
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-stone-100">
            <div className="text-xs text-stone-500 text-center sm:text-left">
              Join thousands of travelers and hosts building trusted stays in Kenya & Tanzania.
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Link
                href={ROUTES.review}
                className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center rounded-full border border-stone-200 px-5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Write a review
              </Link>
              <Link
                href={ROUTES.newListing}
                className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center rounded-full bg-[#800020] px-6 text-xs font-bold text-white hover:bg-[#68001a] shadow-xs transition"
              >
                List your space
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
