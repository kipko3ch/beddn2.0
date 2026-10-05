"use client";

import React from "react";
import Image from "next/image";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VerifiedBadgeProps {
  text?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "minimal" | "pill" | "icon";
  className?: string;
  iconClassName?: string;
}

const sizeMap = {
  xs: {
    icon: 14,
    text: "text-[11px] gap-1",
    pill: "px-2 py-0.5 text-[10px] gap-1",
  },
  sm: {
    icon: 16,
    text: "text-xs gap-1.5",
    pill: "px-2.5 py-0.5 text-xs gap-1.5",
  },
  md: {
    icon: 18,
    text: "text-sm gap-2 font-semibold",
    pill: "px-3 py-1 text-xs gap-2 font-semibold",
  },
  lg: {
    icon: 22,
    text: "text-base gap-2.5 font-bold",
    pill: "px-3.5 py-1.5 text-sm gap-2.5 font-bold",
  },
};

/**
 * Verified Badge Component
 * Clean, minimal typography-first design without heavy or cheap pill wrappers.
 */
export function VerifiedBadge({
  text = "Verified Host",
  size = "sm",
  variant = "minimal",
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

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full bg-stone-50 border border-stone-200/80 text-stone-800 font-medium shadow-2xs transition-colors",
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

  // Default: Clean & minimal inline presentation (no clunky pill container)
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold text-[#800020] leading-none shrink-0",
        currentSize.text,
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

/**
 * Pending Verification notice with clean, minimal inline typography.
 * Replaces bulky pill buttons with clean text:
 * "Verification pending · Taking too long? Contact admin directly"
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
    <div className={cn("inline-flex items-center gap-1.5 flex-wrap text-xs text-stone-600", className)}>
      <span className="inline-flex items-center gap-1 font-medium text-amber-700">
        <Clock className="size-3.5 text-amber-600 shrink-0" />
        <span>Verification pending</span>
      </span>

      {showContact && (
        <>
          <span className="text-stone-300 select-none">·</span>
          <span className="text-stone-500">
            Taking too long?{" "}
            <a
              href={`https://wa.me/254727993661?text=${msg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#800020] hover:text-[#5c0017] underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
            >
              Contact admin directly
            </a>
          </span>
        </>
      )}
    </div>
  );
}

export default VerifiedBadge;
