"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/components/currency-provider";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { Listing } from "@/lib/types";

export function ListingCardSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="aspect-[4/3] rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="flex items-center justify-between pt-1">
        <div className="h-4 w-3/5 rounded-md bg-stone-200/80 dark:bg-stone-700" />
        <div className="h-3 w-10 rounded-md bg-stone-200/60 dark:bg-stone-700" />
      </div>
      <div className="h-3 w-2/5 rounded-md bg-stone-100 dark:bg-stone-800" />
      <div className="flex gap-1.5 pt-1">
        <div className="h-5 w-16 rounded-full bg-stone-100 dark:bg-stone-800" />
        <div className="h-5 w-14 rounded-full bg-stone-100 dark:bg-stone-800" />
      </div>
      <div className="h-4 w-28 rounded-md bg-stone-200/70 dark:bg-stone-700 pt-1" />
    </div>
  );
}

export function ListingCard({
  listing,
  onHover,
  isSaved,
  onToggleSave,
  priceMode = "hourly",
}: {
  listing: Listing;
  onHover?: (id: string | null) => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  /** Which rate to feature on the card. Falls back to whatever exists. */
  priceMode?: "hourly" | "overnight";
}) {
  const { formatPrice } = useCurrency();
  // Single thumbnail only — for more images the guest opens the property page.
  const image = listing.listing_images?.[0]?.url;

  // Show the requested rate when the listing has it, otherwise fall back.
  let price = 0;
  let priceLabel = "/session";
  if (priceMode === "overnight" && listing.overnight_price) {
    price = Number(listing.overnight_price);
    priceLabel = "/night";
  } else if (priceMode === "hourly" && listing.hourly_price) {
    price = Number(listing.hourly_price);
    priceLabel = "/hr";
  } else if (listing.hourly_price) {
    price = Number(listing.hourly_price);
    priceLabel = "/hr";
  } else if (listing.overnight_price) {
    price = Number(listing.overnight_price);
    priceLabel = "/night";
  } else if (listing.experience_price) {
    price = Number(listing.experience_price);
    priceLabel = "/session";
  }
  const reviews = listing.reviews ?? [];
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const isExp = (listing.categories || listing.category || []).includes("experience");
  const detailHref = isExp ? `/experience/${listing.slug}` : `/property/${listing.slug}`;

  return (
    <Link
      href={detailHref}
      className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2"
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {image ? (
          <Image
            src={image}
            alt={listing.name}
            fill
            sizes="(max-width: 640px) 70vw, (max-width: 1280px) 33vw, 320px"
            quality={70}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}

        {onToggleSave && (
          <button
            aria-label={isSaved ? "Remove from saved trips" : "Save listing"}
            className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-white/90 shadow-2xs transition-colors hover:bg-[#fbf0f3]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave();
            }}
          >
            <Heart
              className={`h-3.5 w-3.5 ${isSaved ? "fill-[#800020] text-[#800020]" : "text-[#181113]"}`}
            />
          </button>
        )}

        {(listing.is_verified || listing.host?.is_verified) && (
          <div className="absolute left-2.5 top-2.5 z-10">
            <VerifiedBadge text="Verified" size="xs" className="bg-white/95 backdrop-blur-xs shadow-xs border-[#f9a8d4]/70" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="min-w-0 truncate text-xs sm:text-sm font-bold underline-offset-2 group-hover:underline">
            {listing.title || listing.name}
          </h3>
          {reviews.length > 0 && (
            <div className="flex shrink-0 items-center gap-0.5 text-xs">
              <span>{avgRating.toFixed(1)}</span>
              <Star className="h-3 w-3 fill-cranberry text-cranberry" />
            </div>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {listing.area ? `${listing.area}, ` : ""}{listing.city}
        </p>
        <p className="mt-1 text-xs">
          <span className="font-bold text-[#181113]">
            {formatPrice(price, listing.currency || "KES")}
          </span>
          <span className="text-[11px] text-muted-foreground ml-1">{priceLabel}</span>
        </p>
      </div>
    </Link>
  );
}
