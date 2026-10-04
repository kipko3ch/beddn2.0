"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Check, Zap, Crown, ArrowRight, ShieldCheck } from "lucide-react";

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
    `Hello Beddn team, I am ${hostName || "a host"} and I would like to upgrade my listing to Beddn Pro / Featured tier.`
  );
  const whatsappUrl = `https://wa.me/254727993661?text=${whatsappMessage}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? (trigger as any) : (
        <button className="rounded-full bg-white text-stone-900 font-bold px-4 py-2 text-xs shadow-sm hover:bg-stone-100 transition">
          Upgrade Pro
        </button>
      )} />
      <DialogContent className="max-w-2xl overflow-hidden rounded-3xl p-0 border border-stone-200">
        {/* Header with deep burgundy silk gradient */}
        <div className="bg-gradient-to-r from-[#2b000a] via-[#5c0017] to-[#800020] p-6 sm:p-8 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white border border-white/20 mb-3">
            <Crown className="size-3.5 text-amber-400" />
            Marketplace Visibility
          </div>
          <DialogTitle className="font-brand text-2xl sm:text-3xl text-white font-black leading-tight">
            Boost Your Listings with Beddn Pro
          </DialogTitle>
          <DialogDescription className="text-white/80 text-sm mt-1 max-w-lg leading-relaxed">
            Get more views, higher guest inquiries, and prominent placement across East Africa.
          </DialogDescription>

          {activeTier && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-1.5 text-xs text-white border border-white/20">
              <Star className="size-4 text-amber-400 fill-amber-400" />
              <span>Current Status: <strong>{activeTier} — Active</strong></span>
              {expiresAt && <span className="text-white/70">· Expires {expiresAt}</span>}
            </div>
          )}
        </div>

        {/* Tiers Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 sm:p-8 bg-stone-50">
          {/* Pro Tier */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-[#800020] bg-white p-5 shadow-sm relative">
            <span className="absolute -top-3 right-4 rounded-full bg-[#800020] text-white px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">
              Most Popular
            </span>
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#fdf2f4] text-[#800020]">
                  <Zap className="size-5" />
                </div>
                <div>
                  <h4 className="font-brand text-lg font-bold text-[#181113]">Beddn Pro</h4>
                  <p className="text-xs text-stone-500">For active hosts seeking steady bookings</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-stone-700">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Verified Pro Badge</strong> on your listing card</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Priority Search Ranking</strong> above standard listings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span>Highlighted card border in search results</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span>Detailed <strong>Beta Analytics</strong> access</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#800020] px-4 text-xs font-bold text-white hover:bg-[#68001a] shadow-xs transition"
              >
                <span>Request Pro Tier</span>
                <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>

          {/* Pro Plus / Featured Tier */}
          <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Crown className="size-5" />
                </div>
                <div>
                  <h4 className="font-brand text-lg font-bold text-[#181113]">Featured Placement</h4>
                  <p className="text-xs text-stone-500">Maximum visibility across the marketplace</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-stone-700">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Everything in Pro</strong> included</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Homepage Carousel Placement</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span>Top of City &amp; Category search results</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span>Dedicated WhatsApp support from Beddn team</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-xs font-bold text-stone-800 hover:border-[#800020] hover:text-[#800020] shadow-xs transition"
              >
                <span>Contact for Featured</span>
                <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Manual activation: Pay via M-Pesa or Bank transfer. Admin activates your tier within minutes.</span>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
