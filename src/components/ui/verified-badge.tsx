"use client";

import React from "react";
import Image from "next/image";
import { Clock, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

export interface VerifiedBadgeProps {
  text?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "pill" | "icon" | "minimal";
  className?: string;
  iconClassName?: string;
}

const sizeMap = {
  xs: {
    icon: 14,
    pill: "px-2 py-0.5 text-[10px] gap-1",
  },
  sm: {
    icon: 16,
    pill: "px-2.5 py-0.5 text-xs gap-1.5",
  },
  md: {
    icon: 20,
    pill: "px-3 py-1 text-xs gap-2 font-bold",
  },
  lg: {
    icon: 24,
    pill: "px-3.5 py-1.5 text-sm gap-2.5 font-bold",
  },
};

/**
 * Pink Palette Verified Badge Component
 * Displays the Beddn pink checkmark rosette seal with matching pink/burgundy styling.
 */
export function VerifiedBadge({
  text = "Verified Host",
  size = "sm",
  variant = "pill",
  className,
  iconClassName,
}: VerifiedBadgeProps) {
  const currentSize = sizeMap[size] || sizeMap.sm;

  if (variant === "icon") {
    return (
      <div
        className={cn("relative inline-flex items-center justify-center shrink-0", className)}
        title={text}
      >
        <Image
          src="/images/verified-pink-badge.png"
          alt="Verified"
          width={currentSize.icon}
          height={currentSize.icon}
          className={cn("object-contain drop-shadow-2xs select-none", iconClassName)}
        />
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-bold text-[#800020]",
          className
        )}
      >
        <Image
          src="/images/verified-pink-badge.png"
          alt="Verified"
          width={currentSize.icon}
          height={currentSize.icon}
          className={cn("object-contain shrink-0 drop-shadow-2xs", iconClassName)}
        />
        {text && <span>{text}</span>}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-[#fdf2f4] border border-[#f9a8d4]/70 text-[#800020] font-bold shadow-2xs transition-colors",
        currentSize.pill,
        className
      )}
    >
      <Image
        src="/images/verified-pink-badge.png"
        alt="Verified"
        width={currentSize.icon}
        height={currentSize.icon}
        className={cn("object-contain shrink-0 drop-shadow-2xs", iconClassName)}
      />
      {text && <span className="leading-none">{text}</span>}
    </div>
  );
}

/**
 * Pending Verification Badge with direct WhatsApp and Call contact options.
 * Displayed when verification is under review or stuck on pending so hosts can expedite review.
 */
export function PendingVerificationBadge({
  listingTitle,
  listingId,
  showContact = true,
  className,
}: {
  listingTitle?: string;
  listingId?: string;
  showContact?: boolean;
  className?: string;
}) {
  const msg = encodeURIComponent(
    listingTitle
      ? `Hello Beddn Admin, my listing "${listingTitle}"${listingId ? ` (ID: ${listingId})` : ""} is stuck on verification pending. Please help expedite review.`
      : `Hello Beddn Admin, my host verification is stuck on pending. Please help expedite my account review.`
  );

  return (
    <div className={cn("inline-flex items-center gap-1.5 flex-wrap", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 px-2.5 py-0.5 text-[11px] font-bold">
        <Clock className="size-3 text-amber-600" />
        <span>Verification pending</span>
      </span>

      {showContact && (
        <div className="inline-flex items-center gap-1">
          <a
            href={`https://wa.me/254727993661?text=${msg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-2xs transition"
            title="Fast-track with Admin on WhatsApp"
          >
            <WhatsAppIcon className="size-2.5" />
            <span>WhatsApp Admin</span>
          </a>
          <a
            href="tel:+254727993661"
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 px-2 py-0.5 text-[10px] font-bold shadow-2xs transition"
            title="Call Admin Directly"
          >
            <Phone className="size-2.5 text-[#800020]" />
            <span>Call</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default VerifiedBadge;
