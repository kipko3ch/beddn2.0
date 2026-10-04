"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Star, ArrowRight, X } from "lucide-react";

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
        className="max-w-2xl overflow-hidden rounded-3xl p-0 border border-stone-200/90 bg-white shadow-xl"
        showCloseButton={false}
      >
        {/* Minimal clean header */}
        <div className="relative border-b border-stone-100 p-6 sm:p-8">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf2f4] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#800020] border border-[#f9c8d4]/70 mb-3">
            <Sparkles className="size-3 text-[#800020]" />
            Listing Promotions
          </div>

          <DialogTitle className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
            Upgrade Your Listing Presence
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-stone-500 max-w-lg leading-relaxed">
            Gain higher visibility across East Africa, stand out with verified badges, and connect with more travelers.
          </DialogDescription>

          {activeTier && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#fdf2f4] px-3.5 py-1.5 text-xs text-[#800020] border border-[#f9c8d4]">
              <Star className="size-3.5 text-[#800020] fill-[#800020]" />
              <span>
                Current Tier: <strong>{activeTier}</strong> (Active)
              </span>
              {expiresAt && <span className="text-stone-500">· Expires {expiresAt}</span>}
            </div>
          )}
        </div>

        {/* Tiers Comparison - Minimal and Clean */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 sm:p-8 bg-stone-50/50">
          {/* Pro Tier */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-[#800020] bg-white p-5 shadow-xs relative">
            <span className="absolute -top-3 right-4 rounded-full bg-[#800020] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Popular
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#fdf2f4] text-[#800020]">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h4 className="font-brand text-base font-bold text-stone-900">Beddn Pro</h4>
                  <p className="text-xs text-stone-500">For active hosts seeking steady inquiries</p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 text-xs text-stone-600">
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-stone-900">Verified Pro Badge</strong> on your listing card
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-stone-900">Priority Search Ranking</strong> above standard spaces
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>Highlighted card border in search results</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>Detailed inquiry &amp; impression metrics</span>
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

          {/* Featured Placement */}
          <div className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <Star className="size-4" />
                </div>
                <div>
                  <h4 className="font-brand text-base font-bold text-stone-900">Featured</h4>
                  <p className="text-xs text-stone-500">Maximum exposure across the platform</p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 text-xs text-stone-600">
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-stone-900">Everything in Pro</strong> included
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-stone-900">Homepage Carousel</strong> spotlight placement
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>Top of City &amp; Category search results</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-[#800020] shrink-0 mt-0.5" />
                  <span>Dedicated host support from Beddn team</span>
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

        {/* Minimal Footer */}
        <div className="bg-white px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <span>Activation via M-Pesa or Bank transfer. Tiers are activated quickly upon confirmation.</span>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="rounded-full text-stone-600">
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
