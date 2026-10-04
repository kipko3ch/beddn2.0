"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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

export default VerifiedBadge;
